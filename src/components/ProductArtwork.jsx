import React, { useMemo, useState } from 'react';

const CATEGORY_THEME_MAP = {
  Snacks: {
    background: 'from-amber-300 via-orange-200 to-rose-100',
    pill: 'bg-white/70 text-orange-800',
    text: 'text-orange-950',
    emoji: '🍿',
  },
  Getränke: {
    background: 'from-sky-300 via-cyan-200 to-blue-100',
    pill: 'bg-white/70 text-sky-800',
    text: 'text-sky-950',
    emoji: '🥤',
  },
  Kühlware: {
    background: 'from-cyan-300 via-teal-200 to-emerald-100',
    pill: 'bg-white/70 text-teal-800',
    text: 'text-teal-950',
    emoji: '🧊',
  },
  Vegan: {
    background: 'from-emerald-300 via-lime-200 to-green-100',
    pill: 'bg-white/70 text-emerald-800',
    text: 'text-emerald-950',
    emoji: '🌱',
  },
  Vorrat: {
    background: 'from-stone-300 via-amber-100 to-zinc-100',
    pill: 'bg-white/70 text-stone-700',
    text: 'text-stone-900',
    emoji: '🫙',
  },
};

const DEFAULT_THEME = {
  background: 'from-slate-300 via-zinc-200 to-stone-100',
  pill: 'bg-white/70 text-slate-700',
  text: 'text-slate-900',
  emoji: '✨',
};

const VARIANT_MAP = {
  compact: {
    iconWrap: 'h-9 w-9 rounded-[1rem]',
    emoji: 'text-xl',
    initials: '',
    showChip: false,
    showInitials: false,
    stack: 'gap-1.5',
  },
  card: {
    iconWrap: 'h-9 w-9 rounded-[1rem] md:h-11 md:w-11 md:rounded-[1.15rem]',
    emoji: 'text-xl md:text-2xl',
    initials: 'text-[9px] tracking-[0.28em] md:text-[10px]',
    showChip: false,
    showInitials: true,
    stack: 'gap-1.5',
  },
  hero: {
    iconWrap: 'h-16 w-16 rounded-[1.35rem] md:h-20 md:w-20',
    emoji: 'text-4xl md:text-5xl',
    initials: 'text-xs tracking-[0.32em]',
    showChip: true,
    showInitials: true,
    stack: 'gap-2.5',
  },
};

const joinClasses = (...values) => values.filter(Boolean).join(' ');

const normalizeImageSource = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmedValue = value.trim();

  if (!trimmedValue || trimmedValue.includes('placehold.co')) {
    return '';
  }

  return trimmedValue;
};

const getInitials = (name) => {
  const parts = (name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return 'RG';
  }

  return parts.map((part) => part[0]).join('').toUpperCase();
};

const getChipLabel = (brand, category) => {
  const label = (brand || category || 'RealGood').trim();
  return label.length > 14 ? `${label.slice(0, 14).trim()}…` : label;
};

const getTheme = (category) => CATEGORY_THEME_MAP[category] || DEFAULT_THEME;

export const ProductArtwork = ({
  src,
  alt,
  name,
  brand,
  category,
  variant = 'card',
  className = '',
  imageClassName = '',
  fallbackClassName = '',
}) => {
  const safeSrc = useMemo(() => normalizeImageSource(src), [src]);
  const [failedSrc, setFailedSrc] = useState('');

  const theme = getTheme(category);
  const variantConfig = VARIANT_MAP[variant] || VARIANT_MAP.card;
  const initials = getInitials(name || alt);
  const chipLabel = getChipLabel(brand, category);
  const fallbackAlt = `${alt || name || 'Produkt'} ohne Bild`;
  const shouldRenderImage = Boolean(safeSrc) && failedSrc !== safeSrc;

  return (
    <div className={joinClasses('relative overflow-hidden', className)}>
      {shouldRenderImage ? (
        <img
          src={safeSrc}
          alt={alt || name || 'Produktbild'}
          onError={() => setFailedSrc(safeSrc)}
          className={imageClassName}
        />
      ) : (
        <div
          role="img"
          aria-label={fallbackAlt}
          className={joinClasses(
            'relative isolate flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br',
            theme.background,
            fallbackClassName
          )}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.72),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.28),transparent_38%)]" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.16))]" />

          <div className={joinClasses('relative flex flex-col items-center justify-center', variantConfig.stack)}>
            <div
              className={joinClasses(
                'flex items-center justify-center border border-white/60 bg-white/55 shadow-[0_12px_24px_rgba(255,255,255,0.22)] backdrop-blur-sm',
                variantConfig.iconWrap
              )}
            >
              <span className={variantConfig.emoji}>{theme.emoji}</span>
            </div>

            {variantConfig.showChip ? (
              <span
                className={joinClasses(
                  'rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.18em]',
                  theme.pill
                )}
              >
                {chipLabel}
              </span>
            ) : null}

            {variantConfig.showInitials ? (
              <span className={joinClasses('font-black uppercase', theme.text, variantConfig.initials)}>
                {initials}
              </span>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};