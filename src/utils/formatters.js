export const formatTimeAgo = (timestamp) => {
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

export const getAvatarUrl = (review) => {
  if (review?.userAvatar) {
    return review.userAvatar;
  }

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(review?.userName || 'Foodie')}&background=ecfdf5&color=065f46`;
};
