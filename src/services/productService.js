// FILE: src/services/productService.js
import { db } from '../firebase';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
} from 'firebase/firestore';

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
export async function getHypeProducts(categoryFilter = null, lastVisibleDoc = null) {
  const productsRef = collection(db, 'products');
  const constraints = [];

  if (categoryFilter) {
    constraints.push(where('category', '==', categoryFilter));
  }
  constraints.push(orderBy('reviewCount', 'desc'));
  constraints.push(limit(10));

  if (lastVisibleDoc) {
    constraints.push(startAfter(lastVisibleDoc));
  }

  const q = query(productsRef, ...constraints);
  const snapshot = await getDocs(q);

  const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

  return { docs, lastDoc };
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
    limit(3)
  );

  const snapshot = await getDocs(dupesQuery);
  return snapshot.docs.map((docSnapshot) => ({
    id: docSnapshot.id,
    ...docSnapshot.data(),
  }));
}
