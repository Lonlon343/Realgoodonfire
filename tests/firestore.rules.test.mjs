// Firestore security rules tests. Run only against the local emulator:
//   timeout 300 npm run test:rules
// Payloads are built with the same functions the client uses (src/services/*).
import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { buildDupeVoteUpdate, calculateDupeMatchScore } from '../src/services/dupeScore.js';
import {
  buildDupePayload,
  buildProductCreatePayload,
  buildProductFromOpenFoodFacts,
  buildReviewPayload,
  getDupeDocId,
} from '../src/services/payloads.js';
import {
  createProductIfMissing,
  deleteReviewsOfUser,
  writeDupeLink,
  writeDupeVote,
  writeReviewWithStats,
} from '../src/services/firestoreWrites.js';

const PROJECT_ID = 'demo-realgood';
const PRODUCT_ID = '4006040000013';
const OTHER_PRODUCT_ID = '4311501000017';
const OFF_IMAGE = 'https://images.openfoodfacts.org/images/products/400/604/000/0013/front_de.3.400.jpg';
const LEGACY_IMAGE = 'https://example-cdn.invalid/legacy/product.jpg';

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
    },
  });
});

after(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

const anonDb = (uid = 'anon-1') => testEnv
  .authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } })
  .firestore();

const realDb = (uid, name = 'Anna') => testEnv
  .authenticatedContext(uid, { name, firebase: { sign_in_provider: 'password' } })
  .firestore();

// The client passes the Firebase Auth user; the rules compare against the token.
const authUserFor = (uid, name = 'Anna') => ({ uid, displayName: name, photoURL: null });

const seed = (path, data) => testEnv.withSecurityRulesDisabled(
  (context) => setDoc(doc(context.firestore(), path), data)
);

const readAsAdmin = async (path) => {
  let data = null;
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const snapshot = await getDoc(doc(context.firestore(), path));
    data = snapshot.exists() ? snapshot.data() : null;
  });
  return data;
};

const offProduct = (overrides = {}) => ({
  code: PRODUCT_ID,
  product_name: 'Hafer Drink',
  brands: 'Oatly',
  image_front_url: OFF_IMAGE,
  nutriscore_grade: 'a',
  categories_tags: ['en:beverages'],
  ...overrides,
});

const scannedProduct = (id = PRODUCT_ID, overrides = {}) => buildProductFromOpenFoodFacts(offProduct(overrides), id);

const seedProduct = (id = PRODUCT_ID, overrides = {}) => seed(`products/${id}`, {
  ...buildProductCreatePayload(scannedProduct(id), Timestamp.now()),
  ...overrides,
});

const reviewInput = (overrides = {}) => ({
  productId: PRODUCT_ID,
  productName: 'Hafer Drink',
  brand: 'Oatly',
  image: OFF_IMAGE,
  rating: 4,
  comment: 'Lecker',
  price: 1.99,
  store: 'Aldi',
  ...overrides,
});

const seedReview = (id, uid, overrides = {}) => seed(`reviews/${id}`, {
  ...buildReviewPayload(reviewInput(), authUserFor(uid), 1.99, Timestamp.now()),
  ...overrides,
});

const dupeProducts = {
  originalProduct: { id: PRODUCT_ID, name: 'Hafer Drink', brand: 'Oatly', category: 'Getränke', image: OFF_IMAGE },
  dupeProduct: { id: OTHER_PRODUCT_ID, name: 'Haferdrink', brand: 'Milsani', category: 'Getränke', image: '' },
};

const dupePayload = ({ originalPrice = 2.49, dupePrice = 1.19, uid = 'user-a', createdAt = serverTimestamp() } = {}) => buildDupePayload({
  ...dupeProducts,
  originalPrice,
  dupePrice,
  uid,
  createdAt,
});

const DUPE_ID = getDupeDocId(PRODUCT_ID, OTHER_PRODUCT_ID);

