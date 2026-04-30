// FILE: src/services/productService.js
import { db } from '../firebase';
import {
  collection,
  documentId,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
} from 'firebase/firestore';
import { getStoreQueryValues, normalizeStoreName } from '../data';

const HYPE_PAGE_SIZE = 10;
const PRODUCT_ID_BATCH_SIZE = 30;

const chunkArray = (items, chunkSize) => {
  const chunks = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
};

const sortProductsByHype = (firstProduct, secondProduct) => {
  const hypeDifference = (secondProduct.reviewCount || 0) - (firstProduct.reviewCount || 0);

  if (hypeDifference !== 0) {
    return hypeDifference;
  }

  return (firstProduct.name || '').localeCompare(secondProduct.name || '', 'de');
};

const getProductsByIds = async (productIds) => {
  const uniqueProductIds = [...new Set(productIds.filter(Boolean))];

  if (uniqueProductIds.length === 0) {
    return [];
  }

  const productIdBatches = chunkArray(uniqueProductIds, PRODUCT_ID_BATCH_SIZE);
  const snapshots = await Promise.all(productIdBatches.map((productIdBatch) => getDocs(query(
    collection(db, 'products'),
    where(documentId(), 'in', productIdBatch)
  ))));

  return snapshots.flatMap((snapshot) => snapshot.docs.map((docSnapshot) => ({
    id: docSnapshot.id,
    ...docSnapshot.data(),
  })));
};

const getStoreFilteredHypeProducts = async (categoryFilter, lastVisibleDoc, storeFilter) => {
  const storeQueryValues = getStoreQueryValues(storeFilter);

  if (storeQueryValues.length === 0) {
    return {
      docs: [],
      lastDoc: null,
    };
  }

  const reviewsSnapshot = await getDocs(query(
    collection(db, 'reviews'),
    where('store', 'in', storeQueryValues)
  ));

  const matchingProductIds = reviewsSnapshot.docs
    .map((docSnapshot) => docSnapshot.data()?.productId)
    .filter(Boolean);
  const matchingProducts = await getProductsByIds(matchingProductIds);
  const filteredProducts = matchingProducts
    .filter((product) => !categoryFilter || product.category === categoryFilter)
    .sort(sortProductsByHype);
  const offset = typeof lastVisibleDoc === 'number' ? lastVisibleDoc : 0;
  const docs = filteredProducts.slice(offset, offset + HYPE_PAGE_SIZE);
  const nextOffset = offset + docs.length;

  return {
    docs,
    lastDoc: nextOffset < filteredProducts.length ? nextOffset : null,
  };
};

// ── Helper: Map OFF tags to one of 5 categories ──
export function mapCategory(offTags = []) {
  const joined = offTags.map((t) => t.toLowerCase()).join(' ');

  const matchers = [
    { category: 'Getränke', keywords: ['beverage', 'drink', 'water', 'juice', 'soda', 'coffee', 'tea', 'getränke', 'boisson'] },
    { category: 'Vegan', keywords: ['vegan', 'plant-based', 'pflanzlich'] },
    { category: 'Snacks', keywords: ['snack', 'chip', 'cracker', 'cookie', 'sweet', 'candy', 'chocolate', 'biscuit', 'süßware', 'confiserie'] },
    { category: 'Kühlware', keywords: ['dairy', 'milk', 'milch', 'cheese', 'käse', 'yogurt', 'joghurt', 'fresh', 'refrigerat', 'kühl', 'meat', 'fleisch', 'wurst'] },
  ];

  for (const { category, keywords } of matchers) {
    if (keywords.some((kw) => joined.includes(kw))) return category;
  }

  return 'Vorrat';
}

// ── Pagination query for hype products ──
export async function getHypeProducts(categoryFilter = null, lastVisibleDoc = null, storeFilter = 'Alle') {
  const normalizedStoreFilter = normalizeStoreName(storeFilter);

  if (normalizedStoreFilter && normalizedStoreFilter !== 'Alle') {
    return getStoreFilteredHypeProducts(categoryFilter, lastVisibleDoc, normalizedStoreFilter);
  }

  // Fetch all products sorted by reviewCount, then filter client-side.
  // Client-side category filtering handles old products that were saved before
  // the category field existed, so no products are silently excluded.
  const snapshot = await getDocs(query(
    collection(db, 'products'),
    orderBy('reviewCount', 'desc')
  ));

  const allProducts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  const filtered = categoryFilter
    ? allProducts.filter((p) => p.category === categoryFilter)
    : allProducts;

  const offset = typeof lastVisibleDoc === 'number' ? lastVisibleDoc : 0;
  const docs = filtered.slice(offset, offset + HYPE_PAGE_SIZE);
  const nextOffset = offset + docs.length;

  return {
    docs,
    lastDoc: nextOffset < filtered.length ? nextOffset : null,
  };
}

export async function getNewestProducts() {
  const newestQuery = query(
    collection(db, 'products'),
    orderBy('createdAt', 'desc'),
    limit(5)
  );

  const snapshot = await getDocs(newestQuery);
  return snapshot.docs.map((docSnapshot) => ({
    id: docSnapshot.id,
    ...docSnapshot.data(),
  }));
}

export async function getTopDupes() {
  const dupesQuery = query(
    collection(db, 'dupes'),
    orderBy('matchScore', 'desc'),
    limit(5)
  );

  const snapshot = await getDocs(dupesQuery);
  return snapshot.docs.map((docSnapshot) => ({
    id: docSnapshot.id,
    ...docSnapshot.data(),
  }));
}
