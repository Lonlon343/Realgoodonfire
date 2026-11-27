// FILE: src/context/ShopContext.jsx
import { createContext, useCallback, useEffect, useState } from 'react';
import { STORES, getStoreQueryValues } from '../data';
import { auth, db } from '../firebase';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  where,
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import {
  getHypeProducts,
  getNewestProducts as fetchNewestProducts,
  getTrendingProducts,
} from '../services/productService';
import {
  buildProductFromOpenFoodFacts,
  getDupeDocId,
  normalizeBarcode,
} from '../services/payloads';
import {
  createProductIfMissing,
  writeDupeLink,
  writeDupeVote,
  writeReviewWithStats,
} from '../services/firestoreWrites';
import {
  isDisplayablePrice,
  validateRealisticPrice,
} from '../utils/pricing';
import { useAuth } from './useAuth';

const ShopContext = createContext();
const TOP_DUPES_LIMIT = 5;
const USER_REVIEWS_LIMIT = 100;
const OPEN_FOOD_FACTS_FIELDS = 'code,product_name,brands,image_front_url,nutriscore_grade,categories_tags';

// The scanner may create a product from an anonymous session. Waits for the
// auth state and signs in anonymously once if needed; false = skip the write.
const ensureSignedInForProductWrite = async () => {
  try {
    await auth.authStateReady();

    if (auth.currentUser) {
      return true;
    }

    await signInAnonymously(auth);
    return Boolean(auth.currentUser);
  } catch (error) {
    console.warn('Anmeldung für das Speichern des Produkts fehlgeschlagen:', error);
    return false;
  }
};

const buildTopDupesQuery = () => query(
  collection(db, 'dupes'),
  orderBy('matchScore', 'desc'),
  limit(TOP_DUPES_LIMIT)
);

const getPersistablePrice = (value) => {
  const validationResult = validateRealisticPrice(value, { allowEmpty: true });
  return validationResult.isValid ? validationResult.parsed : null;
};

const mapReviewDoc = (docSnapshot) => {
  const data = docSnapshot.data();

  return {
    id: docSnapshot.id,
    userId: data.userId || null,
    userName: data.userName || 'Foodie',
    userAvatar: data.userAvatar || null,
    productId: data.productId || null,
    productName: data.productName || 'Unbekanntes Produkt',
    brand: data.brand || '',
    image: data.image || '',
    rating: typeof data.rating === 'number' ? data.rating : 0,
    comment: data.comment || '',
    price: data.price ?? null,
    store: data.store || null,
    createdAt: data.createdAt || null,
  };
};

