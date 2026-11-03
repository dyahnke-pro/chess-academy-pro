import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';

// The build is what is under test, not the narration: a stub returns a fixed
// narration and counts how often the (expensive) generator actually ran.
const generate = vi.fn();
vi.mock('./coachFeatureService', () => ({
  generateReviewNarration: (...args: unknown[]) => generate(...args),
}));

import { db } from '../db/schema';
import { getOrBuildReviewNarration, storySeed, exploreSeed, storyAtMerge, mergeReviewNarration, type ReviewNarrationRequest } from './reviewNarrationBuild';
import { createStoryStore, storyOf, slipCount, threadStated } from './gameStory';

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

describe('a line explored off the walk is seeded with the story at the ply it LEAVES the game (P1-8d, the P1-8c review)', () => {
  // The walk is at ply 25. It stated a plan at 9, said a hint at 5, and on
  // its ply-25 move the student slipped (`not-developing`, their first slip
  // was at ply 8) and the coach said "That's the second time this game".
  const game = Array.from({ length: 30 }, (_, i) => ({ san: `m${i + 1}` }));
  const walkStory = (): string => {
    const s = createStoryStore('g');
    s.commit(5, { claims: ['h:a'] });
    s.note(8, [{ kind: 'slip', id: 'not-developing' }]);
    s.commitThreads(9, [{ key: 'student|plan-aim:passer:c', kind: 'stated' }]);
    s.commit(18, { claims: ['h:said-on-ply-18'], sentences: ['said on ply eighteen'] });
    s.note(25, [{ kind: 'slip', id: 'not-developing' }]);
    return s.serialize();
  };
  const walk = { intro: '', closing: null, segments: [], story: walkStory() } as never;
  /** The game's first `k` moves, then a move the game did not play. */
  const branchAt = (k: number): string[] => [...game.slice(0, k).map((m) => m.san), 'other'];

  it('a line leaving the game at ply 11 with the walk at 25: the plan and every claim said by 11, nothing after', () => {
    const seed = exploreSeed(walk, 25, branchAt(11), game);
    expect(seed?.throughPly).toBe(11);
    const st = storyOf(seed?.checkpoint ?? null);
    // Kept: what the student heard of the moves the line shares with the game.
    expect(st.said.get('h:a')).toBe(5);
    expect(threadStated(st, 'student|plan-aim:passer:c')).toBe(9);
    expect(slipCount(st, 'not-developing')).toBe(1);
    // Not carried: what was said about plies 12–25, moves this line never
    // played — the second slip above all (the line's own slip would have
    // been called "the third time this game").
    expect(st.said.has('h:said-on-ply-18')).toBe(false);
    expect(st.sentences.size).toBe(0);
    expect([...st.events].every((e) => e.ply <= 11)).toBe(true);
  });

  it('a line that follows the game past the walk is cut at the walk: the student heard no further', () => {
    const seed = exploreSeed(walk, 20, branchAt(27), game);
    expect(seed?.throughPly).toBe(20);
    const st = storyOf(seed?.checkpoint ?? null);
    expect(st.said.get('h:said-on-ply-18')).toBe(18);
    expect(slipCount(st, 'not-developing')).toBe(1);
  });

  it('a line off the game before anything was said has no seed; one off the first move has none either', () => {
    expect(exploreSeed(walk, 25, branchAt(3), game)).toBeNull();
    expect(exploreSeed(walk, 25, ['other'], game)).toBeNull();
  });

  it('the free board seeds its line this way — through `exploreSeed`, never the walk\'s ply alone', () => {
    const src = readFileSync('src/components/Coach/CoachGameReview.tsx', 'utf8');
    const body = src.slice(src.indexOf('const narrateExploredMove'), src.indexOf('const narrateExploredMoveRef'));
    expect(body).toMatch(/const seed = exploreSeed\(walkNarration, walkPlyRef\.current, args\.history, moves\);/);
    expect(body).not.toMatch(/storySeed\(/);
  });
});
