import React from 'react';
import { Star, Flame } from 'lucide-react';

export const ReviewCard = ({ review, product }) => {
  if (!product) {
    return <div className="p-4 text-slate-400">Produkt nicht gefunden</div>;
  }

  const {
    comment = '',
    rating = 0,
    price = 0,
    store = 'Unbekannt',
    isDupe = false,
    dupeTarget = '',
  } = review;

  // Gamification: Schnäppchen-Alarm
  const isSchnappchen = rating >= 4 && price < 2.0;

  // Render stars
  const renderStars = () => {
    return (
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={16}
            className={
              i < rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-slate-300'
            }
          />
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-4 p-4">
      {/* Header: Product Info */}
      <div className="flex gap-3 mb-3">
        <img
          src={product.image}
          alt={product.name}
          className="w-14 h-14 rounded-lg object-cover bg-slate-100"
        />
        <div className="flex-1">
          <p className="text-sm text-slate-500">{product.brand}</p>
          <h3 className="font-bold text-slate-900 line-clamp-2">
            {product.name}
          </h3>
        </div>
      </div>

      {/* Rating */}
      <div className="mb-3">{renderStars()}</div>

      {/* Comment */}
      {comment && (
        <p className="text-slate-700 text-sm mb-3 leading-relaxed">
          {comment}
        </p>
      )}

      {/* Badges & Footer */}
      <div className="flex flex-wrap gap-2 items-center pt-3 border-t border-slate-100">
        {/* Store Badge */}
        <span className="inline-block bg-slate-200 text-slate-700 text-xs font-medium px-3 py-1 rounded-full">
          {store}
        </span>

        {/* Price */}
        <span className="text-sm font-semibold text-slate-900">
          {price.toFixed(2)} €
        </span>

        {/* Schnäppchen-Alert */}
        {isSchnappchen && (
          <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-medium px-2 py-1 rounded-full">
            <Flame size={14} className="fill-red-600" />
            Schnäppchen
          </span>
        )}

        {/* Dupe-Alert */}
        {isDupe && dupeTarget && (
          <span className="inline-block bg-purple-200 text-purple-700 text-xs font-medium px-3 py-1 rounded-full">
            Dupe zu {dupeTarget}
          </span>
        )}
      </div>
    </div>
  );
};
