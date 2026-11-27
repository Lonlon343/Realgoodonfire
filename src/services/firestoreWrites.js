// FILE: src/services/firestoreWrites.js
// Firestore write operations of the client. They take the Firestore instance as
// an argument, so the rules tests run exactly this code against the emulator.
import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  buildDupePayload,
  buildProductCreatePayload,
  buildReviewPayload,
  buildReviewProductWrite,
  getDupeDocId,
} from './payloads.js';
import { buildDupeVoteUpdate } from './dupeScore.js';

const isPositivePrice = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0;

// Scanner: creates the product document only when it does not exist yet.
// An existing document is never rewritten. Returns the stored data (or the
// freshly created payload) so the caller can show counters and price.
export async function createProductIfMissing(db, product) {
  const productRef = doc(db, 'products', product.id);

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(productRef);

    if (snapshot.exists()) {
      return { created: false, data: snapshot.data() };
    }

    const payload = buildProductCreatePayload(product, serverTimestamp());
    transaction.set(productRef, payload);
    return { created: true, data: payload };
  });
}

// addReview: review and product stats in ONE transaction. The review id is
// generated up front and stored on the product as `lastReviewId`, which the
// rules use to tie the stats bump to exactly this new review.
export async function writeReviewWithStats(db, review, authUser, parsedPrice) {
  if (!review?.productId) {
    throw new Error('Kein Produkt ausgewählt.');
  }

  const reviewRef = doc(collection(db, 'reviews'));
  const productRef = doc(db, 'products', review.productId);
  const reviewPayload = buildReviewPayload(review, authUser, parsedPrice, serverTimestamp());

  const productWrite = await runTransaction(db, async (transaction) => {
    const productSnapshot = await transaction.get(productRef);
    const nextProductWrite = buildReviewProductWrite({
      existingData: productSnapshot.exists() ? productSnapshot.data() : null,
      review,
      reviewId: reviewRef.id,
      parsedPrice,
      createdAt: serverTimestamp(),
    });

    transaction.set(reviewRef, reviewPayload);

    if (nextProductWrite.type === 'create') {
      transaction.set(productRef, nextProductWrite.payload);
    } else {
      transaction.update(productRef, nextProductWrite.payload);
    }

    return nextProductWrite;
  });

  return { reviewId: reviewRef.id, reviewPayload, productWrite };
}

// createDupeLink: dupe and learned prices in one batch (all or nothing). The
// dupe id is deterministic, so the same pair can only be created once.
export async function writeDupeLink(db, { originalProduct, dupeProduct, originalPrice, dupePrice, uid }) {
  const dupeId = getDupeDocId(originalProduct.id, dupeProduct.id);
  const dupePayload = buildDupePayload({
    originalProduct,
    dupeProduct,
    originalPrice,
    dupePrice,
    uid,
    createdAt: serverTimestamp(),
  });
  const batch = writeBatch(db);

  batch.set(doc(db, 'dupes', dupeId), dupePayload);

  if (isPositivePrice(originalPrice)) {
    batch.set(doc(db, 'products', originalProduct.id), { price: originalPrice }, { merge: true });
  }

  if (isPositivePrice(dupePrice)) {
    batch.set(doc(db, 'products', dupeProduct.id), { price: dupePrice }, { merge: true });
  }

  await batch.commit();
  return { id: dupeId, payload: dupePayload };
}

export async function writeDupeVote(db, dupeId, uid, type) {
  const dupeRef = doc(db, 'dupes', dupeId);

  return runTransaction(db, async (transaction) => {
    const dupeSnapshot = await transaction.get(dupeRef);

    if (!dupeSnapshot.exists()) {
      throw new Error('Dieser Dupe wurde nicht gefunden.');
    }

    const dupeData = dupeSnapshot.data();
    const update = buildDupeVoteUpdate(dupeData, uid, type);

    if (!update) {
      return { id: dupeSnapshot.id, ...dupeData };
    }

    transaction.update(dupeRef, update);
    return { id: dupeSnapshot.id, ...dupeData, ...update };
  });
}

const DELETE_BATCH_SIZE = 200;

// Account deletion: removes every review of `uid` in batches. Returns the count.
export async function deleteReviewsOfUser(db, uid) {
  let deletedCount = 0;

  for (;;) {
    const snapshot = await getDocs(query(
      collection(db, 'reviews'),
      where('userId', '==', uid),
      limit(DELETE_BATCH_SIZE)
    ));

    if (snapshot.empty) {
      return deletedCount;
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnapshot) => batch.delete(docSnapshot.ref));
    await batch.commit();
    deletedCount += snapshot.size;

    if (snapshot.size < DELETE_BATCH_SIZE) {
      return deletedCount;
    }
  }
}
