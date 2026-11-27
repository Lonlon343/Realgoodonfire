// Seeds the local Firebase emulators with the fictional demo data.
// Writes bypass the security rules (emulator admin access) but use the same
// payload builders as the app, so the app's own writes during the recording
// pass the real rules on top of this data.
//
// Standalone (emulators must be running):
//   node scripts/demo-video/seed.mjs
import { pathToFileURL } from 'node:url';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { Timestamp, doc, writeBatch } from 'firebase/firestore';
import {
  buildProductCreatePayload,
  buildReviewPayload,
  getDupeDocId,
  normalizeProductImage,
  truncateText,
} from '../../src/services/payloads.js';
import { calculateDupeMatchScore, calculatePriceSavingsPercentage } from '../../src/services/dupeScore.js';
import { DEMO_ACCOUNT, DUPES, PRODUCTS, REVIEWERS, REVIEWS, productByKey } from './demo-data.mjs';

export const PROJECT_ID = 'demo-realgood';
export const FIRESTORE_HOST = '127.0.0.1';
export const FIRESTORE_PORT = 8080;
export const AUTH_ORIGIN = 'http://127.0.0.1:9099';

const reviewerFor = (key) => (key === 'mia' ? DEMO_ACCOUNT : REVIEWERS[key]);

const authFetch = async (path, { method = 'POST', body, admin = false } = {}) => {
  const response = await fetch(`${AUTH_ORIGIN}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(admin ? { Authorization: 'Bearer owner' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Auth emulator ${method} ${path} failed (${response.status}): ${text}`);
  }

  return text ? JSON.parse(text) : {};
};

// Removes all accounts and creates the demo account with a fixed uid.
export const seedAuth = async (projectId = PROJECT_ID) => {
  await authFetch(`/emulator/v1/projects/${projectId}/accounts`, { method: 'DELETE' });
  await authFetch(`/identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts`, {
    admin: true,
    body: {
      localId: DEMO_ACCOUNT.uid,
      email: DEMO_ACCOUNT.email,
      password: DEMO_ACCOUNT.password,
      displayName: DEMO_ACCOUNT.displayName,
      emailVerified: true,
    },
  });

  // The rules compare review.userName with the `name` claim of the ID token.
  const signIn = await authFetch('/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-api-key', {
    body: { email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password, returnSecureToken: true },
  });
  const claims = JSON.parse(Buffer.from(signIn.idToken.split('.')[1], 'base64url').toString('utf8'));

  if (claims.user_id !== DEMO_ACCOUNT.uid || claims.name !== DEMO_ACCOUNT.displayName) {
    throw new Error(`Demo account token has unexpected claims: user_id=${claims.user_id}, name=${claims.name}`);
  }
};

const buildProductDoc = (product, now) => ({
  ...buildProductCreatePayload(product, Timestamp.fromMillis(now - product.ageMs)),
  reviewCount: product.reviewCount,
  averageRating: product.averageRating,
  price: product.price,
});

const buildReviewDoc = (review, now) => {
  const product = productByKey(review.product);
  const reviewer = reviewerFor(review.user);

  return buildReviewPayload(
    {
      productId: product.id,
      productName: product.name,
      brand: product.brand,
      image: '',
      rating: review.rating,
      comment: review.comment,
      store: review.store,
    },
    { uid: reviewer.uid, displayName: reviewer.displayName, photoURL: null },
    review.price,
    Timestamp.fromMillis(now - review.ageMs)
  );
};

// Same fields as buildDupePayload (src/services/payloads.js), with the votes of
// several fictional users instead of the single vote of the creator.
const buildDupeDoc = (dupe, now) => {
  const original = productByKey(dupe.original);
  const alternative = productByKey(dupe.dupe);
  const priceSavingsPercentage = calculatePriceSavingsPercentage(original.price, alternative.price);
  const votes = { up: dupe.voters.up.length, down: dupe.voters.down.length };
  const userVotes = Object.fromEntries([
    ...dupe.voters.up.map((key) => [REVIEWERS[key].uid, 'up']),
    ...dupe.voters.down.map((key) => [REVIEWERS[key].uid, 'down']),
  ]);

  return {
    originalId: original.id,
    originalName: truncateText(original.name, 200),
    originalBrand: original.brand,
    originalCategory: original.category,
    originalImage: normalizeProductImage(''),
    originalPrice: original.price,
    dupeId: alternative.id,
    dupeName: truncateText(alternative.name, 200),
    dupeBrand: alternative.brand,
    dupeCategory: alternative.category,
    dupeImage: normalizeProductImage(''),
    dupePrice: alternative.price,
    createdBy: REVIEWERS[dupe.voters.up[0]].uid,
    matchScore: calculateDupeMatchScore(priceSavingsPercentage, votes),
    priceSavingsPercentage,
    votes,
    userVotes,
    createdAt: Timestamp.fromMillis(now - dupe.ageMs),
  };
};

export const seedFirestore = async ({ projectId = PROJECT_ID, now = Date.now() } = {}) => {
  const testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { host: FIRESTORE_HOST, port: FIRESTORE_PORT },
  });

  try {
    await testEnv.clearFirestore();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      const batch = writeBatch(db);

      PRODUCTS.forEach((product) => {
        batch.set(doc(db, 'products', product.id), buildProductDoc(product, now));
      });
      REVIEWS.forEach((review) => {
        batch.set(doc(db, 'reviews', review.id), buildReviewDoc(review, now));
      });
      DUPES.forEach((dupe) => {
        const data = buildDupeDoc(dupe, now);
        batch.set(doc(db, 'dupes', getDupeDocId(data.originalId, data.dupeId)), data);
      });

      await batch.commit();
    });
  } finally {
    await testEnv.cleanup();
  }

  return { products: PRODUCTS.length, reviews: REVIEWS.length, dupes: DUPES.length };
};

export const seedDemoData = async (options = {}) => {
  await seedAuth(options.projectId);
  return seedFirestore(options);
};

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  seedDemoData()
    .then((summary) => {
      console.log(`Seeded demo data: ${JSON.stringify(summary)}`);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
