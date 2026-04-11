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
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
} from 'firebase/firestore';
import {
  getHypeProducts,
  getNewestProducts as fetchNewestProducts,
  getTopDupes as fetchTopDupes,
  mapCategory,
} from '../services/productService';
import { useAuth } from './useAuth';

const ShopContext = createContext();

const parsePriceValue = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsedValue = Number.parseFloat(value.replace(',', '.'));
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
};

const clampPercentage = (value) => Math.min(100, Math.max(0, value));

export const ShopProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [products] = useState(MOCK_PRODUCTS);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [newestProducts, setNewestProducts] = useState([]);
  const [topDupes, setTopDupes] = useState([]);
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
      reviews: snapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      })),
      lastVisibleDoc: snapshot.docs[snapshot.docs.length - 1] || null,
    };
  }, []);

  const loadHomeData = useCallback(async () => {
    setIsLoadingHome(true);

    try {
      const [productsData, dupesData] = await Promise.all([
        fetchNewestProducts(),
        fetchTopDupes(),
      ]);

      setNewestProducts(productsData);
      setTopDupes(dupesData);

      return {
        newestProducts: productsData,
        topDupes: dupesData,
      };
    } catch (error) {
      console.error('Fehler beim Laden der Home-Daten:', error);
      setNewestProducts([]);
      setTopDupes([]);
      throw error;
    } finally {
      setIsLoadingHome(false);
    }
  }, []);

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

        const productData = {
          id: data.product.code,
          name: data.product.product_name || 'Unbekanntes Produkt',
          brand: data.product.brands || 'Marke unbekannt',
          image: data.product.image_front_url || 'https://placehold.co/300x300?text=Kein+Bild',
          nutriScore: data.product.nutriscore_grade,
          category,
          source: 'api'
        };

        console.log("4. Produkt verarbeitet:", productData);

        // Save product to Firestore without resetting reviewCount or createdAt on repeat scans.
        try {
          const productRef = doc(db, 'products', productData.id);
          const existingSnapshot = await getDoc(productRef);
          const basePayload = {
            name: productData.name,
            brand: productData.brand,
            image: productData.image,
            nutriScore: productData.nutriScore || null,
            category: productData.category,
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

        setCurrentProduct(productData);
        return productData;
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
    const reviewPayload = {
      productId: review.productId,
      productName: review.productName || 'Unbekanntes Produkt',
      brand: review.brand || '',
      image: review.image || '',
      rating: review.rating || 0,
      comment: review.comment || '',
      price: parsePriceValue(review.price),
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
      await setDoc(
        doc(db, 'products', review.productId),
        { reviewCount: increment(1) },
        { merge: true }
      );
    }

    const newReview = {
      ...reviewPayload,
      id: reviewRef.id,
      createdAt: new Date(),
      date: new Date().toISOString(),
    };

    setReviews((prevReviews) => [newReview, ...prevReviews]);
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

    const originalPrice = parsePriceValue(originalProduct.price);
    const dupePrice = parsePriceValue(dupeProduct.price);
    const hasValidPriceComparison = originalPrice !== null && originalPrice > 0 && dupePrice !== null;
    const rawSavingsPercentage = hasValidPriceComparison
      ? ((originalPrice - dupePrice) / originalPrice) * 100
      : 0;
    const priceSavingsPercentage = Number.isFinite(rawSavingsPercentage)
      ? Math.round(rawSavingsPercentage * 10) / 10
      : 0;
    const initialMatchScore = clampPercentage(
      Math.round((50 + (priceSavingsPercentage / 2)) * 10) / 10
    );

    const dupePayload = {
      originalId: originalProduct.id,
      originalName: originalProduct.name || 'Unbekanntes Original',
      originalBrand: originalProduct.brand || '',
      originalImage: originalProduct.image || 'https://placehold.co/300x300?text=Original',
      originalPrice,
      dupeId: dupeProduct.id,
      dupeName: dupeProduct.name || 'Unbekanntes Produkt',
      dupeBrand: dupeProduct.brand || '',
      dupeImage: dupeProduct.image || 'https://placehold.co/300x300?text=Dupe',
      dupePrice,
      createdBy: currentUser.uid,
      matchScore: initialMatchScore,
      priceSavingsPercentage,
      votes: { up: 1, down: 0 },
      createdAt: serverTimestamp(),
    };

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
        .slice(0, 3);
    });

    return createdDupe;
  }, [currentUser]);

  const value = {
    products,
    reviews,
    stores: STORES,
    addReview,
    getFeedActivity,
    getProduct,
    getNewestProducts,
    getTopDupes,
    getTrendingProducts,
    fetchProductByBarcode,
    loadHomeData,
    createDupeLink,
    currentProduct, 
    newestProducts,
    topDupes,
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