import { describe, it, expect, vi, beforeEach } from 'vitest';

// These tests are about search DEPTH, not opening theory — make nothing count
// as book so every ply of the fixture is evaluated (same trick as the wedge
// tests; the Ruy fixture is all theory).
vi.mock('./openingDetectionService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./openingDetectionService')>()),
  isBookLine: () => false,
}));

/** Singleton-engine calls the REVIEW makes (jsdom has no Worker, so the pool
 *  declines and the review takes the singleton path — the same code either way). */
const singletonCalls: { fen: string; depth: number }[] = [];
vi.mock('./stockfishEngine', () => {
  const answer = (fen: string, depth: number): Promise<unknown> => {
    singletonCalls.push({ fen, depth });
    return Promise.resolve({
      evaluation: CURVE[FENS.indexOf(fen)] ?? 0,
      bestMove: 'd2d4', isMate: false, mateIn: null, depth, topLines: [], nodesPerSecond: 1,
    });
  };
  return {
    stockfishEngine: {
      initialize: vi.fn(() => Promise.resolve()),
      analyzePosition: vi.fn(answer),
      analyzeWithBudget: vi.fn(answer),
    },
    isIosSafari: () => false,
    resolveWorkerUrl: () => ({ url: '/stockfish/stockfish-asm.js', variant: 'asm', reason: 'test', workerType: 'classic' }),
  };
});

import { Chess } from 'chess.js';
import { db } from '../db/schema';
import {
  analyzeGameOnWorker,
  analyzeSingleGame,
  selectCriticalPlies,
  ANALYSIS_DEPTH,
  BEST_MOVE_DEPTH,
  TWO_PASS_SWING_CP,
  __testables,
} from './gameAnalysisService';
import { MATE_EVAL_VALUE, INACCURACY_CP } from './engineConstants';
import { buildGameRecord } from '../test/factories';

// 🔒 THE SWEEP IS A DRAFT; THE REVIEW IS THE ANALYSIS (David 2026-09-05:
// "decrease the depth for the batch and dive deeper on key moments once a single
// game is selected to be reviewed — this is burning way too much battery and
// taking way too long").
//
// Pinned here, because each is a way the split could silently rot:
//   - the SWEEP runs ONE shallow pass and never a deep one (the battery bill);
//   - the sweep does not claim slips smaller than its own search noise (the
//     honesty cost of running shallow — "faster and wronger" is not the trade);
//   - the sweep STAMPS itself shallow, which is what schedules the deep dive;
//   - the REVIEW deep-searches the key moments and only those;
//   - a reviewed game is not re-analysed on every re-open.

const PGN = '1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 1-0';

/** FENs of the fixture, computed here so the engine mocks (hoisted above every
 *  import) can answer per position without importing the service. */
const FENS: string[] = (() => {
  const c = new Chess();
  c.loadPgn(PGN);
  const v = c.history({ verbose: true });
  return [v[0].before, ...v.map((m) => m.after)];
})();

/** Level, then White's 3.Bb5 (move idx 4: fens[4] → fens[5]) drops 320cp. */
const CURVE = [20, 20, 20, 20, 20, -300, -300, -300, -300];

const GAME = buildGameRecord({ pgn: PGN });
const { BATCH_SHALLOW_DEPTH, REVIEW_DEEP_DEPTH, BATCH_GRADE_FLOOR_CP } = __testables;

interface Call { fen: string; depth: number }

/** Fake pool worker that answers a scripted curve and records (fen, depth). */
function scriptedWorker(calls: Call[], curve: readonly number[] = CURVE) {
  return {
    analyzePosition: vi.fn((fen: string, depth: number) => {
      calls.push({ fen, depth });
      return Promise.resolve({ evaluation: curve[FENS.indexOf(fen)] ?? 0, bestMove: 'd2d4', depth });
    }),
    destroy: vi.fn(),
  } as never;
}

beforeEach(async () => {
  singletonCalls.length = 0;
  await db.delete();
  await db.open();
});

