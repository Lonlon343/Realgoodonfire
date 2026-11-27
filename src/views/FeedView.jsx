import { useCallback, useEffect, useRef, useState } from 'react';
import { Flag, MessageSquare, RefreshCw } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { ProductDetailModal } from '../components/ProductDetailModal';
import { ReportModal } from '../components/ReportModal';
import { StarRating } from '../components/StarRating';
import { StoreFilterChips } from '../components/StoreFilterChips';
import { useShop } from '../context/useShop';
import { useAuth } from '../context/useAuth';
import { STORE_FILTERS, normalizeStoreName } from '../data';
import { formatTimeAgo } from '../utils/formatters';

const FEED_LOAD_ERROR = 'Der Feed konnte nicht geladen werden. Prüfe deine Verbindung.';
const FEED_LOAD_MORE_ERROR = 'Weitere Bewertungen konnten nicht geladen werden.';

export const FeedView = ({ onTabChange }) => {
  const { getFeedActivity } = useShop();
  const { currentUser } = useAuth();
  const [feedItems, setFeedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [detailProduct, setDetailProduct] = useState(null);
  const [activeStore, setActiveStore] = useState('Alle');
  const [reportingReviewId, setReportingReviewId] = useState(null);
  const [hiddenReviewIds, setHiddenReviewIds] = useState([]);
  const [reportToast, setReportToast] = useState('');
  const [loadError, setLoadError] = useState('');
  const [loadMoreError, setLoadMoreError] = useState('');
  // Incremented for every fresh load; answers of older requests are ignored.
  const requestIdRef = useRef(0);

  const openProductDetail = (review) => {
    if (!review?.productId) return;

    setDetailProduct({
      id: review.productId,
      name: review.productName || 'Unbekanntes Produkt',
      brand: review.brand || '',
      image: review.image || '',
      category: review.category || '',
      price: review.price ?? null,
      store: review.store || null,
      reviewCount: review.reviewCount || 0,
    });
  };

  // Reload from the top whenever the store filter changes
  const loadFeed = useCallback(async (store) => {
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;

    setIsLoading(true);
    setLoadError('');
    setLoadMoreError('');
    setFeedItems([]);
    setLastDoc(null);
    setHasMore(true);

    try {
      const { reviews, lastVisibleDoc } = await getFeedActivity(null, store);
      if (requestId !== requestIdRef.current) return;
      setFeedItems(reviews);
      setLastDoc(lastVisibleDoc);
      setHasMore(reviews.length === 15 && Boolean(lastVisibleDoc));
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      console.error('Fehler beim Laden des Community-Feeds:', error);
      setFeedItems([]);
      setLastDoc(null);
      setHasMore(false);
      setLoadError(FEED_LOAD_ERROR);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [getFeedActivity]);

  useEffect(() => {
    loadFeed(activeStore);
  }, [activeStore, loadFeed]);

  const handleLoadMore = async () => {
    if (!lastDoc || isLoading) return;

    // A filter change starts a new request id; this answer is then dropped.
    const requestId = requestIdRef.current;
    setIsLoading(true);
    setLoadMoreError('');

    try {
      const { reviews, lastVisibleDoc } = await getFeedActivity(lastDoc, activeStore);
      if (requestId !== requestIdRef.current) return;
      setFeedItems((prev) => [...prev, ...reviews]);
      setLastDoc(lastVisibleDoc);
      setHasMore(reviews.length === 15 && Boolean(lastVisibleDoc));
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      console.error('Fehler beim Nachladen des Feeds:', error);
      setLoadMoreError(FEED_LOAD_MORE_ERROR);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  };

  const handleStoreChange = (store) => {
    setActiveStore(store);
  };

  const handleReported = (reviewId) => {
    setHiddenReviewIds((prev) => (prev.includes(reviewId) ? prev : [...prev, reviewId]));
    setReportToast('Danke für deine Meldung. Wir prüfen das.');
  };

  useEffect(() => {
    if (!reportToast) return undefined;
    const timeoutId = window.setTimeout(() => setReportToast(''), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [reportToast]);

  const visibleFeedItems = feedItems.filter((item) => !hiddenReviewIds.includes(item.id));

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-32">
      <div className="sticky top-0 z-20 border-b border-slate-200/70 bg-[#FDFDFD]/85 backdrop-blur-md">
        <div className="px-5 py-4">
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Community Feed <MessageSquare size={20} className="inline-block align-middle ml-1 text-realgreen" strokeWidth={1.8} />
          </h1>

          <StoreFilterChips
            stores={STORE_FILTERS}
            activeStore={activeStore}
            onChange={handleStoreChange}
            className="mt-4"
          />
        </div>
      </div>

      <div className="px-5 pt-5">
        {loadError ? (
          <div className="rounded-squircle border border-red-100 bg-white px-6 py-10 text-center shadow-sm" role="alert">
            <p className="text-sm font-medium text-red-600">{loadError}</p>
            <button
              type="button"
              onClick={() => loadFeed(activeStore)}
              className="mt-4 inline-flex items-center gap-2 rounded-squircle border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-realgreen transition-all hover:border-emerald-300 hover:bg-emerald-100/80"
            >
              <RefreshCw size={15} strokeWidth={2} />
              Nochmal versuchen
            </button>
          </div>
        ) : isLoading && feedItems.length === 0 ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          </div>
        ) : visibleFeedItems.length === 0 ? (
          <div className="rounded-squircle border border-slate-200/70 bg-white px-6 py-10 text-center shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              {activeStore === 'Alle'
                ? 'Noch ist es ruhig hier. Schnapp dir den Scanner und mach den Anfang! 🍔'
                : `Noch keine Reviews von ${activeStore}. Sei der Erste!`}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {visibleFeedItems.map((review) => (
                <div
                  key={review.id}
                  className="relative rounded-squircle border border-slate-100/80 bg-white p-4 shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => openProductDetail(review)}
                    className="block w-full text-left"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3 pr-8">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar
                          name={review.userName}
                          src={review.userAvatar}
                          className="h-11 w-11 flex-shrink-0 rounded-full"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {review.userName || 'Foodie'}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <p className="text-xs text-slate-500">
                              hat <span className="font-semibold text-slate-700">{review.productName || 'ein Produkt'}</span> bewertet
                            </p>
                            {review.store ? (
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                {normalizeStoreName(review.store)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <span className="flex-shrink-0 text-xs font-medium text-slate-400">
                        {formatTimeAgo(review.createdAt)}
                      </span>
                    </div>

                    <div className="mb-3">
                      <StarRating rating={review.rating} size={15} strokeWidth={1.8} />
                    </div>

                    <p className="text-sm leading-relaxed text-slate-700">
                      {review.comment?.trim() || 'Kein Kommentar hinterlassen.'}
                    </p>
                  </button>

                  {currentUser ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setReportingReviewId(review.id);
                      }}
                      className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
                      aria-label="Bewertung melden"
                    >
                      <Flag size={15} strokeWidth={2} />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="pt-6 text-center">
                {loadMoreError ? (
                  <p className="mb-2 text-xs font-medium text-red-600" role="alert">{loadMoreError}</p>
                ) : null}
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="text-sm font-semibold text-realgreen transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? 'Lädt …' : loadMoreError ? 'Nochmal versuchen' : 'Weitere laden'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <ProductDetailModal
        isOpen={Boolean(detailProduct)}
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
        onWriteReview={() => {
          setDetailProduct(null);
          onTabChange?.('rate');
        }}
      />

      <ReportModal
        isOpen={Boolean(reportingReviewId)}
        reviewId={reportingReviewId}
        onClose={() => setReportingReviewId(null)}
        onReported={handleReported}
      />

      {reportToast ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[150] flex justify-center px-5">
          <div className="pointer-events-auto rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-lg">
            {reportToast}
          </div>
        </div>
      ) : null}
    </div>
  );
};
