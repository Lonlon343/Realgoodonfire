import { useState, useEffect, useCallback } from 'react';
import { Flame, ChevronRight, Loader2 } from 'lucide-react';
import { ProductArtwork } from '../components/ProductArtwork';
import { StoreFilterChips } from '../components/StoreFilterChips';
import { useShop } from '../context/useShop';
import { STORE_FILTERS } from '../data';

const CATEGORIES = [
  { name: 'Snacks', emoji: '🍿', accent: 'from-amber-400 to-orange-500' },
  { name: 'Getränke', emoji: '🥤', accent: 'from-sky-400 to-blue-500' },
  { name: 'Kühlware', emoji: '🧊', accent: 'from-cyan-400 to-teal-500' },
  { name: 'Vorrat', emoji: '🫙', accent: 'from-stone-400 to-stone-600' },
];

export const HypeView = () => {
  const { getHypeProducts } = useShop();

  const [activeCategory, setActiveCategory] = useState(null);
  const [activeStore, setActiveStore] = useState('Alle');
  const [hypeProducts, setHypeProducts] = useState([]);
  const [lastVisibleDoc, setLastVisibleDoc] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Fetch first page whenever category changes
  const fetchInitial = useCallback(async (cat, store) => {
    setIsLoading(true);
    setHypeProducts([]);
    setLastVisibleDoc(null);
    setHasMore(true);
    try {
      const { docs, lastDoc } = await getHypeProducts(cat, null, store);
      setHypeProducts(docs);
      setLastVisibleDoc(lastDoc);
      if (docs.length < 10) setHasMore(false);
    } catch (err) {
      console.error('Fehler beim Laden der Hype-Produkte:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getHypeProducts]);

  useEffect(() => {
    fetchInitial(activeCategory, activeStore);
  }, [activeCategory, activeStore, fetchInitial]);

  // Load next 10
  const loadMore = async () => {
    if (!lastVisibleDoc || isLoading) return;
    setIsLoading(true);
    try {
      const { docs, lastDoc } = await getHypeProducts(activeCategory, lastVisibleDoc, activeStore);
      setHypeProducts((prev) => [...prev, ...docs]);
      setLastVisibleDoc(lastDoc);
      if (docs.length < 10) setHasMore(false);
    } catch (err) {
      console.error('Fehler beim Nachladen:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryClick = (name) => {
    setActiveCategory((prev) => (prev === name ? null : name));
  };

  // ── Bento Grid Category Tiles ──
  const renderBentoGrid = () => {
    const [featured, wide, ...small] = CATEGORIES;
    // featured: tall left column (col-span-1 row-span-2)
    // wide:     top-right spanning 2 cols (col-span-2 row-span-1)
    // small:    bottom-right, 1 col each — fills 3×2 grid perfectly

    const activeRing = 'ring-3 ring-realgreen ring-offset-2';

    return (
      <div className="grid grid-cols-3 grid-rows-2 gap-3 px-5 mb-8">
        {/* Tall featured tile — left column, both rows */}
        <button
          onClick={() => handleCategoryClick(featured.name)}
          className={`col-span-1 row-span-2 rounded-squircle bg-gradient-to-br ${featured.accent} relative overflow-hidden flex flex-col justify-end p-4 transition-all duration-300 shadow-lg
            ${activeCategory === featured.name ? `${activeRing} scale-[0.97]` : 'hover:scale-[0.98]'}`}
        >
          <span className="text-5xl mb-2 drop-shadow-lg">{featured.emoji}</span>
          <span className="text-white font-bold text-lg tracking-tight drop-shadow">{featured.name}</span>
          {activeCategory === featured.name && (
            <div className="absolute top-3 right-3 bg-white/30 backdrop-blur-sm rounded-full w-6 h-6 flex items-center justify-center">
              <Flame size={14} className="text-white" />
            </div>
          )}
        </button>

        {/* Wide tile — top right, spans 2 cols */}
        <button
          onClick={() => handleCategoryClick(wide.name)}
          className={`col-span-2 row-span-1 rounded-squircle bg-gradient-to-br ${wide.accent} relative overflow-hidden flex items-center gap-3 px-4 transition-all duration-300 shadow-md
            ${activeCategory === wide.name ? `${activeRing} scale-[0.97]` : 'hover:scale-[0.98]'}`}
        >
          <span className="text-4xl drop-shadow-lg">{wide.emoji}</span>
          <span className="text-white font-bold text-base tracking-tight drop-shadow">{wide.name}</span>
          {activeCategory === wide.name && (
            <div className="absolute top-2 right-2 bg-white/30 backdrop-blur-sm rounded-full w-6 h-6 flex items-center justify-center">
              <Flame size={14} className="text-white" />
            </div>
          )}
        </button>

        {/* Two compact tiles — bottom right */}
        {small.map((cat) => (
          <button
            key={cat.name}
            onClick={() => handleCategoryClick(cat.name)}
            className={`col-span-1 row-span-1 rounded-squircle bg-gradient-to-br ${cat.accent} relative overflow-hidden flex flex-col items-center justify-center p-2 transition-all duration-300 shadow-md
              ${activeCategory === cat.name ? `${activeRing} scale-[0.95]` : 'hover:scale-[0.97]'}`}
          >
            <span className="text-2xl mb-1">{cat.emoji}</span>
            <span className="text-white font-semibold text-[11px] tracking-tight leading-tight text-center drop-shadow">{cat.name}</span>
            {activeCategory === cat.name && (
              <div className="absolute top-1.5 right-1.5 bg-white/30 backdrop-blur-sm rounded-full w-5 h-5 flex items-center justify-center">
                <Flame size={11} className="text-white" />
              </div>
            )}
          </button>
        ))}
      </div>
    );
  };

  // ── Product Card ──
  const renderProductCard = (product) => (
    <div
      key={product.id}
      className="bg-white rounded-squircle shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex items-center gap-4 p-3 transition-transform hover:scale-[1.01]"
    >
      <ProductArtwork
        src={product.image}
        alt={product.name}
        name={product.name}
        brand={product.brand}
        category={product.category}
        variant="card"
        className="h-16 w-16 flex-shrink-0 rounded-squircle bg-realbg"
        imageClassName="h-full w-full rounded-squircle object-cover bg-realbg"
      />
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-slate-900 text-sm truncate">{product.name}</h3>
        <p className="text-xs text-slate-400 truncate">{product.brand}</p>
        {activeStore !== 'Alle' ? (
          <span className="mt-2 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
            {activeStore}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col items-center gap-0.5 pr-1 flex-shrink-0">
        <Flame size={18} className="text-realorange" />
        <span className="text-xs font-bold text-slate-700">{product.reviewCount ?? 0}</span>
      </div>
    </div>
  );

  return (
    <div className="pb-32 bg-realbg font-sans antialiased min-h-screen">
      {/* Header */}
      <div className="px-5 pt-8 mb-6 animate-slide-up">
        <div className="flex items-center gap-2 mb-1">
          <Flame size={22} className="text-realorange" />
          <h1
            className="text-2xl font-black text-realgreen tracking-tight"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Hype Check
          </h1>
        </div>
        <p className="text-slate-500 text-sm font-medium">
          Die beliebtesten Produkte der Community.
        </p>
      </div>

      {/* Bento Category Filter */}
      {renderBentoGrid()}

      <div className="px-5 mb-6">
        <StoreFilterChips
          stores={STORE_FILTERS}
          activeStore={activeStore}
          onChange={setActiveStore}
        />
      </div>

      {/* Active filter pill */}
      {(activeCategory || activeStore !== 'Alle') && (
        <div className="px-5 mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Filter:</span>
          {activeCategory ? (
            <button
              onClick={() => setActiveCategory(null)}
              className="inline-flex items-center gap-1 bg-realgreen/10 text-realgreen text-xs font-semibold px-3 py-1 rounded-full transition-colors hover:bg-realgreen/20"
            >
              {activeCategory}
              <span className="ml-1 text-[10px]">✕</span>
            </button>
          ) : null}
          {activeStore !== 'Alle' ? (
            <button
              onClick={() => setActiveStore('Alle')}
              className="inline-flex items-center gap-1 rounded-full bg-[#FDE7DE] px-3 py-1 text-xs font-semibold text-[#B45309] transition-colors hover:bg-[#FAD8C9]"
            >
              {activeStore}
              <span className="ml-1 text-[10px]">✕</span>
            </button>
          ) : null}
        </div>
      )}

      {/* Product List */}
      <div className="px-5 space-y-3">
        {hypeProducts.map(renderProductCard)}

        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 size={28} className="text-realgreen animate-spin" />
          </div>
        )}

        {!isLoading && hypeProducts.length === 0 && (
          <div className="text-center py-16">
            <span className="text-4xl mb-3 block">📭</span>
            <p className="text-slate-400 text-sm font-medium">
              Keine Hype-Produkte fuer diese Filter gefunden.
            </p>
            <p className="text-slate-300 text-xs mt-1">
              Aendere den Supermarkt oder die Kategorie, um mehr Treffer zu sehen.
            </p>
          </div>
        )}
      </div>

      {/* Load More */}
      {hasMore && hypeProducts.length > 0 && !isLoading && (
        <div className="px-5 mt-6">
          <button
            onClick={loadMore}
            className="w-full bg-white border-2 border-slate-200 rounded-squircle py-3.5 text-sm font-semibold text-slate-800 shadow-sm flex items-center justify-center gap-2 transition-all hover:shadow-md hover:border-slate-300 active:scale-95"
          >
            Weitere laden
            <ChevronRight size={16} className="text-slate-600" />
          </button>
        </div>
      )}
    </div>
  );
};
