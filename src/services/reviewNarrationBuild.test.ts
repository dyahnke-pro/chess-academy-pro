import { describe, it, expect, vi, beforeEach } from 'vitest';

// The build is what is under test, not the narration: a stub returns a fixed
// narration and counts how often the (expensive) generator actually ran.
const generate = vi.fn();
vi.mock('./coachFeatureService', () => ({
  generateReviewNarration: (...args: unknown[]) => generate(...args),
}));

import { db } from '../db/schema';
import { getOrBuildReviewNarration, storySeed, storyAtMerge, mergeReviewNarration, type ReviewNarrationRequest } from './reviewNarrationBuild';
import { createStoryStore, storyOf } from './gameStory';

const narration = { intro: 'intro', segments: [{ ply: 1, san: 'e4', narration: 'x' }], closing: null, story: null };

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

describe('the narration holds ONE story; a seed is it taken back to the ply walked (WO-STORY-MATRIX-01 P1-8d)', () => {
  // A walk whose story said a hint at ply 5, another at 7, a plan at 9 and a
  // sentence at 12 — the shape a build leaves on the narration.
  const walkStory = (): string => {
    const s = createStoryStore('g');
    s.commit(5, { claims: ['h:a'] });
    s.commit(7, { claims: ['h:b'] });
    s.commitThreads(9, [{ key: 'student|plan-aim:passer:c', kind: 'stated' }]);
    s.commit(12, { sentences: ['said at twelve'] });
    return s.serialize();
  };
  const walk = { intro: '', closing: null, segments: [], story: walkStory() } as never;

  it('everything said through the walked ply, nothing after', () => {
    const seed = storySeed(walk, 10);
    expect(seed?.throughPly).toBe(10);
    const at10 = storyOf(seed?.checkpoint ?? null);
    expect([...at10.said.keys()]).toEqual(['h:a', 'h:b']);
    expect([...at10.threads.keys()]).toEqual(['student|plan-aim:passer:c']);
    expect(at10.sentences.size).toBe(0);
    expect([...storyOf(storySeed(walk, 8)?.checkpoint ?? null).threads.keys()]).toEqual([]);
  });

  it('nothing said yet: no seed', () => {
    expect(storySeed(walk, 4)).toBeNull();
    expect(storySeed({ intro: '', closing: null, segments: [], story: null } as never, 40)).toBeNull();
  });

  it('a swap keeps the walk\'s story through the frozen ply and takes the newer build\'s after it', () => {
    const next = createStoryStore('g');
    next.commit(3, { claims: ['h:early-guess'] }); // the newer build's own past: not what the walk said
    next.commit(14, { claims: ['h:ahead'] });
    const nextNarration = { intro: 'i2', closing: null, segments: [], story: next.serialize() };
    const merged = mergeReviewNarration(walk, nextNarration as never, 10, true);
    expect([...storyOf(merged.story).said.keys()]).toEqual(['h:a', 'h:b', 'h:ahead']);
    // The instrument reads the same stories: two keys spoken, both unknown to
    // the newer build by then, none said again after.
    expect(storyAtMerge(walk, nextNarration as never, 10)).toEqual({ spoken: 2, missing: 2, reSaid: 0, reSaidKeys: [] });
  });
});
