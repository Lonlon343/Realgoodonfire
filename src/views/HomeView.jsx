import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Flame, ArrowRightLeft, PencilLine, Star, ThumbsDown, ThumbsUp, User } from 'lucide-react';
import { ProductDetailModal } from '../components/ProductDetailModal';
import { ProductArtwork } from '../components/ProductArtwork';
import { useShop } from '../context/useShop';
import { useAuth } from '../context/useAuth';
import { formatPriceDisplay, isDisplayablePrice, parsePriceValue } from '../utils/pricing';

export const HomeView = ({ onTabChange }) => {
  const {
    getTrendingProducts,
    loadHomeData,
    newestProducts,
    subscribeTopDupes,
    topDupes,
    recentReviews,
    isLoadingHome,
    voteOnDupe,
  } = useShop();
  const { currentUser: user, logout, setIsLoginModalOpen, clearAuthError, requireAuth } = useAuth();
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [votingState, setVotingState] = useState({});
  const [detailProduct, setDetailProduct] = useState(null);
  const dupeCardRefs = useRef(new Map());
  const previousDupePositions = useRef(new Map());

  useEffect(() => {
    const loadTrending = async () => {
      setIsLoading(true);
      try {
        const trending = await getTrendingProducts?.() || [];
        setTrendingProducts(trending);
      } catch (error) {
        console.error('Fehler beim Laden von Trending Products:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadTrending();
  }, [getTrendingProducts]);

  useEffect(() => {
    const loadHomeSections = async () => {
      try {
        await loadHomeData();
      } catch (error) {
        console.error('Fehler beim Laden der Home-Sektionen:', error);
      }
    };

    loadHomeSections();
  }, [loadHomeData]);

  useEffect(() => {
    const unsubscribe = subscribeTopDupes?.();

    return () => {
      unsubscribe?.();
    };
  }, [subscribeTopDupes]);

  useLayoutEffect(() => {
    const nextPositions = new Map();

    topDupes.forEach((dupe) => {
      const cardElement = dupeCardRefs.current.get(dupe.id);

      if (!cardElement) {
        return;
      }

      const nextRect = cardElement.getBoundingClientRect();
      const previousRect = previousDupePositions.current.get(dupe.id);

      nextPositions.set(dupe.id, nextRect);

      if (!previousRect) {
        return;
      }

      const deltaY = previousRect.top - nextRect.top;

      if (Math.abs(deltaY) < 1 || typeof cardElement.animate !== 'function') {
        return;
      }

      cardElement.animate(
        [
          {
            transform: `translateY(${deltaY}px) scale(0.985)`,
            boxShadow: '0 22px 40px rgba(16, 185, 129, 0.12)',
          },
          {
            transform: 'translateY(0) scale(1)',
            boxShadow: 'inset 0px 2px 4px rgba(0,0,0,0.02)',
          },
        ],
        {
          duration: 420,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }
      );
    });

    previousDupePositions.current = nextPositions;
  }, [topDupes]);

  const renderPremiumStars = (rating) => {
    const normalizedRating = Math.round(rating || 0);

    return (
      <div className="flex gap-[2px]">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={14}
            className={i < normalizedRating ? 'fill-emerald-500 text-emerald-500' : 'text-slate-200'}
            strokeWidth={1.5}
          />
        ))}
      </div>
    );
  };

  const formatTimeAgo = (timestamp) => {
    const date = timestamp?.toDate?.() || (timestamp instanceof Date ? timestamp : null);

    if (!date) return 'gerade eben';

    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

    if (diffMinutes < 1) return 'gerade eben';
    if (diffMinutes < 60) return `vor ${diffMinutes} Min.`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `vor ${diffHours} Std.`;

    const diffDays = Math.floor(diffHours / 24);
    return `vor ${diffDays} Tag${diffDays === 1 ? '' : 'en'}`;
  };

  const getReviewPreview = (comment) => {
    const trimmedComment = comment?.trim() || '';

    if (!trimmedComment) {
      return 'Noch ohne Kommentar.';
    }

    return trimmedComment.length > 60
      ? `${trimmedComment.slice(0, 60).trim()}...`
      : trimmedComment;
  };

  const getReviewAvatar = (review) => {
    if (review.userAvatar) {
      return review.userAvatar;
    }

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(review.userName || 'Foodie')}&background=f8f9fa&color=333`;
  };

  const getVoteButtonClasses = (type, isActive, isBusy) => {
    const activeClasses = type === 'up'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-[#F1C7B8] bg-[#FDE7DE] text-[#B45309]';
    const idleClasses = type === 'up'
      ? 'border-transparent text-slate-500 hover:border-emerald-100 hover:bg-emerald-50/80 hover:text-emerald-700'
      : 'border-transparent text-slate-500 hover:border-[#F1C7B8] hover:bg-[#FDE7DE]/80 hover:text-[#B45309]';

    return [
      'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors',
      isActive ? activeClasses : idleClasses,
      isBusy ? 'cursor-wait opacity-60' : '',
    ].join(' ');
  };

  const handleDupeVote = (dupeId, type) => {
    requireAuth(async () => {
      if (votingState[dupeId]) {
        return;
      }

      setVotingState((prevState) => ({
        ...prevState,
        [dupeId]: type,
      }));

      try {
        await voteOnDupe(dupeId, type);
      } catch (error) {
        console.error('Fehler beim Dupe-Vote:', error);
        alert(error?.message || 'Dein Vote konnte nicht gespeichert werden.');
      } finally {
        setVotingState((prevState) => {
          const nextState = { ...prevState };
          delete nextState[dupeId];
          return nextState;
        });
      }
    });
  };

  const openProductDetail = (product) => {
    if (!product?.id) {
      return;
    }

    setDetailProduct(product);
  };

  const closeProductDetail = () => {
    setDetailProduct(null);
  };

  const buildReviewProduct = (review) => ({
    id: review.productId,
    name: review.productName || 'Unbekanntes Produkt',
    brand: review.brand || '',
    image: review.image || '',
    category: review.category || '',
    price: review.price ?? null,
    store: review.store || null,
  });

  const buildDupeProduct = (item, type) => type === 'original'
    ? {
        id: item.originalId,
        name: item.originalName || 'Unbekanntes Produkt',
        brand: item.originalBrand || '',
        image: item.originalImage || '',
        category: item.originalCategory || '',
        price: item.originalPrice ?? null,
      }
    : {
        id: item.dupeId,
        name: item.dupeName || 'Unbekanntes Produkt',
        brand: item.dupeBrand || '',
        image: item.dupeImage || '',
        category: item.dupeCategory || '',
        price: item.dupePrice ?? null,
      };

  const onPriceEditClick = (productType, currentPrice) => {
    window.prompt(
      'Stimmt der Preis nicht? Neuen Preis vorschlagen:',
      isDisplayablePrice(currentPrice) ? parsePriceValue(currentPrice).toFixed(2) : ''
    );
  };

  const renderEditablePrice = (productType, price, toneClassName) => {
    const hasPrice = isDisplayablePrice(price);

    return (
      <button
        type="button"
        onClick={() => onPriceEditClick(productType, price)}
        className={[
          'group inline-flex items-center gap-1 border-b border-dotted pb-0.5 text-sm font-bold transition-colors',
          hasPrice ? `${toneClassName} border-current/35 hover:border-current/70` : 'border-slate-300 text-slate-400 hover:border-slate-400 hover:text-slate-600',
        ].join(' ')}
        title={`Preis für ${productType} vorschlagen`}
      >
        <span>{formatPriceDisplay(price)}</span>
        <PencilLine size={11} className="opacity-0 transition-opacity group-hover:opacity-100" />
      </button>
    );
  };

  const setDupeCardRef = (dupeId, node) => {
    if (node) {
      dupeCardRefs.current.set(dupeId, node);
      return;
    }

    dupeCardRefs.current.delete(dupeId);
    previousDupePositions.current.delete(dupeId);
  };

  const renderNewestSkeletons = () => (
    <div className="grid grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={`newest-skeleton-${index}`} className="squircle overflow-hidden border border-slate-100/70 bg-white shadow-sm animate-pulse">
          <div className="h-36 bg-slate-100" />
          <div className="space-y-3 p-3.5">
            <div className="h-4 rounded-full bg-slate-100" />
            <div className="flex items-center justify-between gap-2">
              <div className="h-4 w-16 rounded-full bg-slate-100" />
              <div className="h-4 w-14 rounded-full bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderDupeSkeletons = () => (
    <div className="space-y-4">
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={`dupe-skeleton-${index}`} className="squircle border border-slate-200/50 bg-[#F3F4F6] p-5 animate-pulse">
          <div className="mb-6 flex items-center justify-between relative">
            <div className="flex w-2/5 flex-col items-center">
              <div className="mb-2 h-[72px] w-[72px] rounded-[1.1rem] bg-white" />
              <div className="mb-1 h-3 w-14 rounded-full bg-slate-200" />
              <div className="mb-1 h-4 w-20 rounded-full bg-slate-200" />
              <div className="h-4 w-12 rounded-full bg-slate-200" />
            </div>
            <div className="absolute left-1/2 top-4 flex -translate-x-1/2 flex-col items-center">
              <div className="mb-2 h-5 w-5 rounded-full bg-slate-200" />
              <div className="h-4 w-14 rounded-full bg-slate-200" />
            </div>
            <div className="flex w-2/5 flex-col items-center">
              <div className="mb-2 h-[72px] w-[72px] rounded-[1.1rem] bg-white" />
              <div className="mb-1 h-3 w-16 rounded-full bg-slate-200" />
              <div className="mb-1 h-4 w-20 rounded-full bg-slate-200" />
              <div className="h-4 w-12 rounded-full bg-slate-200" />
            </div>
          </div>

          <div className="squircle flex items-center justify-between bg-white px-5 py-3.5 shadow-sm">
            <div className="space-y-2">
              <div className="h-3 w-24 rounded-full bg-slate-100" />
              <div className="h-4 w-20 rounded-full bg-slate-100" />
            </div>
            <div className="space-y-2 text-right">
              <div className="h-4 w-12 rounded-full bg-slate-100" />
              <div className="h-3 w-16 rounded-full bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderRecentReviewSkeletons = () => (
    <div className="space-y-4">
      {Array.from({ length: 2 }).map((_, index) => (
        <div
          key={`recent-review-skeleton-${index}`}
          className="squircle border border-slate-100 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] animate-pulse"
        >
          <div className="flex gap-4">
            <div className="h-12 w-12 rounded-full bg-slate-100 shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="h-4 w-28 rounded-full bg-slate-100" />
                <div className="h-3 w-14 rounded-full bg-slate-100" />
              </div>
              <div className="h-3 w-32 rounded-full bg-slate-100" />
              <div className="h-4 w-20 rounded-full bg-slate-100" />
              <div className="h-4 w-full rounded-full bg-slate-100" />
              <div className="h-4 w-4/5 rounded-full bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const handleHeaderAuthClick = async () => {
    if (!user) {
      clearAuthError();
      setIsLoginModalOpen(true);
      return;
    }

    const shouldLogout = window.confirm('Möchtest du dich abmelden?');
    if (shouldLogout) {
      await logout();
    }
  };

  const handleWriteReviewFromDetail = () => {
    setDetailProduct(null);
    onTabChange('rate');
  };

  return (
    <div className="pb-32 bg-[#FDFDFD] font-sans antialiased min-h-screen">

      {/* Header Area */}
      <div className="px-5 pt-8 animate-slide-up">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <img src="/RealGoodLogo.svg" alt="" aria-hidden="true" className="h-20 w-20" />
            <h1 className="text-3xl font-black text-realgreen tracking-tight italic" style={{ fontFamily: 'Poppins, sans-serif' }}>
              RealGood
            </h1>
          </div>
          {!user ? (
            <button
              type="button"
              onClick={handleHeaderAuthClick}
              className="rounded-squircle border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-realgreen shadow-sm transition-all hover:border-emerald-300 hover:shadow-md"
            >
              Login
            </button>
          ) : (
            <button
              type="button"
              onClick={handleHeaderAuthClick}
              className="w-11 h-11 overflow-hidden squircle border border-emerald-200 bg-white shadow-sm transition-all hover:border-emerald-300 hover:shadow-md"
              aria-label="Profil und Abmelden"
            >
              <img
                src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=10B981&color=fff`}
                alt={user.displayName || 'Profilbild'}
                className="w-full h-full object-cover"
              />
            </button>
          )}
        </div>

        <h2 className="text-2xl font-bold text-slate-900 leading-tight mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Moin, {user ? user.displayName?.split(' ')[0] : 'Foodie'}! <span className="inline-block animate-pulse-gentle">🍔</span>
        </h2>
        <p className="text-slate-500 text-sm mb-6 font-medium">
          Entdecke die besten Snacks in deiner Stadt.
        </p>

        {/* Login Action Area */}
        {!user ? (
          <button
            type="button"
            onClick={() => {
              clearAuthError();
              setIsLoginModalOpen(true);
            }}
            className="w-full squircle bg-white border-2 border-slate-200 shadow-sm py-3.5 mb-8 flex justify-center items-center gap-3 transition-all hover:shadow-md hover:border-slate-300 active:scale-95"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span className="font-semibold tracking-wide text-slate-800 text-sm">Einloggen oder registrieren</span>
          </button>
        ) : (
          <button onClick={() => onTabChange('profile')} className="w-full squircle bg-white border-2 border-slate-200 shadow-sm py-3.5 mb-8 flex justify-center items-center gap-3 transition-all hover:shadow-md hover:border-slate-300 active:scale-95">
            <User size={18} className="text-realgreen" />
            <span className="font-semibold tracking-wide text-slate-800 text-sm">Zu deinem Profil</span>
          </button>
        )}
      </div>

      {/* Hero Section: Hype Radar */}
      <div className="px-5 mt-10 mb-10 animate-slide-up-delay-1">
        <div className="flex justify-between items-end mb-4">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Hype Radar <Flame size={20} className="text-orange-500 fill-orange-500" />
          </h3>
          <button className="text-emerald-600 text-[13px] font-semibold hover:text-emerald-700 transition-colors hover:underline">
            Alle ansehen
          </button>
        </div>

        <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide -mx-5 px-5">
          {isLoading ? (
            <div className="w-full flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
            </div>
          ) : trendingProducts.length === 0 ? (
            <p className="text-slate-500 text-sm w-full text-center py-10">Noch keine Trends vorhanden.</p>
          ) : (
            trendingProducts.slice(0, 5).map(product => (
              <button 
                key={product.id}
                type="button"
                onClick={() => openProductDetail(product)}
                className="relative w-64 h-80 flex-shrink-0 squircle overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.08)] group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(16,185,129,0.15)] shimmer-bg bg-stone-100 text-left"
              >
                <div className="absolute inset-0 flex items-center justify-center p-5 pb-24">
                  <ProductArtwork
                    src={product.image}
                    alt={product.name}
                    name={product.name}
                    brand={product.brand}
                    category={product.category}
                    variant="hero"
                    className="h-full w-full"
                    imageClassName="max-h-full max-w-full object-contain drop-shadow-[0_16px_28px_rgba(0,0,0,0.22)] transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"></div>

                <div className="absolute inset-x-0 bottom-0 p-5 flex flex-col justify-end">
                  <div className="bg-emerald-500/80 backdrop-blur-md text-white/95 text-[10px] font-bold px-3 py-1 rounded-full self-start mb-2.5 uppercase tracking-widest border border-emerald-400/50">
                    TRENDET GERADE
                  </div>
                  <h4 className="text-white text-[22px] font-bold leading-tight mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {product.name}
                  </h4>
                  <div className="flex items-center text-orange-400 text-xs font-semibold">
                    <Flame size={14} className="fill-orange-400 mr-1.5" />
                    {product.reviewCount || 1} Hypes
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Neu im Regal Section */}
      <div className="px-5 mb-10 animate-slide-up-delay-2">
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Neu im Regal <span className="bg-emerald-100 text-emerald-800 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ml-1 tracking-wider animate-pulse">🆕</span>
        </h3>

        {isLoadingHome ? renderNewestSkeletons() : newestProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {newestProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => openProductDetail(product)}
                className="w-full squircle bg-white shadow-sm border border-slate-100/60 overflow-hidden group hover:shadow-md transition-shadow text-left"
              >
                <div className="h-36 bg-[#F5F2EF] relative p-4 flex items-center justify-center shimmer-bg overflow-hidden">
                  <ProductArtwork
                    src={product.image}
                    alt={product.name}
                    name={product.name}
                    brand={product.brand}
                    category={product.category}
                    variant="card"
                    className="h-full w-full"
                    imageClassName="max-h-full max-w-full object-contain filter drop-shadow-sm transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                </div>
                <div className="p-3.5">
                  <h4 className="font-semibold text-slate-900 text-sm mb-1.5 line-clamp-2 min-h-[2.5rem]">{product.name}</h4>
                  <div className="flex justify-between items-center gap-2">
                    <span className="truncate text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-sm uppercase">
                      {product.brand || product.category || 'RealGood'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                      {formatTimeAgo(product.createdAt)}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="squircle border border-slate-200/70 bg-white px-5 py-8 text-center text-sm text-slate-400 shadow-sm">
            Noch keine neuen Produkte gefunden.
          </div>
        )}
      </div>

      {/* Dupe Alarm Section */}
      <div className="px-5 mb-10 animate-slide-up-delay-3">
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Dupe Alarm 🕵️
        </h3>

        {isLoadingHome ? renderDupeSkeletons() : topDupes.length > 0 ? (
          <div className="space-y-4">
            {topDupes.map((item) => {
              const hasPriceComparison = isDisplayablePrice(item.originalPrice) && isDisplayablePrice(item.dupePrice);

              return (
                <div
                  key={item.id}
                  ref={(node) => setDupeCardRef(item.id, node)}
                  className="squircle bg-[#F3F4F6] p-5 shadow-[inset_0px_2px_4px_rgba(0,0,0,0.02)] border border-slate-200/50 will-change-transform"
                >
                <div className="flex items-center justify-between mb-6 relative">
                  <div className="flex flex-col items-center w-2/5">
                      <button
                        type="button"
                        onClick={() => openProductDetail(buildDupeProduct(item, 'original'))}
                        className="flex flex-col items-center text-center"
                      >
                        <div className="w-[72px] h-[72px] bg-white squircle shadow-sm flex items-center justify-center mb-2 p-1.5 overflow-hidden transition-transform hover:scale-[1.02]">
                          <ProductArtwork
                            src={item.originalImage}
                            alt={item.originalName}
                            name={item.originalName}
                            brand={item.originalBrand}
                            category={item.originalCategory}
                            variant="card"
                            className="h-full w-full rounded-[14px]"
                            imageClassName="h-full w-full object-contain rounded-[14px]"
                          />
                        </div>
                        <span className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold mb-1">ORIGINAL</span>
                        <span className="text-[13px] font-bold text-slate-800 text-center line-clamp-2">{item.originalName}</span>
                      </button>
                    <span className="mt-0.5">{renderEditablePrice('Originalprodukt', item.originalPrice, 'text-red-500')}</span>
                  </div>

                  <div className="flex flex-col items-center justify-center absolute left-1/2 transform -translate-x-1/2 top-4">
                    <ArrowRightLeft size={18} className="text-emerald-500 mb-1" strokeWidth={2.5} />
                    <span className="bg-emerald-100/80 text-emerald-700 text-[8px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-widest">
                      MATCH
                    </span>
                  </div>

                  <div className="flex flex-col items-center w-2/5">
                    <button
                      type="button"
                      onClick={() => openProductDetail(buildDupeProduct(item, 'dupe'))}
                      className="flex flex-col items-center text-center"
                    >
                      <div className="w-[72px] h-[72px] bg-white squircle shadow-sm flex items-center justify-center mb-2 p-1.5 overflow-hidden transition-transform hover:scale-[1.02]">
                        <ProductArtwork
                          src={item.dupeImage}
                          alt={item.dupeName}
                          name={item.dupeName}
                          brand={item.dupeBrand}
                          category={item.dupeCategory}
                          variant="card"
                          className="h-full w-full rounded-[14px]"
                          imageClassName="h-full w-full object-contain rounded-[14px]"
                        />
                      </div>
                      <span className="text-[9px] text-emerald-600 uppercase tracking-widest font-bold mb-1">BESTER DUPE</span>
                      <span className="text-[13px] font-bold text-slate-800 text-center line-clamp-2">{item.dupeName}</span>
                    </button>
                    <span className="mt-0.5">{renderEditablePrice('Dupe', item.dupePrice, 'text-emerald-600')}</span>
                  </div>
                </div>

                <div className="bg-white squircle py-3.5 px-5 flex justify-between items-center gap-4 shadow-sm">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-slate-500 font-medium mb-1">Preisvorteil:</span>
                    <span className="text-sm font-bold text-slate-900">
                      {hasPriceComparison
                        ? `${Math.max(0, Math.round(item.priceSavingsPercentage || 0))}% günstiger`
                        : 'Preisvergleich fehlt'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end animate-pop-in">
                      <span className="text-emerald-600 font-bold text-[15px] leading-tight">{Math.round(item.matchScore || 0)}%</span>
                      <span className="text-[10px] text-emerald-700 font-semibold tracking-wide">identisch</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`${item.dupeName} positiv bewerten`}
                        onClick={() => handleDupeVote(item.id, 'up')}
                        disabled={Boolean(votingState[item.id])}
                        className={getVoteButtonClasses('up', item.userVotes?.[user?.uid] === 'up', Boolean(votingState[item.id]))}
                      >
                        <ThumbsUp size={14} className={item.userVotes?.[user?.uid] === 'up' ? 'fill-current' : ''} />
                        <span>{item.votes?.up || 0}</span>
                      </button>
                      <button
                        type="button"
                        aria-label={`${item.dupeName} negativ bewerten`}
                        onClick={() => handleDupeVote(item.id, 'down')}
                        disabled={Boolean(votingState[item.id])}
                        className={getVoteButtonClasses('down', item.userVotes?.[user?.uid] === 'down', Boolean(votingState[item.id]))}
                      >
                        <ThumbsDown size={14} className={item.userVotes?.[user?.uid] === 'down' ? 'fill-current' : ''} />
                        <span>{item.votes?.down || 0}</span>
                      </button>
                    </div>
                  </div>
                </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="squircle border border-slate-200/70 bg-white px-5 py-8 text-center text-sm text-slate-400 shadow-sm">
            Noch keine Dupes gefunden - scanne ein Produkt!
          </div>
        )}
      </div>

      {/* Social Section: Gerade gesnackt */}
      <div className="px-5 mb-6 animate-slide-up-delay-3">
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Gerade gesnackt 💬
        </h3>

        {isLoadingHome ? renderRecentReviewSkeletons() : recentReviews.length > 0 ? (
          <div className="space-y-4">
            {recentReviews.map((review, index) => (
              <button
                key={review.id}
                type="button"
                onClick={() => openProductDetail(buildReviewProduct(review))}
                className="w-full squircle bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 flex gap-4 text-left transition-all hover:border-emerald-100 group animate-pop-in"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="w-12 h-12 rounded-full p-[2px] border-[2.5px] border-emerald-50/0 group-hover:border-emerald-500/30 transition-colors flex-shrink-0 shimmer-bg shrink-0">
                  <img
                    src={getReviewAvatar(review)}
                    alt={review.userName || 'Foodie'}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="truncate font-bold text-slate-900 text-sm tracking-tight">
                          {review.userName || 'Foodie'}
                        </span>
                        {renderPremiumStars(review.rating)}
                      </div>
                      <p className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-400">
                        {review.productName || 'Unbekanntes Produkt'}
                      </p>
                    </div>
                    <span className="whitespace-nowrap text-[11px] font-medium text-slate-400">
                      {formatTimeAgo(review.createdAt)}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[13px] italic leading-relaxed">
                    "{getReviewPreview(review.comment)}"
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="squircle border border-slate-200/70 bg-white px-5 py-8 text-center text-sm text-slate-400 shadow-sm">
            Noch ist es ruhig hier. Schnapp dir den Scanner und mach den Anfang! 🍔
          </div>
        )}
      </div>

      <ProductDetailModal
        isOpen={Boolean(detailProduct)}
        product={detailProduct}
        onClose={closeProductDetail}
        onWriteReview={handleWriteReviewFromDetail}
      />

    </div>
  );
};
