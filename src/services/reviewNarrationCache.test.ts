import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { buildGameRecord } from '../test/factories';
import {
  reviewNarrationCacheKey, getCachedReviewNarration, storeReviewNarration, REVIEW_NARRATION_REV,
} from './reviewNarrationCache';
import type { ReviewMoveInput, ReviewNarration } from './coachFeatureService';

const moves: ReviewMoveInput[] = [
  { ply: 1, san: 'e4', isCoachMove: false, classification: 'book', evaluation: 30, preMoveEval: 0, bestMove: null, fenAfter: 'f1' },
  { ply: 2, san: 'c6', isCoachMove: true, classification: 'book', evaluation: 25, preMoveEval: 30, bestMove: null, fenAfter: 'f2' },
];
const base = { moves, playerColor: 'black' as const, openingName: 'Caro-Kann', result: '0-1', playerRating: 1200, coachNarration: 'full' as const, uncapped: false };
const narration: ReviewNarration = { intro: 'hi', segments: [{ ply: 1 } as ReviewNarration['segments'][number]], closing: null };

beforeEach(async () => { await db.delete(); await db.open(); });

describe('reviewNarrationCache — re-opening a game is instant', () => {
  it('round-trips a narration under its key', async () => {
    await db.games.put(buildGameRecord({ id: 'g1' }));
    const key = reviewNarrationCacheKey(base);
    expect(await getCachedReviewNarration('g1', key)).toBeNull();
    await storeReviewNarration('g1', key, narration);
    expect(await getCachedReviewNarration('g1', key)).toEqual(narration);
  });

  it('misses when an input that could change a spoken word changes', async () => {
    const key = reviewNarrationCacheKey(base);
    const deepened = { ...base, moves: [{ ...moves[0], classification: 'mistake' as const, bestMove: 'd4' }, moves[1]] };
    expect(reviewNarrationCacheKey(deepened)).not.toBe(key);
    expect(reviewNarrationCacheKey({ ...base, coachNarration: 'brief' })).not.toBe(key);
    expect(reviewNarrationCacheKey({ ...base, uncapped: true })).not.toBe(key);
    expect(reviewNarrationCacheKey({ ...base, playerColor: 'white' })).not.toBe(key);
  });

  it('is deterministic for identical inputs', () => {
    expect(reviewNarrationCacheKey(base)).toBe(reviewNarrationCacheKey({ ...base, moves: [...moves] }));
    expect(reviewNarrationCacheKey(base).startsWith(`${REVIEW_NARRATION_REV}:`)).toBe(true);
  });

  it('ignores an entry from an older narration revision', async () => {
    await db.games.put(buildGameRecord({ id: 'g2' }));
    const key = reviewNarrationCacheKey(base);
    await db.games.update('g2', { reviewNarration: { rev: REVIEW_NARRATION_REV - 1, key, narration, savedAt: 1 } });
    expect(await getCachedReviewNarration('g2', key)).toBeNull();
  });

  it('fails open on a missing game', async () => {
    expect(await getCachedReviewNarration('nope', 'k')).toBeNull();
    await expect(storeReviewNarration('nope', 'k', narration)).resolves.toBeUndefined();
  });
});
