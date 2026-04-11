// FILE: src/context/ShopContext.jsx
import React, { createContext, useCallback, useEffect, useState } from 'react';
import { MOCK_PRODUCTS, STORES } from '../data';
import { db } from '../firebase';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAfter,
  where,
} from 'firebase/firestore';
import {
  getHypeProducts,
  getNewestProducts as fetchNewestProducts,
  getTopDupes as fetchTopDupes,
  mapCategory,
} from '../services/productService';
import {
  isDisplayablePrice,
  validateRealisticPrice,
} from '../utils/pricing';
import { useAuth } from './useAuth';

const ShopContext = createContext();
const TOP_DUPES_LIMIT = 5;

const normalizeProductImage = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmedValue = value.trim();

  if (!trimmedValue || trimmedValue.includes('placehold.co')) {
    return '';
  }

  return trimmedValue;
};

const clampPercentage = (value) => Math.min(100, Math.max(0, value));

const normalizeVoteCount = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

const getNormalizedVotes = (votes = {}) => ({
  up: normalizeVoteCount(votes.up),
  down: normalizeVoteCount(votes.down),
});

const calculateInitialDupeMatchScore = (priceSavingsPercentage = 0) => {
  const normalizedSavings = Number.isFinite(priceSavingsPercentage) ? priceSavingsPercentage : 0;
  return clampPercentage(Math.round((50 + (normalizedSavings / 2)) * 10) / 10);
};

