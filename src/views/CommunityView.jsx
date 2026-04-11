import React, { useState } from 'react';
import { useShop } from '../context/useShop';
import { ReviewCard } from '../components/cards/ReviewCard';

// Mock Reviews für Testing (können später entfernt werden)
const MOCK_REVIEWS = [
  {
    id: '1',
    productId: '4002359000012', // Barilla Pesto
    comment: 'Super cremig, perfektes Aroma! Der Preis ist unschlagbar.',
    rating: 5,
    price: 1.49,
    store: 'Aldi',
    isDupe: false,
  },
  {
    id: '2',
    productId: '4388844000021', // ja! Milch
    comment: 'Frische ist top, schmeckt wie von der Weide 🥛',
    rating: 4,
    price: 0.89,
    store: 'Lidl',
    isDupe: false,
  },
  {
    id: '3',
    productId: '4337185000035', // K-Classic Cookies
    comment: 'Knusprig und lecker, aber bei Edeka deutlich günstiger.',
    rating: 4,
    price: 1.79,
    store: 'Rewe',
    isDupe: true,
    dupeTarget: 'Rewe Eigenmarke',
  },
  {
    id: '4',
    productId: '4061458000048', // Milsani Quark
    comment: 'Cremig, perfekt für Desserts. Ein Klassiker!',
    rating: 5,
    price: 1.29,
    store: 'Edeka',
    isDupe: false,
  },
];

export const CommunityView = () => {
  const { products, reviews: contextReviews } = useShop();
  const [selectedStore, setSelectedStore] = useState('Alle');

  // Mock Reviews mit echten Reviews kombinieren
  const allReviews = [...MOCK_REVIEWS, ...contextReviews];

  // Filter nach ausgewähltem Store
  const filteredReviews =
    selectedStore === 'Alle'
      ? allReviews
      : allReviews.filter((r) => r.store === selectedStore);

  // Store-Chips (Stores sind definiert im Context)
  const stores = ['Alle', 'Aldi', 'Lidl', 'Rewe', 'Edeka', 'Penny', 'Kaufland', 'dm'];

  return (
    <div className="pb-24">
      {/* Sticky Header mit Store-Filtern */}
      <div className="sticky top-0 bg-white border-b border-slate-200 shadow-sm z-10">
        <div className="p-4">
          <h2 className="text-xl font-bold text-slate-900 mb-3">Community</h2>
          {/* Horizontal scrollable chips */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {stores.map((store) => (
              <button
                key={store}
                onClick={() => setSelectedStore(store)}
                className={`whitespace-nowrap px-4 py-2 rounded-full font-medium text-sm transition-all ${
                  selectedStore === store
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {store}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews Feed */}
      <div className="p-4">
        {filteredReviews.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500">
              Noch keine Bewertungen für {selectedStore === 'Alle' ? 'alle Stores' : selectedStore}.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((review) => {
              const product = products.find((p) => p.id === review.productId);
              return (
                <ReviewCard
                  key={review.id}
                  review={review}
                  product={product}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

