import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestGameReview } from './gameReviewService';
import { db } from '../db/schema';
import { buildGameRecord } from '../test/factories';
import type { MoveAnnotation } from '../types';

// GROUNDED game review (David 2026-07-09: one LLM command). The review is
// ASSEMBLED from the computed engine annotations and voiced through voiceFacts —
// no free getCoachCommentary, no groundCoachReply bandaid. With no provider key
// in the test env, voiceFacts returns the computed facts verbatim, so these
// assert the GROUNDED review content deterministically (no LLM).

const ANNOTATIONS: MoveAnnotation[] = [
  { moveNumber: 1, color: 'white', san: 'e4', evaluation: 20, bestMove: 'e4', bestMoveEval: 20, classification: 'good', comment: null },
  { moveNumber: 12, color: 'white', san: 'Qh5', evaluation: -320, bestMove: 'Nf3', bestMoveEval: 40, classification: 'blunder', comment: null },
];

vi.mock('./gameAnalysisService', () => ({
  analyzeSingleGame: vi.fn(async () => ANNOTATIONS),
}));

describe('requestGameReview (grounded)', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('throws when game not found', async () => {
    await expect(requestGameReview('nonexistent')).rejects.toThrow('not found');
  });

  it('grounds the review in the computed engine annotations (no free LLM)', async () => {
    const game = buildGameRecord({ id: 'g1', pgn: '1. e4 e5 2. Nf3 Nc6', white: 'Alice', black: 'Bob', result: '0-1' });
    await db.games.put(game);

    const review = await requestGameReview('g1');

    // The counts, the flagged move, and the engine's preferred move are all
    // computed — the review must voice exactly those.
    expect(review).toContain('1 blunder');
    expect(review).toContain('Qh5');
    expect(review).toMatch(/engine preferred Nf3/);
    expect(review.toLowerCase()).toContain('turning point'); // the 1-blunder verdict
  });

  it('stores the grounded analysis + annotations back to the game record', async () => {
    const game = buildGameRecord({ id: 'g2', pgn: '1. d4 d5' });
    await db.games.put(game);

    await requestGameReview('g2');

    const updated = await db.games.get('g2');
    expect(updated?.coachAnalysis).toContain('blunder');
    expect(updated?.annotations?.length).toBe(ANNOTATIONS.length);
  });

  it('streams the final grounded review', async () => {
    const game = buildGameRecord({ id: 'g3', pgn: '1. e4 c5' });
    await db.games.put(game);

    const onStream = vi.fn();
    await requestGameReview('g3', onStream);

    expect(onStream).toHaveBeenCalledWith(expect.stringContaining('blunder'));
  });
});