const seedDupe = ({ savings = 0, votes = { up: 1, down: 0 }, userVotes = { 'user-a': 'up' }, omitUserVotes = false } = {}) => {
  const data = {
    ...dupePayload({ createdAt: Timestamp.now() }),
    priceSavingsPercentage: savings,
    votes,
    userVotes,
    matchScore: calculateDupeMatchScore(savings, votes),
  };

  if (omitUserVotes) {
    delete data.userVotes;
  }

  return seed(`dupes/${DUPE_ID}`, data);
};

const voteAs = async (db, uid, type) => {
  const stored = await readAsAdmin(`dupes/${DUPE_ID}`);
  const update = buildDupeVoteUpdate(stored, uid, type);
  assert.ok(update, 'vote builder returned no change');
  return updateDoc(doc(db, 'dupes', DUPE_ID), update);
};

// ───────────────────────────── R1 dupe votes ─────────────────────────────
describe('R1 dupe votes', () => {
  it('R1 real user B upvotes a dupe created by A (first vote)', async () => {
    await seedDupe();
    await assertSucceeds(voteAs(realDb('user-b'), 'user-b', 'up'));
  });

  it('R1 real user B downvotes a dupe created by A (first vote)', async () => {
    await seedDupe();
    await assertSucceeds(voteAs(realDb('user-b'), 'user-b', 'down'));
  });

  it('R1 client vote transaction (writeDupeVote) succeeds for a first vote', async () => {
    await seedDupe();
    await assertSucceeds(writeDupeVote(realDb('user-b'), DUPE_ID, 'user-b', 'up'));
    const stored = await readAsAdmin(`dupes/${DUPE_ID}`);
    assert.deepEqual(stored.votes, { up: 2, down: 0 });
  });

  it('R1 B switches an existing vote from down to up', async () => {
    await seedDupe({ votes: { up: 1, down: 1 }, userVotes: { 'user-a': 'up', 'user-b': 'down' } });
    await assertSucceeds(voteAs(realDb('user-b'), 'user-b', 'up'));
  });

  it('R1 B cannot vote twice in the same direction', async () => {
    await seedDupe({ votes: { up: 2, down: 0 }, userVotes: { 'user-a': 'up', 'user-b': 'up' } });
    const votes = { up: 3, down: 0 };
    await assertFails(updateDoc(doc(realDb('user-b'), 'dupes', DUPE_ID), {
      votes,
      userVotes: { 'user-a': 'up', 'user-b': 'up' },
      matchScore: calculateDupeMatchScore(0, votes),
    }));
  });

  it('R1 B cannot change the counters arbitrarily', async () => {
    await seedDupe();
    const votes = { up: 7, down: 0 };
    await assertFails(updateDoc(doc(realDb('user-b'), 'dupes', DUPE_ID), {
      votes,
      userVotes: { 'user-a': 'up', 'user-b': 'up' },
      matchScore: calculateDupeMatchScore(0, votes),
    }));
  });

  it('R1 B cannot change the vote of another user', async () => {
    await seedDupe();
    const votes = { up: 0, down: 1 };
    await assertFails(updateDoc(doc(realDb('user-b'), 'dupes', DUPE_ID), {
      votes,
      userVotes: { 'user-a': 'down' },
      matchScore: calculateDupeMatchScore(0, votes),
    }));
  });

  it('R1 anonymous session cannot vote', async () => {
    await seedDupe();
    await assertFails(voteAs(anonDb('anon-b'), 'anon-b', 'up'));
  });

  it('R1 legacy dupe without userVotes field accepts a first vote', async () => {
    await seedDupe({ omitUserVotes: true });
    await assertSucceeds(voteAs(realDb('user-b'), 'user-b', 'up'));
  });
});