const calculateDupeMatchScore = (priceSavingsPercentage = 0, votes = {}) => {
  const baseScore = calculateInitialDupeMatchScore(priceSavingsPercentage);
  const normalizedVotes = getNormalizedVotes(votes);
  const voteAdjustment = (normalizedVotes.up - normalizedVotes.down) * 4;

  return clampPercentage(Math.round((baseScore + voteAdjustment) * 10) / 10);
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
  const [products] = useState(MOCK_PRODUCTS);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [newestProducts, setNewestProducts] = useState([]);
  const [topDupes, setTopDupes] = useState([]);
  const [recentReviews, setRecentReviews] = useState([]);
  const [isLoadingHome, setIsLoadingHome] = useState(false);

  const [reviews, setReviews] = useState(() => {
    try {
      const savedReviews = localStorage.getItem('realgood_reviews');
      return savedReviews ? JSON.parse(savedReviews) : [];
    } catch (error) {
      console.error('Error loading reviews from localStorage:', error);
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('realgood_reviews', JSON.stringify(reviews));
  }, [reviews]);

  const getTrendingProducts = useCallback(async () => {
    const { docs } = await getHypeProducts();
    return docs.slice(0, 5);
  }, []);

  const getNewestProducts = useCallback(async () => {
    const productsData = await fetchNewestProducts();
    setNewestProducts(productsData);
    return productsData;
  }, []);

  const getTopDupes = useCallback(async () => {
    const dupesData = await fetchTopDupes();
    setTopDupes(dupesData);
    return dupesData;
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
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (normalizedSearch.length < 2) {
      return [];
    }

    const snapshot = await getDocs(collection(db, 'products'));

    return snapshot.docs
      .map((docSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      }))
      .filter((product) => {
        const searchableText = [product.name, product.brand, product.category]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchableText.includes(normalizedSearch);
      })
      .sort((firstProduct, secondProduct) => {
        const firstStartsWith = firstProduct.name?.toLowerCase().startsWith(normalizedSearch) ? 1 : 0;
        const secondStartsWith = secondProduct.name?.toLowerCase().startsWith(normalizedSearch) ? 1 : 0;

        if (firstStartsWith !== secondStartsWith) {
          return secondStartsWith - firstStartsWith;
        }

        return (secondProduct.reviewCount || 0) - (firstProduct.reviewCount || 0);
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

  const getFeedActivity = useCallback(async (lastVisibleDoc = null) => {
    const feedConstraints = [
      orderBy('createdAt', 'desc'),
      limit(15),
    ];

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
      const [productsResult, dupesResult, reviewsResult] = await Promise.allSettled([
        fetchNewestProducts(),
        fetchTopDupes(),
        getRecentReviews(),
      ]);

      const productsData = productsResult.status === 'fulfilled' ? productsResult.value : [];
      const dupesData = dupesResult.status === 'fulfilled' ? dupesResult.value : [];
      const reviewsData = reviewsResult.status === 'fulfilled' ? reviewsResult.value : [];

      if (productsResult.status === 'rejected') {
        console.error('Fehler beim Laden neuer Produkte:', productsResult.reason);
      }

      if (dupesResult.status === 'rejected') {
        console.error('Fehler beim Laden der Dupes:', dupesResult.reason);
      }

      if (reviewsResult.status === 'rejected') {
        console.error('Fehler beim Laden der letzten Reviews:', reviewsResult.reason);
      }

      setNewestProducts(productsData);
      setTopDupes(dupesData);
      setRecentReviews(reviewsData);

      return {
        newestProducts: productsData,
        topDupes: dupesData,
        recentReviews: reviewsData,
      };
    } catch (error) {
      console.error('Fehler beim Laden der Home-Daten:', error);
      setNewestProducts([]);
      setTopDupes([]);
      setRecentReviews([]);
      return {
        newestProducts: [],
        topDupes: [],
        recentReviews: [],
      };
    } finally {
      setIsLoadingHome(false);
    }
  }, [getRecentReviews]);

  // Action: Fetch data from OpenFoodFacts
  const fetchProductByBarcode = async (barcode) => {
    console.log("1. Starte API-Abfrage für:", barcode);

    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=code,product_name,brands,image_front_url,nutriscore_grade,categories_tags`,
        {
          method: 'GET',
          headers: {
            'User-Agent': 'RealGoodApp - Student Project - Web'
          }
        }
      );

      console.log("2. API Antwort Status:", response.status);

      if (!response.ok) {
        throw new Error('Netzwerk-Antwort war nicht ok');
      }

      const data = await response.json();
      console.log("3. API Daten erhalten:", data);

      if (data.status === 1 && data.product) {
        const category = mapCategory(data.product.categories_tags || []);
        let resolvedProductData = null;

        const productData = {
          id: data.product.code,
          name: data.product.product_name || 'Unbekanntes Produkt',
          brand: data.product.brands || 'Marke unbekannt',
          image: normalizeProductImage(data.product.image_front_url),
          nutriScore: data.product.nutriscore_grade,
          category,
          source: 'api'
        };

        console.log("4. Produkt verarbeitet:", productData);

        // Save product to Firestore without resetting reviewCount or createdAt on repeat scans.
        try {
          const productRef = doc(db, 'products', productData.id);
          const existingSnapshot = await getDoc(productRef);
          const existingData = existingSnapshot.exists() ? existingSnapshot.data() : {};
          const storedPrice = getPersistablePrice(existingData?.price);
          const basePayload = {
            name: productData.name,
            brand: productData.brand,
            image: productData.image,
            nutriScore: productData.nutriScore || null,
            category: productData.category,
          };

          resolvedProductData = {
            ...productData,
            ...(storedPrice !== null ? { price: storedPrice } : {}),
            reviewCount: existingData?.reviewCount || 0,
          };

          await setDoc(
            productRef,
            existingSnapshot.exists()
              ? basePayload
              : {
                  ...basePayload,
                  createdAt: serverTimestamp(),
                  reviewCount: 0,
                },
            { merge: true }
          );
          console.log("5. Produkt in Firestore gespeichert");
        } catch (fsErr) {
          console.warn("Firestore-Speichern fehlgeschlagen (App läuft weiter):", fsErr);
        }

        setCurrentProduct(resolvedProductData || productData);
        return resolvedProductData || productData;
      } else {
        console.warn("Produkt nicht in der Datenbank gefunden. Status:", data.status);
        throw new Error(`Produkt mit Barcode ${barcode} nicht gefunden`);
      }
    } catch (error) {
      console.error("FEHLER beim API Aufruf:", error);
      throw error;
    }
  };

  const addReview = useCallback(async (review, authUser = null) => {
    const priceValidation = validateRealisticPrice(review.price, { allowEmpty: true });

    if (!priceValidation.isValid) {
      throw new Error(priceValidation.message);
    }

    const parsedPrice = priceValidation.parsed;

    const reviewPayload = {
      productId: review.productId,
      productName: review.productName || 'Unbekanntes Produkt',
      brand: review.brand || '',
      image: normalizeProductImage(review.image),
      rating: review.rating || 0,
      comment: review.comment || '',
      price: parsedPrice,
      store: review.store || null,
      isDupe: Boolean(review.isDupe),
      dupeTarget: review.isDupe ? review.dupeTarget || null : null,
      createdAt: serverTimestamp(),
      ...(authUser && {
        userId: authUser.uid,
        userName: authUser.displayName || 'Foodie',
        userAvatar: authUser.photoURL || null,
      }),
    };

    const reviewRef = await addDoc(collection(db, 'reviews'), reviewPayload);

    if (review.productId) {
      const productUpdatePayload = {
        reviewCount: increment(1),
      };

      if (isDisplayablePrice(parsedPrice)) {
        productUpdatePayload.price = parsedPrice;
      }

      await setDoc(
        doc(db, 'products', review.productId),
        productUpdatePayload,
        { merge: true }
      );

      if (isDisplayablePrice(parsedPrice)) {
        setCurrentProduct((previousProduct) => (
          previousProduct?.id === review.productId
            ? { ...previousProduct, price: parsedPrice }
            : previousProduct
        ));
      }
    }

    const newReview = {
      ...reviewPayload,
      id: reviewRef.id,
      createdAt: new Date(),
      date: new Date().toISOString(),
    };

    setReviews((prevReviews) => [newReview, ...prevReviews]);
    setRecentReviews((prevReviews) => [newReview, ...prevReviews].slice(0, 3));
    return newReview;
  }, []);

  const getProduct = (barcode) => {
    return products.find((p) => p.id === barcode);
  };

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

    const [originalPrice, dupePrice] = await Promise.all([
      resolveProductPrice(originalProduct),
      resolveProductPrice(dupeProduct),
    ]);
    const hasValidPriceComparison = isDisplayablePrice(originalPrice) && isDisplayablePrice(dupePrice);
    const rawSavingsPercentage = hasValidPriceComparison
      ? ((originalPrice - dupePrice) / originalPrice) * 100
      : 0;
    const priceSavingsPercentage = Number.isFinite(rawSavingsPercentage)
      ? Math.round(rawSavingsPercentage * 10) / 10
      : 0;
    const initialMatchScore = calculateInitialDupeMatchScore(priceSavingsPercentage);

    const dupePayload = {
      originalId: originalProduct.id,
      originalName: originalProduct.name || 'Unbekanntes Original',
      originalBrand: originalProduct.brand || '',
      originalCategory: originalProduct.category || '',
      originalImage: normalizeProductImage(originalProduct.image),
      originalPrice,
      dupeId: dupeProduct.id,
      dupeName: dupeProduct.name || 'Unbekanntes Produkt',
      dupeBrand: dupeProduct.brand || '',
      dupeCategory: dupeProduct.category || '',
      dupeImage: normalizeProductImage(dupeProduct.image),
      dupePrice,
      createdBy: currentUser.uid,
      matchScore: initialMatchScore,
      priceSavingsPercentage,
      votes: { up: 1, down: 0 },
      userVotes: { [currentUser.uid]: 'up' },
      createdAt: serverTimestamp(),
    };

    const priceUpdateTasks = [];

    if (isDisplayablePrice(originalPrice)) {
      priceUpdateTasks.push(
        setDoc(doc(db, 'products', originalProduct.id), { price: originalPrice }, { merge: true })
      );
    }

    if (isDisplayablePrice(dupePrice)) {
      priceUpdateTasks.push(
        setDoc(doc(db, 'products', dupeProduct.id), { price: dupePrice }, { merge: true })
      );
    }

    if (priceUpdateTasks.length > 0) {
      await Promise.all(priceUpdateTasks);
    }

    const dupeRef = await addDoc(collection(db, 'dupes'), dupePayload);
    const createdDupe = {
      id: dupeRef.id,
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

  const voteOnDupe = useCallback(async (dupeId, type) => {
    if (!currentUser?.uid) {
      throw new Error('Du musst eingeloggt sein, um auf einen Dupe zu voten.');
    }

    if (!['up', 'down'].includes(type)) {
      throw new Error('Ungueltiger Vote-Typ.');
    }

    const dupeRef = doc(db, 'dupes', dupeId);

    const updatedDupe = await runTransaction(db, async (transaction) => {
      const dupeSnapshot = await transaction.get(dupeRef);

      if (!dupeSnapshot.exists()) {
        throw new Error('Dieser Dupe wurde nicht gefunden.');
      }

      const dupeData = dupeSnapshot.data();
      const currentVote = dupeData.userVotes?.[currentUser.uid] || null;

      if (currentVote === type) {
        return {
          id: dupeSnapshot.id,
          ...dupeData,
        };
      }

      const nextVotes = getNormalizedVotes(dupeData.votes);

      if (currentVote === 'up') {
        nextVotes.up = Math.max(0, nextVotes.up - 1);
      }

      if (currentVote === 'down') {
        nextVotes.down = Math.max(0, nextVotes.down - 1);
      }

      if (type === 'up') {
        nextVotes.up += 1;
      }

      if (type === 'down') {
        nextVotes.down += 1;
      }

      const nextUserVotes = {
        ...(dupeData.userVotes || {}),
        [currentUser.uid]: type,
      };
      const nextMatchScore = calculateDupeMatchScore(dupeData.priceSavingsPercentage, nextVotes);

      transaction.update(dupeRef, {
        votes: nextVotes,
        userVotes: nextUserVotes,
        matchScore: nextMatchScore,
      });

      return {
        id: dupeSnapshot.id,
        ...dupeData,
        votes: nextVotes,
        userVotes: nextUserVotes,
        matchScore: nextMatchScore,
      };
    });

    setTopDupes((prevDupes) => prevDupes
      .map((dupe) => (dupe.id === updatedDupe.id ? updatedDupe : dupe))
      .sort((firstDupe, secondDupe) => (secondDupe.matchScore || 0) - (firstDupe.matchScore || 0))
      .slice(0, TOP_DUPES_LIMIT));

    return updatedDupe;
  }, [currentUser]);

  const value = {
    products,
    reviews,
    stores: STORES,
    addReview,
    getFeedActivity,
    getProduct,
    getProductReviews,
    getNewestProducts,
    getRecentReviews,
    searchProducts,
    getTopDupes,
    subscribeTopDupes,
    getTrendingProducts,
    fetchProductByBarcode,
    loadHomeData,
    createDupeLink,
    voteOnDupe,
    currentProduct, 
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