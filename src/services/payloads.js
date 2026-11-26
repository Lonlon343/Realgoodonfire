// FILE: src/services/payloads.js
// Pure builders for the documents the client writes. They mirror the limits in
// firestore.rules, so a payload built here is accepted by the rules. No Firebase
// imports: the tests use these functions directly.
import { calculateDupeMatchScore, calculatePriceSavingsPercentage } from './dupeScore.js';

// Same patterns as firestore.rules (isValidProductId, isAllowedImage).
export const PRODUCT_ID_PATTERN = /^[0-9]{8,14}$/;
export const PRODUCT_IMAGE_PATTERN = /^https:\/\/[a-z0-9.-]+\.openfoodfacts\.(org|net)\/.*$/;

export const PRODUCT_NAME_MAX_LENGTH = 200;
export const PRODUCT_BRAND_MAX_LENGTH = 120;
export const PRODUCT_CATEGORY_MAX_LENGTH = 40;
export const DUPE_CATEGORY_MAX_LENGTH = 60;
export const NUTRI_SCORE_MAX_LENGTH = 20;
export const DEFAULT_PRODUCT_NAME = 'Unbekanntes Produkt';
export const DEFAULT_PRODUCT_BRAND = 'Marke unbekannt';
export const DEFAULT_PRODUCT_CATEGORY = 'Vorrat';
export const INVALID_BARCODE_MESSAGE = 'Bitte gib einen gültigen Barcode mit 8 bis 14 Ziffern ein.';

// Truncates by Unicode code points, so a surrogate pair is never split.
export const truncateText = (value, maxLength) => {
  if (typeof value !== 'string') {
    return '';
  }

  const characters = Array.from(value);
  return characters.length > maxLength ? characters.slice(0, maxLength).join('') : value;
};

export const normalizeBarcode = (value) => {
  const barcode = String(value ?? '').trim();

  if (!PRODUCT_ID_PATTERN.test(barcode)) {
    throw new Error(INVALID_BARCODE_MESSAGE);
  }

  return barcode;
};

// Keeps only images the rules accept (https on an OpenFoodFacts host), else ''.
export const normalizeProductImage = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmedValue = value.trim();

  if (!trimmedValue || trimmedValue.length > 2048 || !PRODUCT_IMAGE_PATTERN.test(trimmedValue)) {
    return '';
  }

  return trimmedValue;
};

// ── Map OpenFoodFacts tags to one of the app categories ──
export function mapCategory(offTags = []) {
  const joined = offTags.map((t) => t.toLowerCase()).join(' ');

  const matchers = [
    { category: 'Getränke', keywords: ['beverage', 'drink', 'water', 'juice', 'soda', 'coffee', 'tea', 'getränke', 'boisson'] },
    { category: 'Snacks', keywords: ['snack', 'chip', 'cracker', 'cookie', 'sweet', 'candy', 'chocolate', 'biscuit', 'süßware', 'confiserie'] },
    { category: 'Kühlware', keywords: ['dairy', 'milk', 'milch', 'cheese', 'käse', 'yogurt', 'joghurt', 'fresh', 'refrigerat', 'kühl', 'meat', 'fleisch', 'wurst'] },
  ];

  for (const { category, keywords } of matchers) {
    if (keywords.some((kw) => joined.includes(kw))) return category;
  }

  return DEFAULT_PRODUCT_CATEGORY;
}

const normalizeNutriScore = (value) => (
  typeof value === 'string' && value.trim()
    ? truncateText(value.trim(), NUTRI_SCORE_MAX_LENGTH)
    : null
);

// Display data of a product from an OpenFoodFacts API response (`data.product`).
export const buildProductFromOpenFoodFacts = (offProduct, barcode) => ({
  id: barcode,
  name: truncateText(offProduct?.product_name || DEFAULT_PRODUCT_NAME, PRODUCT_NAME_MAX_LENGTH),
  brand: truncateText(offProduct?.brands || DEFAULT_PRODUCT_BRAND, PRODUCT_BRAND_MAX_LENGTH),
  image: normalizeProductImage(offProduct?.image_front_url),
  nutriScore: normalizeNutriScore(offProduct?.nutriscore_grade),
  category: truncateText(mapCategory(offProduct?.categories_tags || []), PRODUCT_CATEGORY_MAX_LENGTH),
  source: 'api',
});

