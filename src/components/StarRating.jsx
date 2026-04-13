import { Star } from 'lucide-react';

/**
 * Displays a read-only row of 5 stars.
 *
 * Props:
 *   rating      — numeric rating (0–5), rounded to nearest integer
 *   size        — icon size in px (default 15)
 *   strokeWidth — icon stroke width (default 1.7)
 *   activeClass — Tailwind classes applied to filled stars
 *                 (default 'fill-emerald-500 text-emerald-500')
 */
export const StarRating = ({
  rating,
  size = 15,
  strokeWidth = 1.7,
  activeClass = 'fill-emerald-500 text-emerald-500',
}) => {
  const filled = Math.round(rating || 0);

  return (
    <div className="flex gap-[2px]">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={size}
          strokeWidth={strokeWidth}
          className={i < filled ? activeClass : 'text-slate-200'}
        />
      ))}
    </div>
  );
};
