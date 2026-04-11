// FILE: src/context/ShopContext.jsx
import React, { createContext, useCallback, useEffect, useState } from 'react';
import { MOCK_PRODUCTS, STORES } from '../data';
import { db } from '../firebase';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  getHypeProducts,
  getNewestProducts as fetchNewestProducts,
  getTopDupes as fetchTopDupes,
  mapCategory,
} from '../services/productService';

const ShopContext = createContext();

export const ShopProvider = ({ children }) => {
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

  const addReview = (review, authUser = null) => {
    const newReview = {
      ...review,
      id: Date.now().toString(),
      date: new Date().toISOString(),
      ...(authUser && {
        userId: authUser.uid,
        userName: authUser.displayName,
        userAvatar: authUser.photoURL,
      }),
    };
    setReviews((prevReviews) => [newReview, ...prevReviews]);
  };

  const getProduct = (barcode) => {
    return products.find((p) => p.id === barcode);
  };

  const value = {
    products,
    reviews,
    stores: STORES,
    addReview,
    getProduct,
    getNewestProducts,
    getTopDupes,
    getTrendingProducts,
    fetchProductByBarcode,
    loadHomeData,
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