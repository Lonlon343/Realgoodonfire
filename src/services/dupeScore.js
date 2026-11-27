// FILE: src/services/dupeScore.js
// Pure dupe score helpers shared by ShopContext and the tests. The formulas must
// stay identical to firestore.rules (expectedSavingsPercentage,
// expectedDupeMatchScore): the rule clamps the score ONCE, after adding the vote
// term, so the client does the same.

export const clampPercentage = (value) => Math.min(100, Math.max(0, value));

const roundToTenth = (value) => Math.round(value * 10) / 10;

const normalizeVoteCount = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

export const getNormalizedVotes = (votes = {}) => ({
  up: normalizeVoteCount(votes?.up),
  down: normalizeVoteCount(votes?.down),
});

const isPositivePrice = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0;

// Savings of the dupe against the original in percent, rounded to one decimal.
// 0 when no price comparison is possible (the rule then requires exactly 0).
export const calculatePriceSavingsPercentage = (originalPrice, dupePrice) => {
  if (!isPositivePrice(originalPrice) || !isPositivePrice(dupePrice)) {
    return 0;
  }

  const rawSavings = ((originalPrice - dupePrice) / originalPrice) * 100;
  return Number.isFinite(rawSavings) ? roundToTenth(rawSavings) : 0;
};

export const calculateDupeMatchScore = (priceSavingsPercentage = 0, votes = {}) => {
  const normalizedSavings = Number.isFinite(priceSavingsPercentage) ? priceSavingsPercentage : 0;
  const normalizedVotes = getNormalizedVotes(votes);
  const voteAdjustment = (normalizedVotes.up - normalizedVotes.down) * 4;

  return clampPercentage(roundToTenth(50 + (normalizedSavings / 2) + voteAdjustment));
};

// Next state of a dupe after `uid` votes `type` ('up' | 'down').
// Returns null when the user already voted that way (nothing to write).
export const buildDupeVoteUpdate = (dupeData, uid, type) => {
  const currentVote = dupeData?.userVotes?.[uid] || null;

  if (currentVote === type) {
    return null;
  }

  const nextVotes = getNormalizedVotes(dupeData?.votes);

  if (currentVote === 'up') {
    nextVotes.up = Math.max(0, nextVotes.up - 1);
  }

  if (currentVote === 'down') {
    nextVotes.down = Math.max(0, nextVotes.down - 1);
  }

  if (type === 'up') {
    nextVotes.up += 1;
  }

  if (type === 'down') {
    nextVotes.down += 1;
  }

  return {
    votes: nextVotes,
    userVotes: {
      ...(dupeData?.userVotes || {}),
      [uid]: type,
    },
    matchScore: calculateDupeMatchScore(dupeData?.priceSavingsPercentage, nextVotes),
  };
};
