import { useEffect, useState } from 'react';
import { Flag, MessageSquareText, X } from 'lucide-react';
import { ProductArtwork } from './ProductArtwork';
import { ReportModal } from './ReportModal';
import { StarRating } from './StarRating';
import { useShop } from '../context/useShop';
import { useAuth } from '../context/useAuth';
import { formatTimeAgo, getAvatarUrl } from '../utils/formatters';

export const ProductDetailModal = ({
  isOpen,
  product,
  onClose,
  onWriteReview,
}) => {
  const { getProductReviews, setCurrentProduct } = useShop();
  const { requireAuth, currentUser } = useAuth();
  const [reviewItems, setReviewItems] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [reportingReviewId, setReportingReviewId] = useState(null);
  const [hiddenReviewIds, setHiddenReviewIds] = useState([]);
  const [reportToast, setReportToast] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setHiddenReviewIds([]);
      setReportingReviewId(null);
      setReportToast('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!reportToast) return undefined;
    const timeoutId = window.setTimeout(() => setReportToast(''), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [reportToast]);

  const handleReported = (reviewId) => {
    setHiddenReviewIds((prev) => (prev.includes(reviewId) ? prev : [...prev, reviewId]));
    setReportToast('Danke für deine Meldung. Wir prüfen das.');
  };

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !product?.id) {
      setReviewItems([]);
      setLastDoc(null);
      setHasMore(false);
      setIsLoading(false);
      setIsLoadingMore(false);
      setLoadError('');
      return;
    }

    let isActive = true;

    const loadInitialReviews = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const result = await getProductReviews(product.id);

        if (!isActive) {
          return;
        }

        setReviewItems(result.reviews);
        setLastDoc(result.lastVisibleDoc);
        setHasMore(result.hasMore);
      } catch (error) {
        if (isActive) {
          console.error('Fehler beim Laden der Produktreviews:', error);
          setReviewItems([]);
          setLastDoc(null);
          setHasMore(false);
          setLoadError('Die Community-Meinungen konnten gerade nicht geladen werden.');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadInitialReviews();

    return () => {
      isActive = false;
    };
  }, [getProductReviews, isOpen, product?.id]);

  const handleLoadMore = async () => {
    if (!product?.id || !lastDoc || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);

    try {
      const result = await getProductReviews(product.id, lastDoc);
      setReviewItems((prevItems) => [...prevItems, ...result.reviews]);
      setLastDoc(result.lastVisibleDoc);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('Fehler beim Nachladen der Produktreviews:', error);
      setHasMore(false);
      setLoadError('Weitere Reviews konnten gerade nicht geladen werden.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleWriteReview = () => {
    requireAuth(() => {
      setCurrentProduct(product);
      onClose?.();
      onWriteReview?.();
    });
  };

  // Use the authoritative running average stored in Firestore, not a
  // recalculation from the current (paginated) subset of reviews.
  const averageRating = product?.averageRating || 0;
  const totalReviewCount = product?.reviewCount || 0;
  const metaLine = [product?.brand, product?.store].filter(Boolean).join(' • ');

  if (!isOpen || !product) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] bg-[#FDFDFD] shadow-[0_35px_90px_rgba(15,23,42,0.28)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm transition-colors hover:bg-white hover:text-slate-700"
          aria-label="Produktdetails schließen"
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        <div className="overflow-y-auto">
          <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,#d1fae5,transparent_35%),linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-5 pb-6 pt-6 sm:px-7 sm:pb-7 sm:pt-7">
            <div className="mx-auto flex max-w-2xl flex-col gap-6 sm:flex-row sm:items-end">
              <div className="mx-auto w-full max-w-sm flex-shrink-0 sm:mx-0 sm:w-64">
                <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/70 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm">
                  <div className="aspect-[4/3] overflow-hidden rounded-[1.6rem] bg-[#F5F2EF]">
                    <ProductArtwork
                      src={product.image}
                      alt={product.name}
                      name={product.name}
                      brand={product.brand}
                      category={product.category}
                      variant="hero"
                      className="h-full w-full"
                      imageClassName="h-full w-full object-contain"
                    />
                  </div>
                </div>
              </div>

              <div className="flex-1">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 shadow-sm backdrop-blur-sm">
                  <MessageSquareText size={14} />
                  Community Spotlight
                </div>

                <h2 className="mt-4 text-3xl font-black leading-tight text-slate-900 sm:text-4xl" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {product.name || 'Unbekanntes Produkt'}
                </h2>

                <p className="mt-2 text-sm font-medium text-slate-500 sm:text-base">
                  {metaLine || 'Entdeckt und diskutiert von der Community'}
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-4 rounded-squircle border border-slate-200/80 bg-white/85 px-4 py-3 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-black text-slate-900">
                      {totalReviewCount > 0 ? averageRating.toFixed(1) : 'Neu'}
                    </span>
                    <div>
                      <StarRating rating={averageRating} size={18} />
                      <p className="mt-1 text-xs font-medium text-slate-500">
                        {totalReviewCount > 0
                          ? `${totalReviewCount} Bewertung${totalReviewCount === 1 ? '' : 'en'}`
                          : 'Noch keine Bewertungen'}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleWriteReview}
                  className="mt-6 inline-flex min-h-14 items-center justify-center rounded-squircle bg-realgreen px-6 py-4 text-base font-bold text-white shadow-[0_18px_35px_rgba(16,185,129,0.24)] transition-all hover:-translate-y-0.5 hover:brightness-105"
                >
                  Eigene Bewertung schreiben ✍️
                </button>
              </div>
            </div>
          </div>

          <div className="px-5 pb-8 pt-6 sm:px-7">
            <div className="mb-5 flex items-center gap-3">
              <h3 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Das sagt die Community
              </h3>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {loadError ? (
              <div className="rounded-squircle border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                {loadError}
              </div>
            ) : null}

            {isLoading ? (
              <div className="flex justify-center py-14">
                <div className="h-9 w-9 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              </div>
            ) : reviewItems.filter((r) => !hiddenReviewIds.includes(r.id)).length === 0 ? (
              <div className="rounded-squircle border border-slate-200/80 bg-white px-6 py-10 text-center shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Noch hat niemand dieses Produkt probiert. Sei der Erste und sag der Community, ob es sich lohnt!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviewItems.filter((r) => !hiddenReviewIds.includes(r.id)).map((review) => (
                  <article
                    key={review.id}
                    className="relative rounded-squircle border border-slate-100/80 bg-white p-4 shadow-[0_8px_22px_rgba(15,23,42,0.05)]"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3 pr-8">
                      <div className="flex min-w-0 items-center gap-3">
                        <img
                          src={getAvatarUrl(review)}
                          alt={review.userName || 'Foodie'}
                          className="h-11 w-11 rounded-full bg-slate-100 object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {review.userName || 'Foodie'}
                          </p>
                          <div className="mt-1"><StarRating rating={review.rating} size={15} /></div>
                        </div>
                      </div>

                      <span className="flex-shrink-0 text-xs font-medium text-slate-400">
                        {formatTimeAgo(review.createdAt)}
                      </span>
                    </div>

                    <p className="text-sm leading-relaxed text-slate-700">
                      {review.comment?.trim() || 'Kein Kommentar hinterlassen.'}
                    </p>

                    {currentUser ? (
                      <button
                        type="button"
                        onClick={() => setReportingReviewId(review.id)}
                        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
                        aria-label="Bewertung melden"
                      >
                        <Flag size={15} strokeWidth={2} />
                      </button>
                    ) : null}
                  </article>
                ))}

                {hasMore ? (
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className="inline-flex rounded-squircle border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoadingMore ? 'Lädt...' : 'Weitere 5 laden'}
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <ReportModal
          isOpen={Boolean(reportingReviewId)}
          reviewId={reportingReviewId}
          onClose={() => setReportingReviewId(null)}
          onReported={handleReported}
        />

        {reportToast ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex justify-center px-5">
            <div className="pointer-events-auto rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-lg">
              {reportToast}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};