describe('selectCriticalPlies — the review\'s key-moment selector', () => {
  it('picks BOTH ends of every pair whose swing reaches the threshold', () => {
    expect(selectCriticalPlies(CURVE)).toEqual([4, 5]);
  });

  it('threshold is INACCURACY_CP, so every ply that could grade worse than `good` is deepened', () => {
    // This is what makes the review's verdicts all DEEP verdicts: a ply left
    // shallow swung less than the smallest grade-changing amount.
    expect(TWO_PASS_SWING_CP).toBe(INACCURACY_CP);
    expect(selectCriticalPlies([0, INACCURACY_CP, 0])).toEqual([0, 1, 2]);
    expect(selectCriticalPlies([0, INACCURACY_CP - 1, 0])).toEqual([]);
  });

  it('always deepens around a mate score', () => {
    expect(selectCriticalPlies([10, MATE_EVAL_VALUE, MATE_EVAL_VALUE])).toEqual([0, 1, 2]);
  });

  it('skips pairs with a missing eval and honors the `from` offset', () => {
    expect(selectCriticalPlies([null, 500, 500, 500], 0)).toEqual([]);
    expect(selectCriticalPlies([0, 500, 0, 0], 1)).toEqual([1, 2]);
  });

  it('caps the review at a ply budget, spending it on the BIGGEST swings first', () => {
    // Without a cap the review's cost is set by how noisy the curve is, not by
    // how interesting the game is — a swingy game nominates thirty-odd plies and
    // puts the slowness back into the review.
    const noisy = [0, 60, 0, 70, 0, 90, 0, 65, 0, 55, 0];  // ten ~noise-sized swings
    expect(selectCriticalPlies(noisy, 0).length).toBeGreaterThan(6);
    const capped = selectCriticalPlies(noisy, 0, 6);
    expect(capped.length).toBeLessThanOrEqual(6);
    // The 90cp swing (plies 5-6) is the biggest, so it is in; the 55cp is out.
    expect(capped).toContain(5);
    expect(capped).toContain(6);
    expect(capped).not.toContain(9);
  });

  it('never drops a real finding to fit the cap — only the ambiguous small ones are rationed', () => {
    // Four mistake-sized swings with a 2-ply budget: all four are still deepened.
    const findings = [0, 400, 0, 400, 0, 400, 0, 400, 0];
    const capped = selectCriticalPlies(findings, 0, 2);
    expect(capped.length).toBeGreaterThan(2);
    expect(capped).toEqual(selectCriticalPlies(findings, 0));
  });
});

describe('the SWEEP runs one shallow pass', () => {
  it('evaluates every ply shallow and NEVER runs a deep re-search', async () => {
    const calls: Call[] = [];
    const result = await analyzeGameOnWorker(GAME, scriptedWorker(calls));
    expect(result).not.toBeNull();

    const shallow = calls.filter((c) => c.depth === BATCH_SHALLOW_DEPTH);
    const deep = calls.filter((c) => c.depth === ANALYSIS_DEPTH);
    const best = calls.filter((c) => c.depth === BEST_MOVE_DEPTH).map((c) => FENS.indexOf(c.fen));

    expect(shallow).toHaveLength(FENS.length);
    // THE BATTERY BILL. A second deep pass over the swings was most of the
    // sweep's runtime on an amateur game, where the eval swings constantly.
    expect(deep, 'the sweep must not deep-search — that is the review\'s job').toHaveLength(0);
    // The one exception: the mistake's best move, which the drills need.
    expect(best).toEqual([4]);
    expect(calls).toHaveLength(FENS.length + 1);
  });

  it('still catches the blunder, graded off the shallow curve', async () => {
    const result = await analyzeGameOnWorker(GAME, scriptedWorker([]));
    const cls = result!.annotations.map((a) => a.classification);
    expect(cls[4]).toBe('blunder');
    cls.forEach((c, i) => { if (i !== 4) expect(c, `move ${i}`).toBe('good'); });
    expect(result!.annotations[4].bestMove).toBe('d2d4');
  });

  it('does NOT claim a slip smaller than its own search noise', async () => {
    // A shallow eval carries a few tens of cp of search noise — the size of INACCURACY_CP
    // itself. Flagging that would fill My Mistakes with moves that were fine.
    // Faster AND wronger is not the trade; the review surfaces the real ones.
    const nearNoise = BATCH_GRADE_FLOOR_CP - 20;
    expect(nearNoise).toBeGreaterThanOrEqual(INACCURACY_CP); // would have been flagged before
    const calls: Call[] = [];
    const curve = [20, 20, 20, 20, 20, 20 - nearNoise, 20 - nearNoise, 20 - nearNoise, 20 - nearNoise];
    const result = await analyzeGameOnWorker(GAME, scriptedWorker(calls, curve));
    expect(result!.annotations[4].classification).toBe('good');
    // …and it costs no best-move search either.
    expect(calls.filter((c) => c.depth === BEST_MOVE_DEPTH)).toHaveLength(0);
  });

  it('stamps itself SHALLOW — the record says "draft", which is what schedules the deep dive', async () => {
    const result = await analyzeGameOnWorker(GAME, scriptedWorker([]));
    expect(result!.achievedDepth).toBe(BATCH_SHALLOW_DEPTH);
    expect(result!.achievedDepth).toBeLessThan(ANALYSIS_DEPTH); // ⇒ gameNeedsAnalysis re-analyses on open
  });

  it('EVAL CACHE: a second sweep of the same positions costs ZERO engine calls', async () => {
    const first: Call[] = [];
    await analyzeGameOnWorker(GAME, scriptedWorker(first));
    expect(first.length).toBeGreaterThan(0);
    expect(await db.positionEvals.count()).toBe(FENS.length);

    const second: Call[] = [];
    const result = await analyzeGameOnWorker(GAME, scriptedWorker(second));
    expect(second, 'a cached position must not be re-searched').toHaveLength(0);
    expect(result!.annotations[4].classification).toBe('blunder');
    expect(result!.annotations[4].bestMove).toBe('d2d4');
  });
});