// ───────────────────────────── R2 integer arithmetic ─────────────────────
describe('R2 integer arithmetic in savings and score', () => {
  it('R2 dupe create with int prices 2 and 1 (savings 50, score 79)', async () => {
    const payload = dupePayload({ originalPrice: 2, dupePrice: 1 });
    assert.equal(payload.priceSavingsPercentage, 50);
    assert.equal(payload.matchScore, 79);
    await assertSucceeds(setDoc(doc(realDb('user-a'), 'dupes', DUPE_ID), payload));
  });

  it('R2 dupe create with prices 2 and 1.5 (savings 25 as int, score 66.5)', async () => {
    const payload = dupePayload({ originalPrice: 2, dupePrice: 1.5 });
    assert.equal(payload.priceSavingsPercentage, 25);
    assert.equal(payload.matchScore, 66.5);
    await assertSucceeds(setDoc(doc(realDb('user-a'), 'dupes', DUPE_ID), payload));
  });

  it('R2 vote on a stored dupe whose savings is the odd int 25', async () => {
    await seedDupe({ savings: 25, votes: { up: 1, down: 1 }, userVotes: { 'user-a': 'up', 'user-b': 'down' } });
    await assertSucceeds(voteAs(realDb('user-b'), 'user-b', 'up'));
    const stored = await readAsAdmin(`dupes/${DUPE_ID}`);
    assert.equal(stored.matchScore, 70.5);
  });
});

// ───────────────────────────── R3 clamp parity ───────────────────────────
describe('R3 match score clamp parity', () => {
  it('R3 vote on a dupe with savings -200 (client clamps once like the rule)', async () => {
    await seedDupe({ savings: -200 });
    await assertSucceeds(voteAs(realDb('user-b'), 'user-b', 'up'));
  });

  it('R3 dupe create with savings below -100 % is accepted', async () => {
    const payload = dupePayload({ originalPrice: 1, dupePrice: 3.5 });
    assert.ok(payload.priceSavingsPercentage < -100);
    await assertSucceeds(setDoc(doc(realDb('user-a'), 'dupes', DUPE_ID), payload));
  });
});

