import { describe, it, expect, vi, beforeEach } from 'vitest';

// These tests are about search DEPTH, not opening theory — make nothing count
// as book so every ply of the fixture is evaluated (same trick as the wedge
// tests; the Ruy fixture is all theory).
vi.mock('./openingDetectionService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./openingDetectionService')>()),
  isBookLine: () => false,
}));

import { db } from '../db/schema';
import {
  analyzeGameOnWorker,
  replayPgnToFens,
  selectCriticalPlies,
  ANALYSIS_DEPTH,
  BEST_MOVE_DEPTH,
  TWO_PASS_SWING_CP,
  __testables,
} from './gameAnalysisService';
import { MATE_EVAL_VALUE } from './engineConstants';
import { buildGameRecord } from '../test/factories';

// TWO-PASS DEPTH + EVAL CACHE (David 2026-09-05, "how does chess.com analyze so
// fast?" → "two and three please"). The bulk sweep now walks every ply SHALLOW
// and re-searches DEEP only around a swing; a position the device already
// scored is served from the cache instead of the engine. Pinned here: which
// plies get which depth, that quiet plies never pay the deep budget, that the
// grade is computed from a same-depth pair, and that a second pass over the
// same game costs zero engine calls.

const PGN = '1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 1-0';
const GAME = buildGameRecord({ pgn: PGN });
const { fens } = replayPgnToFens(PGN);
const { BATCH_SHALLOW_DEPTH } = __testables;

/** Shallow curve: level, then White's 3.Bb5 (move idx 4: fens[4] → fens[5]) drops 320cp. */
const CURVE = [20, 20, 20, 20, 20, -300, -300, -300, -300];

interface Call { fen: string; depth: number }

/** Fake worker that answers the scripted curve and records (fen, depth) per call. */
function scriptedWorker(calls: Call[]) {
  return {
    analyzePosition: vi.fn((fen: string, depth: number) => {
      calls.push({ fen, depth });
      const idx = fens.indexOf(fen);
      return Promise.resolve({ evaluation: CURVE[idx] ?? 0, bestMove: 'd2d4', depth });
    }),
    destroy: vi.fn(),
  } as never;
}

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('selectCriticalPlies', () => {
  it('picks BOTH ends of every pair whose swing reaches the threshold', () => {
    expect(selectCriticalPlies(CURVE)).toEqual([4, 5]);
  });

  it('ignores swings below INACCURACY_CP (they cannot change a verdict)', () => {
    const quiet = [0, TWO_PASS_SWING_CP - 1, 0, -(TWO_PASS_SWING_CP - 1), 0];
    expect(selectCriticalPlies(quiet)).toEqual([]);
  });

  it('always deepens around a mate score', () => {
    expect(selectCriticalPlies([10, MATE_EVAL_VALUE, MATE_EVAL_VALUE])).toEqual([0, 1, 2]);
  });

  it('skips pairs with a missing eval and honors the `from` offset', () => {
    // A pair with a missing eval is skipped (never guessed); the level pairs are quiet.
    expect(selectCriticalPlies([null, 500, 500, 500], 0)).toEqual([]);
    // `from` excludes the pair (0,1) even though it swings.
    expect(selectCriticalPlies([0, 500, 0, 0], 1)).toEqual([1, 2]);
  });
});

describe('analyzeGameOnWorker — two-pass depth', () => {
  it('walks every ply shallow, deepens ONLY the swing pair, refines only the mistake', async () => {
    const calls: Call[] = [];
    const result = await analyzeGameOnWorker(GAME, scriptedWorker(calls));
    expect(result).not.toBeNull();

    const shallowFens = calls.filter((c) => c.depth === BATCH_SHALLOW_DEPTH).map((c) => fens.indexOf(c.fen)).sort((a, b) => a - b);
    const deepFens = calls.filter((c) => c.depth === ANALYSIS_DEPTH).map((c) => fens.indexOf(c.fen)).sort((a, b) => a - b);
    const bestFens = calls.filter((c) => c.depth === BEST_MOVE_DEPTH).map((c) => fens.indexOf(c.fen));

    expect(shallowFens).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    // The deep budget is spent on the two ends of the swing and nowhere else.
    expect(deepFens).toEqual([4, 5]);
    // Best-move refinement only for the move that lost material (idx 4).
    expect(bestFens).toEqual([4]);
    // 9 shallow + 2 deep + 1 refine — a quiet ply never costs a deep search.
    expect(calls).toHaveLength(12);
  });

  it('grades the swing as a blunder from the deep pair and every quiet move as good', async () => {
    const result = await analyzeGameOnWorker(GAME, scriptedWorker([]));
    const cls = result!.annotations.map((a) => a.classification);
    expect(cls[4]).toBe('blunder');
    cls.forEach((c, i) => { if (i !== 4) expect(c, `move ${i}`).toBe('good'); });
    // The blunder carries its refined best move; quiet moves carry none.
    expect(result!.annotations[4].bestMove).toBe('d2d4');
    expect(result!.annotations[0].bestMove).toBeNull();
  });

  it('stamps the game with the SHALLOW depth so a fast engine re-deepens it later', async () => {
    const result = await analyzeGameOnWorker(GAME, scriptedWorker([]));
    // Quiet plies stay shallow by design; the stamp must not claim deep.
    expect(result!.achievedDepth).toBe(BATCH_SHALLOW_DEPTH);
  });

  it('EVAL CACHE: a second sweep of the same positions costs ZERO engine calls', async () => {
    const first: Call[] = [];
    await analyzeGameOnWorker(GAME, scriptedWorker(first));
    expect(first.length).toBeGreaterThan(0);
    // Every eval the first sweep computed — shallow, deep, and the refined best
    // move — is now cached at the depth it reached.
    expect(await db.positionEvals.count()).toBe(fens.length);

    const second: Call[] = [];
    const result = await analyzeGameOnWorker(GAME, scriptedWorker(second));
    expect(second, 'a cached position must not be re-searched').toHaveLength(0);
    // …and the cached run grades identically.
    expect(result!.annotations[4].classification).toBe('blunder');
    expect(result!.annotations[4].bestMove).toBe('d2d4');
  });

  it('a cached SHALLOW eval does not stand in for the deep pass', async () => {
    // Prime the cache at shallow depth only (as a prior sweep on a slow phone would).
    await db.positionEvals.bulkPut(fens.map((fen, i) => ({
      fen: fen.split(' ').slice(0, 4).join(' '), evaluation: CURVE[i], depth: BATCH_SHALLOW_DEPTH, bestMove: null, updatedAt: 1,
    })));
    const calls: Call[] = [];
    await analyzeGameOnWorker(GAME, scriptedWorker(calls));
    // No shallow calls (all cached) — but the swing pair is still searched deep.
    expect(calls.filter((c) => c.depth === BATCH_SHALLOW_DEPTH)).toHaveLength(0);
    expect(calls.filter((c) => c.depth === ANALYSIS_DEPTH).map((c) => fens.indexOf(c.fen)).sort()).toEqual([4, 5]);
  });
});
