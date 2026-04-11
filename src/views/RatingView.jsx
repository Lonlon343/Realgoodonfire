import React, { useState } from 'react';
import { Star, ArrowLeft, Send } from 'lucide-react';
import { useShop } from '../context/useShop';
import { useAuth } from '../context/useAuth';

const MAX_FOOD_PRICE_EUR = 80;

export const RatingView = ({ onTabChange }) => {
  const { currentProduct, addReview } = useShop();
  const { currentUser, requireAuth } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [price, setPrice] = useState('');
  const [store, setStore] = useState('Aldi');
  const [isDupe, setIsDupe] = useState(false);
  const [dupeTarget, setDupeTarget] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [priceError, setPriceError] = useState('');

  const stores = ['Aldi', 'Lidl', 'Rewe', 'Edeka', 'Penny', 'Kaufland', 'dm'];

  if (!currentProduct) {
    return (
      <div className="pb-24 px-4 py-8">
        <div className="text-center">
          <p className="text-red-600 font-bold mb-4">❌ Kein Produkt ausgewählt</p>
          <button
            onClick={() => onTabChange('scanner')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
          >
            Zurück zum Scanner
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (rating === 0) {
      alert('Bitte eine Bewertung geben');
      return;
    }

    const parsedPrice = price ? Number.parseFloat(price) : null;

    if (parsedPrice !== null && (Number.isNaN(parsedPrice) || parsedPrice < 0 || parsedPrice > MAX_FOOD_PRICE_EUR)) {
      setPriceError(`Bitte gib einen Preis zwischen 0 und ${MAX_FOOD_PRICE_EUR} Euro ein.`);
      return;
    }

    setIsSubmitting(true);
    setPriceError('');

    try {
      const review = {
        productId: currentProduct.id,
        productName: currentProduct.name,
        brand: currentProduct.brand,
        image: currentProduct.image,
        rating,
        comment,
        price: parsedPrice,
        store,
        isDupe,
        dupeTarget: isDupe ? dupeTarget : null,
        date: new Date().toISOString(),
      };

      console.log('💾 Speichere Review:', review);
      await addReview(review, currentUser);

      setSuccess(true);
      setRating(0);
      setComment('');
      setPrice('');
      setDupeTarget('');
      setIsDupe(false);

      setTimeout(() => {
        onTabChange('community');
      }, 1500);
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      alert(error?.message || 'Fehler beim Speichern der Bewertung');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePriceChange = (event) => {
    const nextValue = event.target.value;

    if (nextValue === '') {
      setPrice('');
      setPriceError('');
      return;
    }

    const parsedValue = Number.parseFloat(nextValue);

    if (Number.isNaN(parsedValue)) {
      setPrice(nextValue);
      return;
    }

    if (parsedValue > MAX_FOOD_PRICE_EUR) {
      setPrice(String(MAX_FOOD_PRICE_EUR));
      setPriceError(`Maximal ${MAX_FOOD_PRICE_EUR} Euro sind erlaubt.`);
      return;
    }

    if (parsedValue < 0) {
      setPrice('0');
      setPriceError('Der Preis darf nicht negativ sein.');
      return;
    }

    setPrice(nextValue);
    setPriceError('');
  };

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-emerald-50 to-white px-4 py-6 border-b">
        <button
          onClick={() => onTabChange('scanner')}
          className="flex items-center gap-2 text-emerald-600 font-bold mb-4 hover:text-emerald-700"
        >
          <ArrowLeft size={20} />
          Zurück
        </button>

        <div className="flex items-start gap-4">
          {currentProduct.image && (
            <img
              src={currentProduct.image}
              alt={currentProduct.name}
              className="w-20 h-20 object-cover rounded-lg shadow-md"
            />
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">{currentProduct.name}</h1>
            <p className="text-slate-600">{currentProduct.brand}</p>
            {currentProduct.nutriScore && (
              <p className="text-sm text-slate-500">
                🥗 NutriScore: <span className="font-bold uppercase">{currentProduct.nutriScore}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={(e) => e.preventDefault()} className="px-4 py-6 space-y-6">
        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-green-700 font-bold">✅ Bewertung gespeichert!</p>
            <p className="text-sm text-green-600 mt-1">Weiterleitung zur Community...</p>
          </div>
        )}

        {/* Star Rating */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h2 className="font-bold text-slate-900 mb-4">Wie ist die Qualität?</h2>
          <div className="flex gap-3 justify-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  size={40}
                  className={`${
                    star <= (hoveredRating || rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-slate-300'
                  } transition-colors`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-center mt-3 text-slate-600">
              <span className="font-bold text-lg">{rating}</span> von 5 Sternen
            </p>
          )}
        </div>

        {/* Price */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <label className="block font-bold text-slate-900 mb-3">Preis (optional)</label>
          <div className="flex gap-2">
            <span className="text-2xl font-bold text-slate-900 self-center">€</span>
            <input
              type="number"
              step="0.01"
              min="0"
              max={MAX_FOOD_PRICE_EUR}
              value={price}
              onChange={handlePriceChange}
              placeholder="z.B. 2,99"
              className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          {priceError && (
            <p className="mt-2 text-xs font-medium text-red-500">{priceError}</p>
          )}
        </div>

        {/* Store */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <label className="block font-bold text-slate-900 mb-3">Supermarkt</label>
          <select
            value={store}
            onChange={(e) => setStore(e.target.value)}
            className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          >
            {stores.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Comment */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <label className="block font-bold text-slate-900 mb-3">Kommentar (optional)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Z.B. Super lecker, aber zu teuer..."
            maxLength="500"
            rows="4"
            className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
          <p className="text-xs text-slate-500 mt-2">{comment.length}/500</p>
        </div>

        {/* Dupe Checkbox */}
        <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isDupe}
              onChange={(e) => setIsDupe(e.target.checked)}
              className="w-5 h-5 rounded border-2 border-purple-300 cursor-pointer"
            />
            <span className="font-bold text-purple-900">👥 Dupe-Alert: Ähnliches Produkt?</span>
          </label>
          {isDupe && (
            <input
              type="text"
              value={dupeTarget}
              onChange={(e) => setDupeTarget(e.target.value)}
              placeholder="Z.B. Nutella 750g"
              className="w-full mt-3 px-4 py-2 border-2 border-purple-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
            />
          )}
        </div>

        {/* Submit Button */}
        <button
          type="button"
          disabled={isSubmitting || rating === 0}
          onClick={() => requireAuth(() => handleSubmit())}
          className="w-full px-6 py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          <Send size={20} />
          {isSubmitting ? 'Speichere...' : 'Bewertung posten'}
        </button>
      </form>
    </div>
  );
};