// ───────────────────────────── R4 products ───────────────────────────────
describe('R4 product create and descriptive updates', () => {
  it('R4 anonymous create of a scanned product is allowed (createProductIfMissing)', async () => {
    const result = await assertSucceeds(createProductIfMissing(anonDb(), scannedProduct()));
    assert.equal(result.created, true);
  });

  it('R4 scanner does not write when the product already exists', async () => {
    await seedProduct(PRODUCT_ID, { image: LEGACY_IMAGE, reviewCount: 3, averageRating: 4.3 });
    const result = await assertSucceeds(createProductIfMissing(anonDb(), scannedProduct()));
    assert.equal(result.created, false);
    assert.equal(result.data.reviewCount, 3);
  });

  it('R4 create with a non-numeric product id is denied', async () => {
    const payload = buildProductCreatePayload(scannedProduct('abc-product'), serverTimestamp());
    await assertFails(setDoc(doc(anonDb(), 'products', 'abc-product'), payload));
  });

  it('R4 create with a 7-digit product id is denied', async () => {
    const payload = buildProductCreatePayload(scannedProduct('1234567'), serverTimestamp());
    await assertFails(setDoc(doc(anonDb(), 'products', '1234567'), payload));
  });

  it('R4 create with image http://evil.example/p.gif is denied', async () => {
    const payload = {
      ...buildProductCreatePayload(scannedProduct(), serverTimestamp()),
      image: 'http://evil.example/p.gif',
    };
    await assertFails(setDoc(doc(anonDb(), 'products', PRODUCT_ID), payload));
  });

  it('R4 create with an http (not https) OpenFoodFacts image is denied', async () => {
    const payload = {
      ...buildProductCreatePayload(scannedProduct(), serverTimestamp()),
      image: 'http://images.openfoodfacts.org/images/products/x.jpg',
    };
    await assertFails(setDoc(doc(anonDb(), 'products', PRODUCT_ID), payload));
  });

  it('R4 create with an empty image is allowed', async () => {
    const payload = buildProductCreatePayload(scannedProduct(PRODUCT_ID, { image_front_url: '' }), serverTimestamp());
    assert.equal(payload.image, '');
    await assertSucceeds(setDoc(doc(anonDb(), 'products', PRODUCT_ID), payload));
  });

  it('R4 create with a long OpenFoodFacts brand is truncated by the client and allowed', async () => {
    const product = scannedProduct(PRODUCT_ID, {
      brands: 'Marke, '.repeat(60),
      product_name: 'Ä'.repeat(260),
    });
    assert.equal(Array.from(product.brand).length, 120);
    assert.equal(Array.from(product.name).length, 200);
    await assertSucceeds(createProductIfMissing(anonDb(), product));
  });

  it('R4 anonymous update of the product name is denied', async () => {
    await seedProduct();
    await assertFails(updateDoc(doc(anonDb(), 'products', PRODUCT_ID), {
      name: 'Gekapert',
      nameLower: 'gekapert',
    }));
  });

  it('R4 anonymous counter reset is denied', async () => {
    await seedProduct(PRODUCT_ID, { reviewCount: 5, averageRating: 4.2 });
    await assertFails(updateDoc(doc(anonDb(), 'products', PRODUCT_ID), { reviewCount: 0 }));
  });

  it('R4 real account descriptive update with a valid image is allowed', async () => {
    await seedProduct();
    await assertSucceeds(updateDoc(doc(realDb('user-a'), 'products', PRODUCT_ID), {
      name: 'Hafer Drink Barista',
      nameLower: 'hafer drink barista',
      image: 'https://static.openfoodfacts.org/images/products/400/604/000/0013/front_de.4.400.jpg',
    }));
  });

  it('R4 real account update that sets a foreign image is denied', async () => {
    await seedProduct();
    await assertFails(updateDoc(doc(realDb('user-a'), 'products', PRODUCT_ID), {
      image: 'http://evil.example/p.gif',
    }));
  });

  it('R4 real account name update on a legacy product with a foreign image is allowed', async () => {
    await seedProduct(PRODUCT_ID, { image: LEGACY_IMAGE });
    await assertSucceeds(updateDoc(doc(realDb('user-a'), 'products', PRODUCT_ID), {
      name: 'Hafer Drink',
      nameLower: 'hafer drink',
    }));
  });

  it('R4 real-account stats update on a legacy product with a foreign image is allowed', async () => {
    await seedProduct(PRODUCT_ID, { image: LEGACY_IMAGE, reviewCount: 2, averageRating: 4.5 });
    await assertSucceeds(writeReviewWithStats(
      realDb('user-b'),
      reviewInput({ image: LEGACY_IMAGE }),
      authUserFor('user-b'),
      null
    ));
  });

  it('R4 review with a foreign image is denied, the client blanks it', async () => {
    await seedProduct();
    const reviewRef = doc(collection(realDb('user-b'), 'reviews'));
    await assertFails(setDoc(reviewRef, {
      ...buildReviewPayload(reviewInput(), authUserFor('user-b'), null, serverTimestamp()),
      image: LEGACY_IMAGE,
    }));
    assert.equal(buildReviewPayload(reviewInput({ image: LEGACY_IMAGE }), authUserFor('user-b'), null, null).image, '');
  });
});

