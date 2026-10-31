import { describe, it, expect, vi, beforeEach } from 'vitest';

// The build is what is under test, not the narration: a stub returns a fixed
// narration and counts how often the (expensive) generator actually ran.
const generate = vi.fn();
vi.mock('./coachFeatureService', () => ({
  generateReviewNarration: (...args: unknown[]) => generate(...args),
}));

import { db } from '../db/schema';
import { getOrBuildReviewNarration, spokenLedgerSeed, type ReviewNarrationRequest } from './reviewNarrationBuild';

const narration = { intro: 'intro', segments: [{ ply: 1, san: 'e4', narration: 'x' }], closing: null };

function request(gameId: string): ReviewNarrationRequest {
  return {
    gameId,
    moves: [{ ply: 1, san: 'e4', isCoachMove: false, classification: 'good', evaluation: 20, preMoveEval: 0, bestMove: null, fenAfter: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1' }],
    playerColor: 'white',
    openingName: null,
    result: '1-0',
    playerRating: 1200,
    coachNarration: 'full',
    uncapped: true,
  } as ReviewNarrationRequest;
}

describe('reviewNarrationBuild — one door for a game\'s review narration', () => {
  beforeEach(async () => {
    generate.mockReset();
    generate.mockImplementation(async () => { await new Promise((r) => setTimeout(r, 20)); return narration; });
    await db.delete();
    await db.open();
    await db.games.put({ id: 'g1', pgn: '1. e4', white: 'a', black: 'b', result: '1-0', date: '2026.09.01', event: '', eco: '', whiteElo: 1200, blackElo: 1200, source: 'chesscom', annotations: null, coachAnalysis: null, isMasterGame: false, openingId: null } as never);
  });

  it('two asks for the same game and inputs share ONE build (the page joins the pre-build)', async () => {
    const [a, b] = await Promise.all([getOrBuildReviewNarration(request('g1')), getOrBuildReviewNarration(request('g1'))]);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(a.narration).toEqual(narration);
    expect(b.narration).toEqual(narration);
  });

  it('a built narration is stored, so the next ask is a cache hit with no build', async () => {
    const first = await getOrBuildReviewNarration(request('g1'));
    expect(first.cacheHit).toBe(false);
    const second = await getOrBuildReviewNarration(request('g1'));
    expect(second.cacheHit).toBe(true);
    expect(second.key).toBe(first.key);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('different inputs are a different build — a deepened annotation never reuses a stale walk', async () => {
    await getOrBuildReviewNarration(request('g1'));
    const deeper = request('g1');
    deeper.moves = [{ ...deeper.moves[0], evaluation: 45 }];
    const res = await getOrBuildReviewNarration(deeper);
    expect(res.cacheHit).toBe(false);
    expect(generate).toHaveBeenCalledTimes(2);
  });
});

describe('the seed carries the story the walk had (WO-STORY-MATRIX-01 P1-8b)', () => {
  const seg = (ply: number, extra: Record<string, unknown>) => ({ ply, san: 'x', narration: null, ...extra });
  const walk = { intro: '', closing: null, segments: [seg(5, { ledgerKeys: ['h:a'], storyCheckpoint: 'cp5' }), seg(9, { storyCheckpoint: 'cp9' }), seg(7, { ledgerKeys: ['h:b'] }), seg(12, { storyCheckpoint: 'cp12' })] } as never;
  it('the last checkpoint at or before the walked ply, in ply order', () => {
    expect(spokenLedgerSeed(walk, 10)).toEqual({ throughPly: 10, keys: new Set(['h:a', 'h:b']), story: 'cp9' });
    expect(spokenLedgerSeed(walk, 8)?.story).toBe('cp5');
  });
  it('no checkpoint yet: the walk had said no plan', () => {
    expect(spokenLedgerSeed(walk, 4)?.story).toBeNull();
  });
});
