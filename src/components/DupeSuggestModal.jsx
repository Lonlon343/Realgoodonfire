import { useCallback, useEffect, useState } from 'react';
import { ArrowLeftRight, Search, X } from 'lucide-react';
import { useShop } from '../context/useShop';
import { useAuth } from '../context/useAuth';
import { DupeSuccessModal } from './DupeSuccessModal';
import { ProductArtwork } from './ProductArtwork';
import {
  MAX_REALISTIC_PRICE_EUR,
  MAX_REALISTIC_PRICE_INPUT,
  PRICE_DECIMAL_MESSAGE,
  PRICE_VALIDATION_MESSAGE,
  formatPriceDisplay,
  isDisplayablePrice,
  isPriceInputFormatAllowed,
  normalizePriceInput,
  parsePriceValue,
  validateRealisticPrice,
} from '../utils/pricing';

export const DupeSuggestModal = ({
  isOpen,
  onClose,
  dupeProduct: dupeProductProp,
  currentProduct,
  searchProducts = async () => [],
  onSuccess,
  onViewFeed,
}) => {
  const dupeProduct = dupeProductProp || currentProduct;
  const { createDupeLink } = useShop();
  const { currentUser, requireAuth } = useAuth();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedOriginal, setSelectedOriginal] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [missingOriginalPrice, setMissingOriginalPrice] = useState('');
  const [missingOriginalPriceError, setMissingOriginalPriceError] = useState('');
  const [submittedDupe, setSubmittedDupe] = useState(null);
  const [swapped, setSwapped] = useState(false);

  const resetState = useCallback(() => {
    setQuery('');
    setSearchResults([]);
    setSelectedOriginal(null);
    setIsSearching(false);
    setIsSubmitting(false);
    setError('');
    setMissingOriginalPrice('');
    setMissingOriginalPriceError('');
    setSubmittedDupe(null);
    setSwapped(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);

  useEffect(() => {
    if (!isOpen || selectedOriginal || query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let isActive = true;
    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true);
      setError('');

      try {
        const results = await searchProducts(query.trim());

        if (!isActive) {
          return;
        }

        setSearchResults(
          (results || []).filter((product) => product?.id && product.id !== dupeProduct?.id)
        );
      } catch (searchError) {
        if (isActive) {
          setError(searchError?.message || 'Die Produktsuche hat nicht funktioniert.');
          setSearchResults([]);
        }
      } finally {
        if (isActive) {
          setIsSearching(false);
        }
      }
    }, 220);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [dupeProduct?.id, isOpen, query, searchProducts, selectedOriginal]);

  useEffect(() => {
    setMissingOriginalPrice('');
    setMissingOriginalPriceError('');
  }, [selectedOriginal?.id, swapped]);

  if (!isOpen || !dupeProduct) {
    return null;
  }

  // Role assignment: "original" is the expensive product, "dupeForLink" is the cheaper one.
  // By default the scanned product is the dupe; swapping reverses the roles.
  const originalInRole = swapped ? dupeProduct : selectedOriginal;
  const dupeInRole = swapped ? selectedOriginal : dupeProduct;

  const originalHasPrice = isDisplayablePrice(originalInRole?.price);
  const effectiveOriginalPrice = originalHasPrice
    ? parsePriceValue(originalInRole?.price)
    : parsePriceValue(missingOriginalPrice);

  const effectiveDupePrice = parsePriceValue(dupeInRole?.price);

  const savingsPercent =
    effectiveOriginalPrice > 0 && effectiveDupePrice > 0 && effectiveOriginalPrice > effectiveDupePrice
      ? Math.round(((effectiveOriginalPrice - effectiveDupePrice) / effectiveOriginalPrice) * 100)
      : null;

  const dupeIsExpensive =
    effectiveOriginalPrice > 0 && effectiveDupePrice > 0 && effectiveDupePrice > effectiveOriginalPrice;

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }

    onClose?.();
  };

  const handleSubmit = async () => {
    if (!selectedOriginal) {
      return;
    }

    if (!currentUser) {
      requireAuth(() => {});
      return;
    }

    if (!originalHasPrice) {
      const originalPriceValidation = validateRealisticPrice(missingOriginalPrice, { allowEmpty: false });

      if (!originalPriceValidation.isValid) {
        setMissingOriginalPriceError(originalPriceValidation.message);
        return;
      }
    }

    setIsSubmitting(true);
    setError('');

    try {
      const originalProductForLink = {
        ...originalInRole,
        price: originalHasPrice
          ? parsePriceValue(originalInRole.price)
          : parsePriceValue(missingOriginalPrice),
      };
      const createdDupe = await createDupeLink(originalProductForLink, dupeInRole);
      setSubmittedDupe(createdDupe);
      onSuccess?.(createdDupe);
    } catch (submitError) {
      setError(submitError?.message || 'Der Dupe-Link konnte nicht gespeichert werden.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewFeed = () => {
    onViewFeed?.(submittedDupe);
    onClose?.();
  };

  const handleMissingOriginalPriceChange = (event) => {
    const nextValue = normalizePriceInput(event.target.value);

    if (nextValue === '') {
      setMissingOriginalPrice('');
      setMissingOriginalPriceError('');
      return;
    }

    if (nextValue.startsWith('-')) {
      setMissingOriginalPrice(nextValue);
      setMissingOriginalPriceError(PRICE_VALIDATION_MESSAGE);
      return;
    }

    if (!isPriceInputFormatAllowed(nextValue)) {
      setMissingOriginalPriceError(PRICE_DECIMAL_MESSAGE);
      return;
    }

    setMissingOriginalPrice(nextValue);

    const parsedValue = parsePriceValue(nextValue);

    if (parsedValue !== null && parsedValue >= MAX_REALISTIC_PRICE_EUR) {
      setMissingOriginalPriceError(PRICE_VALIDATION_MESSAGE);
      return;
    }

    setMissingOriginalPriceError('');
  };

  if (submittedDupe) {
    return (
      <DupeSuccessModal
        isOpen={isOpen}
        initialMatchScore={submittedDupe.matchScore}
        onViewFeed={handleViewFeed}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-5">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative z-10 w-full max-w-md rounded-squircle bg-realbg p-6 shadow-2xl animate-pop-in">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
          aria-label="Modal schließen"
        >
          <X size={16} strokeWidth={2.5} />
        </button>

        <div className="mb-6 pr-10">
          <span className="mb-3 block text-4xl">🕵️</span>
          <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Welches Originalprodukt wird hier kopiert?
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Ein <strong className="text-slate-700">Dupe</strong> ist eine günstigere Alternative, die genauso gut schmeckt wie das teurere Original – der echte Community-Geheimtipp. Das gescannte Produkt ist standardmäßig der günstige Dupe. Suche das teurere Original darunter.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-squircle border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        {!selectedOriginal ? (
          <>
            <div className="relative mb-4">
              <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Originalprodukt suchen"
                className="w-full rounded-squircle border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-realgreen focus:outline-none focus:ring-4 focus:ring-realgreen/10"
                autoFocus
              />
            </div>

            <div className="rounded-squircle border border-slate-200/80 bg-white p-2 shadow-sm">
              {query.trim().length < 2 ? (
                <div className="px-3 py-6 text-center text-sm text-slate-400">
                  Gib mindestens 2 Zeichen ein, um passende Originale zu finden.
                </div>
              ) : isSearching ? (
                <div className="flex justify-center py-6">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-slate-400">
                  Kein passendes Original gefunden.
                </div>
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto p-1">
                  {searchResults.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => setSelectedOriginal(product)}
                      className="flex w-full items-center gap-3 rounded-squircle border border-transparent px-3 py-3 text-left transition-colors hover:border-emerald-100 hover:bg-emerald-50/60"
                    >
                      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-[1.2rem] bg-[#F5F2EF] p-2">
                        <ProductArtwork
                          src={product.image}
                          alt={product.name}
                          name={product.name}
                          brand={product.brand}
                          category={product.category}
                          variant="card"
                          className="h-full w-full"
                          imageClassName="h-full w-full object-contain"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-semibold text-slate-900">{product.name}</p>
                        <div className="mt-1 flex items-center justify-between gap-3 text-xs text-slate-500">
                          <span className="truncate">{product.brand || 'Marke unbekannt'}</span>
                          <span className="whitespace-nowrap font-semibold text-emerald-700">
                            {formatPriceDisplay(product.price)}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            {/* Product comparison card */}
            <div className="rounded-squircle border border-slate-200 bg-white p-4 shadow-sm">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Dupe-Verknüpfung
              </p>

              <div className="flex items-center gap-2">
                {/* Dupe side */}
                <div className="flex w-[42%] flex-col items-center text-center">
                  <div className="mb-2 flex h-20 w-20 items-center justify-center overflow-hidden rounded-[1.4rem] bg-[#F5F2EF] p-2.5">
                    <ProductArtwork
                      src={dupeInRole.image}
                      alt={dupeInRole.name}
                      name={dupeInRole.name}
                      brand={dupeInRole.brand}
                      category={dupeInRole.category}
                      variant="card"
                      className="h-full w-full"
                      imageClassName="h-full w-full object-contain"
                    />
                  </div>
                  <span className="mb-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-700">
                    Dupe
                  </span>
                  <p className="line-clamp-2 text-xs font-semibold text-slate-900">{dupeInRole.name}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-emerald-700">
                    {formatPriceDisplay(dupeInRole.price)}
                  </p>
                </div>

                {/* Swap button + savings in the middle */}
                <div className="flex flex-1 flex-col items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSwapped((prev) => !prev)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 active:scale-95"
                    aria-label="Produkte tauschen"
                    title="Rollen tauschen"
                  >
                    <ArrowLeftRight size={16} strokeWidth={2} />
                  </button>

                  {savingsPercent !== null && (
                    <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-black text-white shadow-sm">
                      {savingsPercent}% günstiger
                    </span>
                  )}

                  {dupeIsExpensive && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-semibold text-amber-700">
                      Rollen tauschen?
                    </span>
                  )}
                </div>

                {/* Original side */}
                <div className="flex w-[42%] flex-col items-center text-center">
                  <div className="mb-2 flex h-20 w-20 items-center justify-center overflow-hidden rounded-[1.4rem] bg-[#F5F2EF] p-2.5">
                    <ProductArtwork
                      src={originalInRole.image}
                      alt={originalInRole.name}
                      name={originalInRole.name}
                      brand={originalInRole.brand}
                      category={originalInRole.category}
                      variant="card"
                      className="h-full w-full"
                      imageClassName="h-full w-full object-contain"
                    />
                  </div>
                  <span className="mb-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Original
                  </span>
                  <p className="line-clamp-2 text-xs font-semibold text-slate-900">{originalInRole.name}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                    {formatPriceDisplay(effectiveOriginalPrice)}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-center text-[11px] text-slate-400">
                Tippe auf <ArrowLeftRight size={10} className="inline" /> um die Rollen zu tauschen
              </p>
            </div>

            {/* Missing original price input */}
            {!originalHasPrice && (
              <div className="rounded-squircle border border-amber-200 bg-amber-50 px-4 py-3.5">
                <label className="block text-sm font-semibold text-amber-900" htmlFor="missing-original-price">
                  Preis für das Original fehlt – bitte nachtragen (ca.):
                </label>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm font-bold text-amber-900">€</span>
                  <input
                    id="missing-original-price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={MAX_REALISTIC_PRICE_INPUT}
                    inputMode="decimal"
                    value={missingOriginalPrice}
                    onChange={handleMissingOriginalPriceChange}
                    placeholder="z.B. 3,49"
                    className="w-full rounded-xl border border-amber-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-100"
                  />
                </div>
                {missingOriginalPriceError && (
                  <p className="mt-2 text-xs font-medium text-red-500">{missingOriginalPriceError}</p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedOriginal(null)}
                className="flex-1 rounded-squircle border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                Andere Suche
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-[1.35] rounded-squircle bg-realgreen px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Wird eingetragen...' : 'Ja, als Dupe eintragen!'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};