// ───────────────────────────── R5 review + stats ─────────────────────────
describe('R5 review and product stats in one transaction', () => {
  it('R5 happy path on an existing product', async () => {
    await seedProduct(PRODUCT_ID, { reviewCount: 2, averageRating: 4.5 });
    const result = await assertSucceeds(writeReviewWithStats(
      realDb('user-b'),
      reviewInput({ rating: 3 }),
      authUserFor('user-b'),
      1.99
    ));
    const stored = await readAsAdmin(`products/${PRODUCT_ID}`);
    assert.equal(stored.reviewCount, 3);
    assert.equal(stored.averageRating, 4);
    assert.equal(stored.price, 1.99);
    assert.equal(stored.lastReviewId, result.reviewId);
    assert.ok(await readAsAdmin(`reviews/${result.reviewId}`));
  });

  it('R5 happy path on a legacy product with an int average and no lastReviewId', async () => {
    await seedProduct(PRODUCT_ID, { reviewCount: 1, averageRating: 5 });
    await assertSucceeds(writeReviewWithStats(realDb('user-b'), reviewInput({ rating: 2 }), authUserFor('user-b'), null));
  });

  it('R5 happy path when the product document is missing', async () => {
    const result = await assertSucceeds(writeReviewWithStats(
      realDb('user-b'),
      reviewInput({ rating: 5 }),
      authUserFor('user-b'),
      null
    ));
    const stored = await readAsAdmin(`products/${PRODUCT_ID}`);
    assert.equal(stored.reviewCount, 1);
    assert.equal(stored.averageRating, 5);
    assert.equal(stored.category, 'Vorrat');
    assert.equal(stored.lastReviewId, result.reviewId);
  });

  it('R5 stats bump without a review is denied', async () => {
    await seedProduct(PRODUCT_ID, { reviewCount: 2, averageRating: 4.5 });
    await assertFails(updateDoc(doc(realDb('user-b'), 'products', PRODUCT_ID), {
      reviewCount: 3,
      averageRating: 4.7,
      lastReviewId: 'does-not-exist',
    }));
  });

  it('R5 stats bump without lastReviewId is denied', async () => {
    await seedProduct(PRODUCT_ID, { reviewCount: 2, averageRating: 4.5 });
    await assertFails(updateDoc(doc(realDb('user-b'), 'products', PRODUCT_ID), {
      reviewCount: 3,
      averageRating: 4.7,
    }));
  });

  it('R5 stats bump pointing at an already existing own review is denied', async () => {
    await seedProduct(PRODUCT_ID, { reviewCount: 1, averageRating: 4 });
    await seedReview('review-old', 'user-b', { rating: 4 });
    await assertFails(updateDoc(doc(realDb('user-b'), 'products', PRODUCT_ID), {
      reviewCount: 2,
      averageRating: 4,
      lastReviewId: 'review-old',
    }));
  });

  it("R5 stats bump pointing at someone else's review is denied", async () => {
    await seedProduct(PRODUCT_ID, { reviewCount: 1, averageRating: 4 });
    await seedReview('review-of-a', 'user-a', { rating: 4 });
    await assertFails(updateDoc(doc(realDb('user-b'), 'products', PRODUCT_ID), {
      reviewCount: 2,
      averageRating: 4,
      lastReviewId: 'review-of-a',
    }));
  });

  it('R5 stats bump with a new review of a different product is denied', async () => {
    await seedProduct(PRODUCT_ID, { reviewCount: 1, averageRating: 4 });
    const db = realDb('user-b');
    const reviewRef = doc(collection(db, 'reviews'));
    const batch = writeBatch(db);
    batch.set(reviewRef, buildReviewPayload(
      reviewInput({ productId: OTHER_PRODUCT_ID, rating: 4 }),
      authUserFor('user-b'),
      null,
      serverTimestamp()
    ));
    batch.update(doc(db, 'products', PRODUCT_ID), {
      reviewCount: 2,
      averageRating: 4,
      lastReviewId: reviewRef.id,
    });
    await assertFails(batch.commit());
  });

  it('R5 wrong average is denied', async () => {
    await seedProduct(PRODUCT_ID, { reviewCount: 2, averageRating: 4.5 });
    const db = realDb('user-b');
    const reviewRef = doc(collection(db, 'reviews'));
    await assertFails(runTransaction(db, async (transaction) => {
      await transaction.get(doc(db, 'products', PRODUCT_ID));
      transaction.set(reviewRef, buildReviewPayload(reviewInput({ rating: 1 }), authUserFor('user-b'), null, serverTimestamp()));
      transaction.update(doc(db, 'products', PRODUCT_ID), {
        reviewCount: 3,
        averageRating: 5,
        lastReviewId: reviewRef.id,
      });
    }));
  });

  it('R5 anonymous review with stats is denied', async () => {
    await seedProduct(PRODUCT_ID, { reviewCount: 2, averageRating: 4.5 });
    await assertFails(writeReviewWithStats(anonDb('anon-b'), reviewInput(), authUserFor('anon-b', 'Foodie'), null));
  });

  it('R5 product create with a wrong first average is denied', async () => {
    const db = realDb('user-b');
    const reviewRef = doc(collection(db, 'reviews'));
    const batch = writeBatch(db);
    batch.set(reviewRef, buildReviewPayload(reviewInput({ rating: 2 }), authUserFor('user-b'), null, serverTimestamp()));
    batch.set(doc(db, 'products', PRODUCT_ID), {
      ...buildProductCreatePayload(scannedProduct(), serverTimestamp()),
      reviewCount: 1,
      averageRating: 5,
      lastReviewId: reviewRef.id,
    });
    await assertFails(batch.commit());
  });

  it('R5 product create with reviewCount 1 but no review is denied', async () => {
    await assertFails(setDoc(doc(realDb('user-b'), 'products', PRODUCT_ID), {
      ...buildProductCreatePayload(scannedProduct(), serverTimestamp()),
      reviewCount: 1,
      averageRating: 5,
      lastReviewId: 'does-not-exist',
    }));
  });
});

