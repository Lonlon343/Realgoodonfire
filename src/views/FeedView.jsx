import { useCallback, useEffect, useState } from 'react';
import { ProductDetailModal } from '../components/ProductDetailModal';
import { StarRating } from '../components/StarRating';
import { StoreFilterChips } from '../components/StoreFilterChips';
import { useShop } from '../context/useShop';
import { STORE_FILTERS, normalizeStoreName } from '../data';
import { formatTimeAgo, getAvatarUrl } from '../utils/formatters';

export const FeedView = ({ onTabChange }) => {
  const { getFeedActivity } = useShop();
  const [feedItems, setFeedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [detailProduct, setDetailProduct] = useState(null);
  const [activeStore, setActiveStore] = useState('Alle');

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
    setIsLoading(true);
    setFeedItems([]);
    setLastDoc(null);
    setHasMore(true);

    try {
      const { reviews, lastVisibleDoc } = await getFeedActivity(null, store);
      setFeedItems(reviews);
      setLastDoc(lastVisibleDoc);
      setHasMore(reviews.length === 15 && Boolean(lastVisibleDoc));
    } catch (error) {
      console.error('Fehler beim Laden des Community-Feeds:', error);
      setFeedItems([]);
      setLastDoc(null);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [getFeedActivity]);

  useEffect(() => {
    loadFeed(activeStore);
  }, [activeStore, loadFeed]);

  const handleLoadMore = async () => {
    if (!lastDoc || isLoading) return;

    setIsLoading(true);

    try {
      const { reviews, lastVisibleDoc } = await getFeedActivity(lastDoc, activeStore);
      setFeedItems((prev) => [...prev, ...reviews]);
      setLastDoc(lastVisibleDoc);
      setHasMore(reviews.length === 15 && Boolean(lastVisibleDoc));
    } catch (error) {
      console.error('Fehler beim Nachladen des Feeds:', error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStoreChange = (store) => {
    setActiveStore(store);
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-32">
      <div className="sticky top-0 z-20 border-b border-slate-200/70 bg-[#FDFDFD]/85 backdrop-blur-md">
        <div className="px-5 py-4">
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Community Feed 💬
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
        {isLoading && feedItems.length === 0 ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          </div>
        ) : feedItems.length === 0 ? (
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
              {feedItems.map((review) => (
                <button
                  key={review.id}
                  type="button"
                  onClick={() => openProductDetail(review)}
                  className="w-full rounded-squircle border border-slate-100/80 bg-white p-4 text-left shadow-sm"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <img
                        src={getAvatarUrl(review)}
                        alt={review.userName || 'Foodie'}
                        className="h-11 w-11 rounded-full object-cover bg-slate-100"
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
              ))}
            </div>

            {hasMore && (
              <div className="pt-6 text-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="text-sm font-semibold text-realgreen transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? 'Lädt...' : 'Weitere laden'}
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
    </div>
  );
};
