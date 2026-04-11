import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Search, X } from 'lucide-react';
import { useShop } from '../context/useShop';
import { useAuth } from '../context/useAuth';

const formatPrice = (price) => {
  if (typeof price !== 'number' || Number.isNaN(price)) {
    return 'Preis folgt';
  }

  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
};

export const DupeSuggestModal = ({
  isOpen,
  onClose,
  dupeProduct,
  searchProducts = async () => [],
  onSuccess,
}) => {
  const { createDupeLink } = useShop();
  const { currentUser, requireAuth } = useAuth();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedOriginal, setSelectedOriginal] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const resetState = useCallback(() => {
    setQuery('');
    setSearchResults([]);
    setSelectedOriginal(null);
    setIsSearching(false);
    setIsSubmitting(false);
    setError('');
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

  if (!isOpen || !dupeProduct) {
    return null;
  }

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

    setIsSubmitting(true);
    setError('');

    try {
      const createdDupe = await createDupeLink(selectedOriginal, dupeProduct);
      onSuccess?.(createdDupe);
      handleClose();
    } catch (submitError) {
      setError(submitError?.message || 'Der Dupe-Link konnte nicht gespeichert werden.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
            Suche das Original, bestätige die Verknüpfung und wir legen den Dupe-Link direkt an.
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
                        <img
                          src={product.image || 'https://placehold.co/200x200?text=Original'}
                          alt={product.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-semibold text-slate-900">{product.name}</p>
                        <div className="mt-1 flex items-center justify-between gap-3 text-xs text-slate-500">
                          <span className="truncate">{product.brand || 'Marke unbekannt'}</span>
                          <span className="whitespace-nowrap font-semibold text-emerald-700">
                            {formatPrice(product.price)}
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
          <div className="space-y-5">
            <div className="rounded-squircle border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-4 text-sm font-semibold text-slate-500">Du verknüpfst:</p>

              <div className="flex items-center justify-between gap-3">
                <div className="flex w-[42%] flex-col items-center text-center">
                  <div className="mb-3 flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.5rem] bg-[#F5F2EF] p-3">
                    <img
                      src={dupeProduct.image || 'https://placehold.co/200x200?text=Dupe'}
                      alt={dupeProduct.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <span className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">
                    DUPE
                  </span>
                  <p className="line-clamp-2 text-sm font-semibold text-slate-900">{dupeProduct.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatPrice(dupeProduct.price)}</p>
                </div>

                <div className="flex flex-col items-center gap-2 text-emerald-500">
                  <ArrowRight size={22} strokeWidth={2.5} />
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
                    LINK
                  </span>
                </div>

                <div className="flex w-[42%] flex-col items-center text-center">
                  <div className="mb-3 flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.5rem] bg-[#F5F2EF] p-3">
                    <img
                      src={selectedOriginal.image || 'https://placehold.co/200x200?text=Original'}
                      alt={selectedOriginal.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <span className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                    ORIGINAL
                  </span>
                  <p className="line-clamp-2 text-sm font-semibold text-slate-900">{selectedOriginal.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatPrice(selectedOriginal.price)}</p>
                </div>
              </div>
            </div>

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