// ───────────────────────────── R6 dupes ──────────────────────────────────
describe('R6 dupe creation', () => {
  it('R6 createDupeLink batch writes the dupe and both prices', async () => {
    await seedProduct(PRODUCT_ID);
    await seedProduct(OTHER_PRODUCT_ID);
    await assertSucceeds(writeDupeLink(realDb('user-a'), {
      ...dupeProducts,
      originalPrice: 2.49,
      dupePrice: 1.19,
      uid: 'user-a',
    }));
    assert.equal((await readAsAdmin(`products/${PRODUCT_ID}`)).price, 2.49);
    assert.equal((await readAsAdmin(`products/${OTHER_PRODUCT_ID}`)).price, 1.19);
    assert.ok(await readAsAdmin(`dupes/${DUPE_ID}`));
  });

  it('R6 the same pair a second time is denied (same and other user)', async () => {
    await seedProduct(PRODUCT_ID);
    await seedProduct(OTHER_PRODUCT_ID);
    const input = { ...dupeProducts, originalPrice: 2.49, dupePrice: 1.19 };
    await assertSucceeds(writeDupeLink(realDb('user-a'), { ...input, uid: 'user-a' }));
    await assertFails(writeDupeLink(realDb('user-a'), { ...input, uid: 'user-a' }));
    await assertFails(writeDupeLink(realDb('user-b'), { ...input, uid: 'user-b' }));
  });

  it('R6 dupe document id that does not match originalId_dupeId is denied', async () => {
    await assertFails(setDoc(doc(realDb('user-a'), 'dupes', 'random-id'), dupePayload()));
  });

  it('R6 addDoc with a random id is denied', async () => {
    await assertFails(addDoc(collection(realDb('user-a'), 'dupes'), dupePayload()));
  });

  it('R6 a rejected dupe leaves the product prices unchanged', async () => {
    await seedProduct(PRODUCT_ID, { price: 3.99 });
    await seedProduct(OTHER_PRODUCT_ID);
    const db = realDb('user-a');
    const batch = writeBatch(db);
    batch.set(doc(db, 'dupes', DUPE_ID), { ...dupePayload({ originalPrice: 2.49, dupePrice: 1.19 }), matchScore: 99 });
    batch.set(doc(db, 'products', PRODUCT_ID), { price: 2.49 }, { merge: true });
    await assertFails(batch.commit());
    assert.equal((await readAsAdmin(`products/${PRODUCT_ID}`)).price, 3.99);
  });

  it('R6 dupe with a foreign image is denied', async () => {
    await assertFails(setDoc(doc(realDb('user-a'), 'dupes', DUPE_ID), {
      ...dupePayload(),
      dupeImage: 'http://evil.example/p.gif',
    }));
  });

  it('R6 anonymous dupe create is denied', async () => {
    await assertFails(setDoc(doc(anonDb('anon-a'), 'dupes', DUPE_ID), dupePayload({ uid: 'anon-a' })));
  });
});