// Descriptive fields of a product document (shared by both create paths).
const buildProductDescriptiveFields = (product) => {
  const name = truncateText(product?.name || DEFAULT_PRODUCT_NAME, PRODUCT_NAME_MAX_LENGTH);
  const brand = truncateText(product?.brand || '', PRODUCT_BRAND_MAX_LENGTH);

  return {
    name,
    brand,
    image: normalizeProductImage(product?.image),
    nutriScore: normalizeNutriScore(product?.nutriScore),
    category: truncateText(product?.category || DEFAULT_PRODUCT_CATEGORY, PRODUCT_CATEGORY_MAX_LENGTH),
    // Lowercase fields enable efficient prefix search queries.
    nameLower: truncateText(name.toLowerCase(), PRODUCT_NAME_MAX_LENGTH),
    brandLower: truncateText(brand.toLowerCase(), PRODUCT_BRAND_MAX_LENGTH),
  };
};

// First import of a scanned product (allowed for anonymous sessions).
export const buildProductCreatePayload = (product, createdAt) => ({
  ...buildProductDescriptiveFields(product),
  createdAt,
  reviewCount: 0,
  averageRating: 0,
});

export const computeNextAverageRating = (currentAverage, currentCount, rating) => (
  Math.round((((currentAverage * currentCount) + rating) / (currentCount + 1)) * 10) / 10
);

export const buildReviewPayload = (review, authUser, parsedPrice, createdAt) => ({
  productId: review.productId,
  productName: truncateText(review.productName || DEFAULT_PRODUCT_NAME, PRODUCT_NAME_MAX_LENGTH),
  brand: truncateText(review.brand || '', PRODUCT_BRAND_MAX_LENGTH),
  image: normalizeProductImage(review.image),
  rating: review.rating || 0,
  comment: review.comment || '',
  price: parsedPrice,
  store: review.store || null,
  isDupe: Boolean(review.isDupe),
  dupeTarget: review.isDupe ? review.dupeTarget || null : null,
  createdAt,
  ...(authUser && {
    userId: authUser.uid,
    userName: authUser.displayName || 'Foodie',
    userAvatar: authUser.photoURL || null,
  }),
});

const isPositivePrice = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0;

// Product write of the addReview transaction. `existingData` is null when the
// product document does not exist yet; it is then created from the review data
// (category and Nutri-Score default like a scan without data).
export const buildReviewProductWrite = ({ existingData, review, reviewId, parsedPrice, createdAt }) => {
  const rating = review.rating || 0;
  const priceField = isPositivePrice(parsedPrice) ? { price: parsedPrice } : {};

  if (!existingData) {
    return {
      type: 'create',
      payload: {
        ...buildProductDescriptiveFields({
          name: review.productName,
          brand: review.brand,
          image: review.image,
          nutriScore: review.nutriScore,
          category: review.category,
        }),
        createdAt,
        reviewCount: 1,
        averageRating: rating,
        lastReviewId: reviewId,
        ...priceField,
      },
    };
  }

  const currentCount = typeof existingData.reviewCount === 'number' ? existingData.reviewCount : 0;
  const currentAverage = typeof existingData.averageRating === 'number' ? existingData.averageRating : 0;

  return {
    type: 'update',
    payload: {
      reviewCount: currentCount + 1,
      averageRating: computeNextAverageRating(currentAverage, currentCount, rating),
      lastReviewId: reviewId,
      ...priceField,
    },
  };
};

export const getDupeDocId = (originalId, dupeId) => `${originalId}_${dupeId}`;

export const buildDupePayload = ({ originalProduct, dupeProduct, originalPrice, dupePrice, uid, createdAt }) => {
  const priceSavingsPercentage = calculatePriceSavingsPercentage(originalPrice, dupePrice);
  const votes = { up: 1, down: 0 };

  return {
    originalId: originalProduct.id,
    originalName: truncateText(originalProduct.name || 'Unbekanntes Original', PRODUCT_NAME_MAX_LENGTH),
    originalBrand: truncateText(originalProduct.brand || '', PRODUCT_BRAND_MAX_LENGTH),
    originalCategory: truncateText(originalProduct.category || '', DUPE_CATEGORY_MAX_LENGTH),
    originalImage: normalizeProductImage(originalProduct.image),
    originalPrice,
    dupeId: dupeProduct.id,
    dupeName: truncateText(dupeProduct.name || DEFAULT_PRODUCT_NAME, PRODUCT_NAME_MAX_LENGTH),
    dupeBrand: truncateText(dupeProduct.brand || '', PRODUCT_BRAND_MAX_LENGTH),
    dupeCategory: truncateText(dupeProduct.category || '', DUPE_CATEGORY_MAX_LENGTH),
    dupeImage: normalizeProductImage(dupeProduct.image),
    dupePrice,
    createdBy: uid,
    matchScore: calculateDupeMatchScore(priceSavingsPercentage, votes),
    priceSavingsPercentage,
    votes,
    userVotes: { [uid]: 'up' },
    createdAt,
  };
};
