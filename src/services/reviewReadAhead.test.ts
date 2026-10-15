import { describe, it, expect, vi, beforeEach } from 'vitest';

// THE READ-AHEAD (2026-10-13, chesscom-1040709576). jsdom has no Worker, so the
// pool declines and the reads take the singleton — the same code either way.
vi.mock('./openingDetectionService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./openingDetectionService')>()),
  isBookLine: () => false,
}));
const calls: { fen: string; depth: number }[] = [];
/** White-POV eval per position: 3.Bb5 (index 4→5) is the only real slip. */
const CURVE = [20, 20, 25, 20, 30, -300, -290, -290, -290];
let FENS: string[] = [];
vi.mock('./stockfishEngine', () => {
  const answer = (fen: string, depth: number, opts?: { searchmoves?: string }): Promise<unknown> => {
    calls.push({ fen, depth });
    if (opts?.searchmoves) {
      const ucis = opts.searchmoves.split(' ');
      return Promise.resolve({ evaluation: 30, bestMove: ucis[0], isMate: false, mateIn: null, depth, nodesPerSecond: 1,
        topLines: ucis.map((u, i) => ({ rank: i + 1, evaluation: i === 0 ? 30 : -300, mate: null, moves: [u] })) });
    }
    return Promise.resolve({ evaluation: CURVE[FENS.indexOf(fen)] ?? 0, bestMove: 'd2d4', isMate: false, mateIn: null, depth, topLines: [], nodesPerSecond: 1 });
  };
  return {
    stockfishEngine: { initialize: vi.fn(() => Promise.resolve()), analyzePosition: vi.fn(answer), analyzeWithBudget: vi.fn(answer) },
    isIosSafari: () => false,
    resolveWorkerUrl: () => ({ url: '/stockfish/stockfish-asm.js', variant: 'asm', reason: 'test', workerType: 'classic' }),
  };
});

import { db } from '../db/schema';
import { buildGameRecord } from '../test/factories';
import { startReviewReads, gradeReviewThrough, holdBatchAnalysis, replayPgnToFens, __testables } from './gameAnalysisService';
import { REVIEW_READ_DEPTH } from './engineConstants';
import { lookupPositionEvals, storePositionEvals } from './positionEvalCache';
import { saveVerdict, verdictKey, getVerdicts } from './moveVerdictStore';

const PGN = '1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 1-0';

beforeEach(async () => {
  await db.delete();
  await db.open();
  calls.length = 0;
  FENS = replayPgnToFens(PGN).fens;
});

describe('startReviewReads', () => {
  it('reads every position once, in walk order, to the review depth, and saves each read', async () => {
    const reads = startReviewReads(FENS);
    const seen: number[] = [];
    reads.onProgress((r) => seen.push(r));
    await reads.done;
    expect(calls.map((c) => FENS.indexOf(c.fen))).toEqual(FENS.map((_, i) => i));
    expect(calls.every((c) => c.depth === REVIEW_READ_DEPTH)).toBe(true);
    expect(reads.readyThrough()).toBe(FENS.length - 1);
    // contiguous, monotone readiness
    expect(seen).toEqual([...seen].sort((a, b) => a - b));
    const hits = await lookupPositionEvals(FENS, REVIEW_READ_DEPTH);
    expect(hits.size).toBe(FENS.length);
  });

  it('a position already read at review depth is not read again', async () => {
    await storePositionEvals(FENS.slice(0, 5).map((fen, i) => ({ fen, evaluation: CURVE[i], depth: REVIEW_READ_DEPTH, bestMove: 'd2d4' })));
    const reads = startReviewReads(FENS);
    await reads.done;
    expect(calls.map((c) => FENS.indexOf(c.fen))).toEqual([5, 6, 7, 8]);
  });

  it('a draft read (sweep depth) in the cache does not count — the position is read properly', async () => {
    await storePositionEvals([{ fen: FENS[4], evaluation: 999, depth: 7 }]);
    const reads = startReviewReads(FENS);
    await reads.done;
    expect(calls.some((c) => c.fen === FENS[4] && c.depth === REVIEW_READ_DEPTH)).toBe(true);
  });

  it('the student\'s pass reads ride BEHIND the game: read last, saved, never part of readiness', async () => {
    const { reviewPassFens } = await import('./reviewMoveIntent');
    const pass = reviewPassFens(FENS, 'white');
    expect(pass.length).toBeGreaterThan(0);
    const reads = startReviewReads(FENS, pass);
    await reads.all;
    const order = calls.map((c) => c.fen);
    // every game position is read before any pass position
    const lastGame = Math.max(...FENS.map((f) => order.indexOf(f)));
    const firstPass = Math.min(...pass.map((f) => order.indexOf(f)));
    expect(firstPass).toBeGreaterThan(lastGame);
    expect(reads.readyThrough()).toBe(FENS.length - 1);
    expect((await lookupPositionEvals(pass, REVIEW_READ_DEPTH)).size).toBe(new Set(pass).size);
  });

  it('stop() ends the reads', async () => {
    const reads = startReviewReads(FENS);
    reads.stop();
    await reads.done;
    expect(calls.length).toBeLessThan(FENS.length);
  });
});

describe('gradeReviewThrough — grades only from the reads', () => {
  it('grades the prefix the reads cover, with no further position search', async () => {
    const game = buildGameRecord({ id: 'g', pgn: PGN, annotations: null, fullyAnalyzed: false, isMasterGame: false });
    const reads = startReviewReads(FENS);
    await reads.done;
    const before = calls.length;
    const anns = await gradeReviewThrough(game, 6);
    expect(anns).toHaveLength(6);
    expect(anns![4].classification).toBe('blunder');
    // only the flagged ply's pricing search may run — never a curve read
    expect(calls.slice(before).filter((c) => c.depth !== REVIEW_READ_DEPTH)).toHaveLength(0);
    expect(calls.length - before).toBeLessThanOrEqual(1);
  });

  it('a review DRAFT grade stored earlier is overruled by the review-depth read (chesscom-1040709576, 6...e6)', async () => {
    // The phone's first open graded 3.Bb5 FINE from a 200 ms draft and stored it.
    await saveVerdict({ fenBefore: FENS[4], san: 'Bb5', label: 'fine', cpLoss: 0, bestUci: null, depth: 7, source: 'review' });
    const reads = startReviewReads(FENS);
    await reads.done;
    const anns = await gradeReviewThrough(buildGameRecord({ id: 'g2', pgn: PGN, annotations: null, isMasterGame: false }), 8);
    expect(anns![4].classification).toBe('blunder');
    const key = verdictKey(FENS[4], 'Bb5');
    expect((await getVerdicts([key])).get(key)?.label).toBe('blunder');
  });
});

describe('holdBatchAnalysis — a counted hold', () => {
  it('one holder releasing never frees the batch under another', () => {
    const a = holdBatchAnalysis();
    const b = holdBatchAnalysis();
    a();
    a();
    expect(__testables.batchHolds()).toBe(1);
    b();
    expect(__testables.batchHolds()).toBe(0);
  });
});