// ───────────────────────────── R7 reports and userName ───────────────────
describe('R7 reports and review userName bounds', () => {
  const reportPayload = (overrides = {}) => ({
    reviewId: 'review-1',
    reporterUserId: 'user-b',
    reason: 'spam',
    details: null,
    status: 'pending',
    createdAt: serverTimestamp(),
    ...overrides,
  });

  it('R7 valid report is allowed', async () => {
    await assertSucceeds(addDoc(collection(realDb('user-b'), 'reports'), reportPayload()));
  });

  it('R7 report with a 65-character reviewId is denied', async () => {
    await assertFails(addDoc(collection(realDb('user-b'), 'reports'), reportPayload({ reviewId: 'r'.repeat(65) })));
  });

  it('R7 report with a client-chosen createdAt is denied', async () => {
    await assertFails(addDoc(collection(realDb('user-b'), 'reports'), reportPayload({
      createdAt: Timestamp.fromDate(new Date('2020-01-01T00:00:00Z')),
    })));
  });

  it('R7 review with an 80-character userName is allowed', async () => {
    const name = 'N'.repeat(80);
    await seedProduct();
    await assertSucceeds(writeReviewWithStats(realDb('user-b', name), reviewInput(), authUserFor('user-b', name), null));
  });

  it('R7 review with an 81-character userName is denied', async () => {
    const name = 'N'.repeat(81);
    await seedProduct();
    await assertFails(writeReviewWithStats(realDb('user-b', name), reviewInput(), authUserFor('user-b', name), null));
  });
});

// ───────────────────────────── R8 review deletion ────────────────────────
describe('R8 review deletion for account removal', () => {
  it('R8 owner can delete an own review', async () => {
    await seedReview('review-1', 'user-b');
    await assertSucceeds(deleteDoc(doc(realDb('user-b'), 'reviews', 'review-1')));
  });

  it('R8 another real user cannot delete the review', async () => {
    await seedReview('review-1', 'user-b');
    await assertFails(deleteDoc(doc(realDb('user-c'), 'reviews', 'review-1')));
  });

  it('R8 anonymous session with the same uid cannot delete', async () => {
    await seedReview('review-1', 'user-b');
    await assertFails(deleteDoc(doc(anonDb('user-b'), 'reviews', 'review-1')));
  });

  it('R8 owner update stays denied', async () => {
    await seedReview('review-1', 'user-b');
    await assertFails(updateDoc(doc(realDb('user-b'), 'reviews', 'review-1'), { comment: 'geändert' }));
  });

  it('R8 deleteReviewsOfUser removes all reviews of the user only', async () => {
    await Promise.all([
      seedReview('review-1', 'user-b'),
      seedReview('review-2', 'user-b'),
      seedReview('review-3', 'user-b'),
      seedReview('review-4', 'user-c'),
    ]);
    const db = realDb('user-b');
    const deleted = await assertSucceeds(deleteReviewsOfUser(db, 'user-b'));
    assert.equal(deleted, 3);
    const remaining = await getDocs(query(collection(db, 'reviews'), where('userId', '==', 'user-b')));
    assert.equal(remaining.size, 0);
    assert.ok(await readAsAdmin('reviews/review-4'));
  });
});
