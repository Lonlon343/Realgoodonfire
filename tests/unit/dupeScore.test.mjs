// Pure unit tests (no emulator): the client match score must agree with the
// formula the Firestore rule evaluates (rule tolerance is 0.1).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDupeVoteUpdate,
  calculateDupeMatchScore,
  calculatePriceSavingsPercentage,
} from '../../src/services/dupeScore.js';

// JS port of firestore.rules expectedDupeMatchScore / clampScore.
const ruleClampScore = (score) => (score < 0 ? 0 : score > 100 ? 100 : score);
const ruleExpectedDupeMatchScore = (savings, votes) => ruleClampScore(
  50 + (savings / 2.0) + ((votes.up - votes.down) * 4)
);
// JS port of firestore.rules expectedSavingsPercentage.
const ruleExpectedSavings = (originalPrice, dupePrice) => (
  ((originalPrice - dupePrice) * 1.0 / originalPrice) * 100.0
);

describe('calculateDupeMatchScore matches the rule formula', () => {
  it('agrees within 0.05 for savings -300..100 and vote balances -30..30', () => {
    const mismatches = [];

    for (let tenths = -3000; tenths <= 1000; tenths += 1) {
      const savings = tenths / 10;

      for (let up = 0; up <= 30; up += 3) {
        for (let down = 0; down <= 30; down += 3) {
          const votes = { up, down };
          const client = calculateDupeMatchScore(savings, votes);
          const rule = ruleExpectedDupeMatchScore(savings, votes);

          // Client rounds to one decimal (max error 0.05); the rule allows 0.1.
          if (Math.abs(client - rule) > 0.05 + 1e-9) {
            mismatches.push({ savings, up, down, client, rule });
          }
        }
      }
    }

    assert.deepEqual(mismatches.slice(0, 5), [], `${mismatches.length} mismatches`);
  });

  it('clamps once: savings -200 with one net up vote is 0, not 4', () => {
    assert.equal(calculateDupeMatchScore(-200, { up: 1, down: 0 }), 0);
  });

  it('stays within 0..100', () => {
    assert.equal(calculateDupeMatchScore(100, { up: 50, down: 0 }), 100);
    assert.equal(calculateDupeMatchScore(-300, { up: 0, down: 5 }), 0);
  });
});

describe('calculatePriceSavingsPercentage', () => {
  it('rounds to one decimal and stays within 0.1 of the rule formula', () => {
    const prices = [0.01, 0.5, 0.99, 1, 1.49, 1.5, 2, 2.35, 3.99, 9.99, 49.99, 99.99];

    for (const originalPrice of prices) {
      for (const dupePrice of prices) {
        const client = calculatePriceSavingsPercentage(originalPrice, dupePrice);
        const rule = ruleExpectedSavings(originalPrice, dupePrice);
        assert.ok(
          Math.abs(client - rule) <= 0.1,
          `${originalPrice}/${dupePrice}: client ${client} rule ${rule}`
        );
      }
    }
  });

  it('is 0 when a price is missing', () => {
    assert.equal(calculatePriceSavingsPercentage(null, 2), 0);
    assert.equal(calculatePriceSavingsPercentage(2, null), 0);
    assert.equal(calculatePriceSavingsPercentage(0, 2), 0);
  });

  it('returns integers for exact values (2 -> 1 is 50)', () => {
    assert.equal(calculatePriceSavingsPercentage(2, 1), 50);
    assert.ok(Number.isInteger(calculatePriceSavingsPercentage(2, 1.5)));
  });
});

describe('buildDupeVoteUpdate', () => {
  const dupe = { priceSavingsPercentage: 25, votes: { up: 1, down: 0 }, userVotes: { a: 'up' } };

  it('adds a first vote', () => {
    const next = buildDupeVoteUpdate(dupe, 'b', 'down');
    assert.deepEqual(next.votes, { up: 1, down: 1 });
    assert.deepEqual(next.userVotes, { a: 'up', b: 'down' });
    assert.equal(next.matchScore, 62.5);
  });

  it('switches a vote', () => {
    const next = buildDupeVoteUpdate(dupe, 'a', 'down');
    assert.deepEqual(next.votes, { up: 0, down: 1 });
  });

  it('returns null for a repeated vote', () => {
    assert.equal(buildDupeVoteUpdate(dupe, 'a', 'up'), null);
  });

  it('tolerates legacy dupes without userVotes', () => {
    const next = buildDupeVoteUpdate({ priceSavingsPercentage: 0, votes: { up: 1, down: 0 } }, 'b', 'up');
    assert.deepEqual(next.userVotes, { b: 'up' });
    assert.deepEqual(next.votes, { up: 2, down: 0 });
  });
});
