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
// Upper bound of reviews read for the store-filtered hype list.
const STORE_REVIEWS_LIMIT = 300;

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

const mapProductDoc = (docSnapshot) => ({
  id: docSnapshot.id,
  ...docSnapshot.data(),
});

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

  return snapshots.flatMap((snapshot) => snapshot.docs.map(mapProductDoc));
};

// Store filter: products reviewed at that store, taken from the newest
// STORE_REVIEWS_LIMIT reviews (index store ASC + createdAt DESC). The cursor of
// this variant is a numeric offset.
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
    where('store', 'in', storeQueryValues),
    orderBy('createdAt', 'desc'),
    limit(STORE_REVIEWS_LIMIT)
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

// ── Pagination query for hype products ──
// `lastDoc` is an opaque cursor: pass it back unchanged to get the next page;
// `null` means there is no further page.
export async function getHypeProducts(categoryFilter = null, lastVisibleDoc = null, storeFilter = 'Alle') {
  const normalizedStoreFilter = normalizeStoreName(storeFilter);

  if (normalizedStoreFilter && normalizedStoreFilter !== 'Alle') {
    return getStoreFilteredHypeProducts(categoryFilter, lastVisibleDoc, normalizedStoreFilter);
  }

  const constraints = [];

  // Uses the composite index category ASC + reviewCount DESC.
  if (categoryFilter) {
    constraints.push(where('category', '==', categoryFilter));
  }

  constraints.push(orderBy('reviewCount', 'desc'));
  constraints.push(limit(HYPE_PAGE_SIZE));

  // A numeric cursor belongs to the store-filtered variant; ignore it here.
  if (lastVisibleDoc && typeof lastVisibleDoc === 'object') {
    constraints.push(startAfter(lastVisibleDoc));
  }

  const snapshot = await getDocs(query(collection(db, 'products'), ...constraints));
  const pageDocs = snapshot.docs;

  return {
    docs: pageDocs.map(mapProductDoc),
    lastDoc: pageDocs.length === HYPE_PAGE_SIZE ? pageDocs[pageDocs.length - 1] : null,
  };
}

// Home strip: the most reviewed products, limited on the server.
export async function getTrendingProducts(count = 5) {
  const snapshot = await getDocs(query(
    collection(db, 'products'),
    orderBy('reviewCount', 'desc'),
    limit(count)
  ));

  return snapshot.docs.map(mapProductDoc);
}

export async function getNewestProducts() {
  const newestQuery = query(
    collection(db, 'products'),
    orderBy('createdAt', 'desc'),
    limit(5)
  );

  const snapshot = await getDocs(newestQuery);
  return snapshot.docs.map(mapProductDoc);
}
