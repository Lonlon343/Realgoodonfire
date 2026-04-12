export const StoreFilterChips = ({
  stores,
  activeStore,
  onChange,
  title = 'Supermarkt',
  className = '',
}) => (
  <div className={className}>
    <div className="mb-3 flex items-center gap-3">
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>

    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {stores.map((store) => {
        const isActive = store === activeStore;

        return (
          <button
            key={store}
            type="button"
            onClick={() => onChange(store)}
            aria-pressed={isActive}
            className={[
              'inline-flex flex-shrink-0 items-center rounded-full border px-3.5 py-2 text-xs font-semibold transition-all',
              isActive
                ? 'border-realgreen bg-realgreen text-white shadow-[0_10px_24px_rgba(16,185,129,0.18)]'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
            ].join(' ')}
          >
            {store}
          </button>
        );
      })}
    </div>
  </div>
);