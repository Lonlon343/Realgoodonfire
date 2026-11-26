import { useState } from 'react';
import { isAllowedAvatarUrl } from '../utils/safeUrls';

const AVATAR_COLORS = [
  'bg-emerald-100 text-emerald-800',
  'bg-orange-100 text-orange-800',
  'bg-sky-100 text-sky-800',
  'bg-amber-100 text-amber-800',
  'bg-teal-100 text-teal-800',
  'bg-rose-100 text-rose-800',
];

const getInitials = (name) => {
  const parts = (name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return 'F';
  }

  return parts.map((part) => Array.from(part)[0]).join('').toUpperCase();
};

const getColorClass = (name) => {
  const value = (name || 'Foodie').trim();
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 2147483647;
  }

  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

/**
 * Shows the user's photo when it comes from an allowed host, otherwise a
 * coloured circle with the initials of the name. Never calls a third-party
 * avatar service.
 *
 * Props:
 *   name          — display name used for initials, colour and alt text
 *   src           — optional photo URL (only Google profile photos are loaded)
 *   className     — size and shape classes of the wrapper (default round)
 *   textClassName — font size classes of the initials
 */
export const Avatar = ({
  name,
  src,
  className = 'h-11 w-11 rounded-full',
  textClassName = 'text-sm',
}) => {
  const [failedSrc, setFailedSrc] = useState('');
  const displayName = (name || '').trim() || 'Foodie';
  const safeSrc = isAllowedAvatarUrl(src) ? src.trim() : '';
  const shouldRenderImage = Boolean(safeSrc) && failedSrc !== safeSrc;

  if (shouldRenderImage) {
    return (
      <img
        src={safeSrc}
        alt={displayName}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setFailedSrc(safeSrc)}
        className={`${className} object-cover bg-slate-100`}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={displayName}
      className={`${className} ${getColorClass(displayName)} flex flex-shrink-0 items-center justify-center font-bold select-none`}
    >
      <span className={textClassName} aria-hidden="true">{getInitials(displayName)}</span>
    </div>
  );
};