export const ShopProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [currentProduct, setCurrentProduct] = useState(null);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [newestProducts, setNewestProducts] = useState([]);
  const [topDupes, setTopDupes] = useState([]);
  const [recentReviews, setRecentReviews] = useState([]);
  const [isLoadingHome, setIsLoadingHome] = useState(false);

  // Older versions mirrored the user's reviews (personal data) into
  // localStorage and never read or cleared them. Remove that copy once.
  useEffect(() => {
    try {
      localStorage.removeItem('realgood_reviews');
    } catch {
      // Storage unavailable (private mode, blocked site data): nothing to clean.
    }
  }, []);

  const subscribeTopDupes = useCallback(() => onSnapshot(
    buildTopDupesQuery(),
    (snapshot) => {
      const dupesData = snapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      }));

      setTopDupes(dupesData);
    },
    (error) => {
      console.error('Fehler beim Live-Update der Dupes:', error);
    }
  ), []);

  const searchProducts = useCallback(async (searchTerm) => {
    const term = searchTerm.trim().toLowerCase();

    if (term.length < 2) {
      return [];
    }

    const endTerm = term + '\uf8ff';
    const rawTerm = searchTerm.trim();
    const rawEndTerm = rawTerm + '\uf8ff';

    // Four parallel prefix-range queries: lowercase fields (new products) +
    // original-case fields (legacy products that predate the nameLower migration).
    const [nameSnapshot, brandSnapshot, nameCaseSnapshot, brandCaseSnapshot] = await Promise.all([
      getDocs(query(
        collection(db, 'products'),
        where('nameLower', '>=', term),
        where('nameLower', '<=', endTerm),
        limit(12)
      )),
      getDocs(query(
        collection(db, 'products'),
        where('brandLower', '>=', term),
        where('brandLower', '<=', endTerm),
        limit(12)
      )),
      getDocs(query(
        collection(db, 'products'),
        where('name', '>=', rawTerm),
        where('name', '<=', rawEndTerm),
        limit(12)
      )),
      getDocs(query(
        collection(db, 'products'),
        where('brand', '>=', rawTerm),
        where('brand', '<=', rawEndTerm),
        limit(12)
      )),
    ]);

    // Merge and deduplicate by document id
    const seen = new Set();
    const results = [];

    for (const snapshot of [nameSnapshot, brandSnapshot, nameCaseSnapshot, brandCaseSnapshot]) {
      for (const docSnapshot of snapshot.docs) {
        if (!seen.has(docSnapshot.id)) {
          seen.add(docSnapshot.id);
          results.push({ id: docSnapshot.id, ...docSnapshot.data() });
        }
      }
    }

    // Sort: name-prefix matches first, then by review count
    return results
      .sort((a, b) => {
        const aName = (a.nameLower || a.name || '').toLowerCase().startsWith(term) ? 1 : 0;
        const bName = (b.nameLower || b.name || '').toLowerCase().startsWith(term) ? 1 : 0;
        if (aName !== bName) return bName - aName;
        return (b.reviewCount || 0) - (a.reviewCount || 0);
      })
      .slice(0, 8);
  }, []);

  const resolveProductPrice = useCallback(async (product) => {
    const directPrice = getPersistablePrice(product?.price);

    if (directPrice !== null) {
      return directPrice;
    }

    if (!product?.id) {
      return null;
    }

    const productSnapshot = await getDoc(doc(db, 'products', product.id));

    if (!productSnapshot.exists()) {
      return null;
    }

    return getPersistablePrice(productSnapshot.data()?.price);
  }, []);

  const getFeedActivity = useCallback(async (lastVisibleDoc = null, storeFilter = 'Alle') => {
    const storeQueryValues = getStoreQueryValues(storeFilter);
    const feedConstraints = [];

    // When a store is selected, filter server-side using the store's known name variants.
    // This requires the composite index on store (ASC) + createdAt (DESC).
    if (storeQueryValues.length > 0) {
      feedConstraints.push(where('store', 'in', storeQueryValues));
    }

    feedConstraints.push(orderBy('createdAt', 'desc'));
    feedConstraints.push(limit(15));

    if (lastVisibleDoc) {
      feedConstraints.push(startAfter(lastVisibleDoc));
    }

    const feedQuery = query(collection(db, 'reviews'), ...feedConstraints);
    const snapshot = await getDocs(feedQuery);

    return {
      reviews: snapshot.docs.map(mapReviewDoc),
      lastVisibleDoc: snapshot.docs[snapshot.docs.length - 1] || null,
    };
  }, []);

  const getProductReviews = useCallback(async (productId, lastVisibleDoc = null) => {
    if (!productId) {
      return {
        reviews: [],
        lastVisibleDoc: null,
        hasMore: false,
      };
    }

    const reviewConstraints = [
      where('productId', '==', productId),
      orderBy('createdAt', 'desc'),
      limit(5),
    ];

    if (lastVisibleDoc) {
      reviewConstraints.push(startAfter(lastVisibleDoc));
    }

    const reviewsQuery = query(collection(db, 'reviews'), ...reviewConstraints);
    const snapshot = await getDocs(reviewsQuery);
    const nextLastVisibleDoc = snapshot.docs[snapshot.docs.length - 1] || null;

    return {
      reviews: snapshot.docs.map(mapReviewDoc),
      lastVisibleDoc: nextLastVisibleDoc,
      hasMore: snapshot.docs.length === 5 && Boolean(nextLastVisibleDoc),
    };
  }, []);

  const getUserReviews = useCallback(async (userId) => {
    if (!userId) {
      return [];
    }

    const userReviewsQuery = query(
      collection(db, 'reviews'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(USER_REVIEWS_LIMIT)
    );

    const snapshot = await getDocs(userReviewsQuery);
    return snapshot.docs.map(mapReviewDoc);
  }, []);

  const getRecentReviews = useCallback(async () => {
    const recentReviewsQuery = query(
      collection(db, 'reviews'),
      orderBy('createdAt', 'desc'),
      limit(3)
    );

    const snapshot = await getDocs(recentReviewsQuery);
  const reviewData = snapshot.docs.map(mapReviewDoc);

    setRecentReviews(reviewData);
    return reviewData;
  }, []);

  const loadHomeData = useCallback(async () => {
    setIsLoadingHome(true);

    try {
      // topDupes are handled by subscribeTopDupes (real-time), so not fetched here.
      const [trendingResult, productsResult, reviewsResult] = await Promise.allSettled([
        getTrendingProducts(5),      // trending = top 5 by reviewCount (server-side limit)
        fetchNewestProducts(),       // newest = sorted by createdAt
        getRecentReviews(),          // 3 most recent reviews for the social strip
      ]);

      const trendingData = trendingResult.status === 'fulfilled' ? trendingResult.value : [];
      const productsData = productsResult.status === 'fulfilled' ? productsResult.value : [];
      const reviewsData = reviewsResult.status === 'fulfilled' ? reviewsResult.value : [];

      if (trendingResult.status === 'rejected') {
        console.error('Fehler beim Laden der Trending-Produkte:', trendingResult.reason);
      }
      if (productsResult.status === 'rejected') {
        console.error('Fehler beim Laden neuer Produkte:', productsResult.reason);
      }
      if (reviewsResult.status === 'rejected') {
        console.error('Fehler beim Laden der letzten Reviews:', reviewsResult.reason);
      }

      setTrendingProducts(trendingData);
      setNewestProducts(productsData);
      setRecentReviews(reviewsData);
    } catch (error) {
      console.error('Fehler beim Laden der Home-Daten:', error);
      setTrendingProducts([]);
      setNewestProducts([]);
      setRecentReviews([]);
    } finally {
      setIsLoadingHome(false);
    }
  }, [getRecentReviews]);

  // Action: Fetch data from OpenFoodFacts
  const fetchProductByBarcode = async (rawBarcode) => {
    try {
      const barcode = normalizeBarcode(rawBarcode);
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}?fields=${OPEN_FOOD_FACTS_FIELDS}`
      );

      if (!response.ok) {
        throw new Error('Netzwerk-Antwort war nicht ok');
      }

      const data = await response.json();

      if (data.status !== 1 || !data.product) {
        throw new Error(`Produkt mit Barcode ${barcode} nicht gefunden`);
      }

      const productData = buildProductFromOpenFoodFacts(data.product, barcode);
      let resolvedProductData = productData;

      // Create the product document only when it is missing; an existing
      // document is never rewritten by a scan. If no session is available the
      // write is skipped: the review transaction can create the product later.
      try {
        if (await ensureSignedInForProductWrite()) {
          const { data: storedData } = await createProductIfMissing(db, productData);
          const storedPrice = getPersistablePrice(storedData?.price);

          resolvedProductData = {
            ...productData,
            ...(storedPrice !== null ? { price: storedPrice } : {}),
            reviewCount: typeof storedData?.reviewCount === 'number' ? storedData.reviewCount : 0,
            averageRating: typeof storedData?.averageRating === 'number' ? storedData.averageRating : 0,
          };
        }
      } catch (fsErr) {
        console.warn('Firestore-Speichern fehlgeschlagen (App läuft weiter):', fsErr);
      }

      setCurrentProduct(resolvedProductData);
      return resolvedProductData;
    } catch (error) {
      console.error('Fehler beim Barcode-Lookup:', error);
      throw error;
    }
  };

  // Review and product stats are written in one transaction (see
  // writeReviewWithStats); a missing product document is created with it.
  const addReview = useCallback(async (review, authUser = null) => {
    const priceValidation = validateRealisticPrice(review.price, { allowEmpty: true });

    if (!priceValidation.isValid) {
      throw new Error(priceValidation.message);
    }

    const parsedPrice = priceValidation.parsed;
    const { reviewId, reviewPayload } = await writeReviewWithStats(db, review, authUser, parsedPrice);

    if (isDisplayablePrice(parsedPrice)) {
      setCurrentProduct((previousProduct) => (
        previousProduct?.id === review.productId
          ? { ...previousProduct, price: parsedPrice }
          : previousProduct
      ));
    }

    const newReview = {
      ...reviewPayload,
      id: reviewId,
      createdAt: new Date(),
      date: new Date().toISOString(),
    };

    setRecentReviews((prevReviews) => [newReview, ...prevReviews].slice(0, 3));
    return newReview;
  }, []);

  const createDupeLink = useCallback(async (originalProduct, dupeProduct) => {
    if (!currentUser?.uid) {
      throw new Error('Du musst eingeloggt sein, um einen Dupe einzutragen.');
    }

    if (!originalProduct?.id || !dupeProduct?.id) {
      throw new Error('Originalprodukt und Dupe-Produkt werden benötigt.');
    }

    if (originalProduct.id === dupeProduct.id) {
      throw new Error('Ein Produkt kann nicht mit sich selbst verknüpft werden.');
    }

    // The rules reject a repeated pair anyway; checking first gives a clear message
    // instead of a generic permission error.
    const existingDupe = await getDoc(doc(db, 'dupes', getDupeDocId(originalProduct.id, dupeProduct.id)));

    if (existingDupe.exists()) {
      throw new Error('Diesen Dupe gibt es schon. Du kannst ihn auf der Startseite bewerten.');
    }

    const [originalPrice, dupePrice] = await Promise.all([
      resolveProductPrice(originalProduct),
      resolveProductPrice(dupeProduct),
    ]);
    // Dupe and learned prices in one batch: a rejected dupe changes nothing.
    // The id is `${originalId}_${dupeId}`, so a repeated pair is rejected.
    const { id: dupeId, payload: dupePayload } = await writeDupeLink(db, {
      originalProduct,
      dupeProduct,
      originalPrice,
      dupePrice,
      uid: currentUser.uid,
    });
    const createdDupe = {
      id: dupeId,
      ...dupePayload,
      createdAt: new Date(),
    };

    setTopDupes((prevDupes) => {
      const nextDupes = [createdDupe, ...prevDupes];
      return nextDupes
        .sort((firstDupe, secondDupe) => (secondDupe.matchScore || 0) - (firstDupe.matchScore || 0))
        .slice(0, TOP_DUPES_LIMIT);
    });

    return createdDupe;
  }, [currentUser, resolveProductPrice]);

  const reportReview = useCallback(async (reviewId, reporterUserId, reason, additionalText = '') => {
    if (!reviewId) {
      throw new Error('Review-ID fehlt.');
    }

    if (!reporterUserId) {
      throw new Error('Du musst eingeloggt sein, um eine Meldung zu senden.');
    }

    if (!reason) {
      throw new Error('Bitte wähle einen Meldegrund aus.');
    }

    const trimmedDetails = typeof additionalText === 'string' ? additionalText.trim() : '';

    const reportPayload = {
      reviewId,
      reporterUserId,
      reason,
      details: trimmedDetails || null,
      status: 'pending',
      createdAt: serverTimestamp(),
    };

    const reportRef = await addDoc(collection(db, 'reports'), reportPayload);
    return reportRef.id;
  }, []);

  const voteOnDupe = useCallback(async (dupeId, type) => {
    if (!currentUser?.uid) {
      throw new Error('Du musst eingeloggt sein, um auf einen Dupe zu voten.');
    }

    if (!['up', 'down'].includes(type)) {
      throw new Error('Ungültiger Vote-Typ.');
    }

    const updatedDupe = await writeDupeVote(db, dupeId, currentUser.uid, type);

    setTopDupes((prevDupes) => prevDupes
      .map((dupe) => (dupe.id === updatedDupe.id ? updatedDupe : dupe))
      .sort((firstDupe, secondDupe) => (secondDupe.matchScore || 0) - (firstDupe.matchScore || 0))
      .slice(0, TOP_DUPES_LIMIT));

    return updatedDupe;
  }, [currentUser]);

  const value = {
    stores: STORES,
    addReview,
    getFeedActivity,
    getProductReviews,
    getUserReviews,
    getRecentReviews,
    searchProducts,
    subscribeTopDupes,
    fetchProductByBarcode,
    loadHomeData,
    createDupeLink,
    voteOnDupe,
    reportReview,
    currentProduct,
    trendingProducts,
    newestProducts,
    topDupes,
    recentReviews,
    isLoadingHome,
    setCurrentProduct,
    getHypeProducts,
  };

  return (
    <ShopContext.Provider value={value}>
      {children}
    </ShopContext.Provider>
  );
};

export { ShopContext };