describe('the REVIEW deep-dives the key moments', () => {
  async function reviewFixture(): Promise<void> {
    await db.games.put(buildGameRecord({ id: 'g-review', pgn: PGN, annotations: [], fullyAnalyzed: false }));
  }

  it('walks the curve shallow, then re-searches ONLY the swing at REVIEW_DEEP_DEPTH', async () => {
    await reviewFixture();
    const anns = await analyzeSingleGame('g-review');
    expect(anns).not.toBeNull();

    const curve = singletonCalls.filter((c) => c.depth === BATCH_SHALLOW_DEPTH);
    const dive = singletonCalls.filter((c) => c.depth === REVIEW_DEEP_DEPTH).map((c) => FENS.indexOf(c.fen));

    expect(curve.length).toBe(FENS.length);
    // The old review ran ALL of these deep at 5s each — 216s on David's iPhone.
    expect(dive).toEqual(expect.arrayContaining([4, 5]));
    expect(dive.length).toBeLessThan(FENS.length);
    expect(anns![4].classification).toBe('blunder');
  });

  it('re-searches at a depth the engine can actually REACH, so a quiet position stops early', () => {
    // 🔒 `go depth N movetime B` stops at whichever lands first. An unreachable
    // N means the depth limit never lands and EVERY search burns the whole
    // movetime — no early return, ever (David 2026-09-05: "isn't depth 18 too
    // deep?"). It must stay reachable on the slow asm build a phone runs.
    expect(REVIEW_DEEP_DEPTH).toBeLessThan(ANALYSIS_DEPTH);
    // …and it must NOT be aliased to the drill-solution depth again.
    expect(REVIEW_DEEP_DEPTH).toBeLessThan(BEST_MOVE_DEPTH);
  });

  it('still grades correctly at that depth — the verdict is settled far shallower than 18', () => {
    // The consumer of the deep eval is classifyCpLoss, whose smallest
    // verdict-changing swing is INACCURACY_CP (50cp). A depth-14 → depth-18
    // eval moves ~10cp, so the extra plies cannot change a classification.
    expect(INACCURACY_CP).toBeGreaterThan(10);
  });

  it('bounds its own cost: the deep dive never exceeds the ply cap on ordinary swings', async () => {
    await reviewFixture();
    await analyzeSingleGame('g-review');
    const dive = singletonCalls.filter((c) => c.depth === REVIEW_DEEP_DEPTH);
    expect(dive.length).toBeLessThanOrEqual(__testables.REVIEW_MAX_DEEP_PLIES);
  });

  it('a completed review is NOT re-analysed on the next open', async () => {
    await reviewFixture();
    await analyzeSingleGame('g-review');
    const saved = await db.games.get('g-review');
    // Stamping the quiet plies' shallow depth here would re-run the whole
    // analysis every time the user re-opened the game.
    expect(saved?.analysisDepth).toBe(ANALYSIS_DEPTH);

    singletonCalls.length = 0;
    await analyzeSingleGame('g-review');
    expect(singletonCalls, 'a reviewed game must not be re-analysed').toHaveLength(0);
  });
});
