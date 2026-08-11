import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { StockfishAnalysis } from '../types';

// Mock the engine before importing the SUT so the singleton it imports is
// the mock. analyzePosition returns whatever each test queues.
const analyzePosition = vi.fn<(fen: string, depth?: number) => Promise<StockfishAnalysis>>();
// The plan's fresh search is BUDGETED, not unbounded — see the block at the
// bottom of this file for why that distinction is the whole fix.
const analyzeWithBudget = vi.fn<(fen: string, depth: number, budgetMs?: number) => Promise<StockfishAnalysis>>();
vi.mock('./stockfishEngine', () => ({
  stockfishEngine: {
    analyzePosition: (fen: string, depth?: number) => analyzePosition(fen, depth),
    analyzeWithBudget: (fen: string, depth: number, budgetMs?: number) => analyzeWithBudget(fen, depth, budgetMs),
  },
}));
const getCachedStockfish = vi.fn<(fen: string) => StockfishAnalysis | undefined>();
vi.mock('../hooks/stockfishFenCache', () => ({
  getCachedStockfish: (fen: string) => getCachedStockfish(fen),
}));

import { buildEnginePlan } from './enginePlanContext';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function analysis(over: Partial<StockfishAnalysis>): StockfishAnalysis {
  return {
    bestMove: 'e2e4',
    evaluation: 30,
    isMate: false,
    mateIn: null,
    depth: 18,
    topLines: [{ rank: 1, evaluation: 30, mate: null, moves: ['e2e4', 'e7e5', 'g1f3', 'b8c6'] }],
    nodesPerSecond: 0,
    ...over,
  };
}

describe('buildEnginePlan', () => {
  beforeEach(() => {
    analyzePosition.mockReset();
    analyzeWithBudget.mockReset();
    getCachedStockfish.mockReset();
    getCachedStockfish.mockReturnValue(undefined);
  });

  it('converts the UCI PV to SAN and maps the white-perspective eval', async () => {
    analyzeWithBudget.mockResolvedValue(analysis({}));
    const plan = await buildEnginePlan(START, 'white');
    expect(plan).not.toBeNull();
    expect(plan!.pvSan).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
    expect(plan!.bestMoveUci).toBe('e2e4'); // PV[0] UCI for the grounded best-move answer
    expect(plan!.evalCp).toBe(30);
    expect(plan!.mateIn).toBeNull();
    expect(plan!.studentSide).toBe('white');
    expect(plan!.depth).toBe(18);
  });

  it('falls back to the CACHED analysis when a fresh search stalls (David 2026-07-09 live prod)', async () => {
    // The intermittent "no uciok within 5s" stall: analyzePosition throws, but
    // the eval-bar/prefetch already cached an analysis for this FEN.
    analyzeWithBudget.mockRejectedValue(new Error('no uciok within 5s of spawn'));
    getCachedStockfish.mockReturnValue(
      analysis({ evaluation: 45, topLines: [{ rank: 1, evaluation: 45, mate: null, moves: ['d2d4', 'd7d5'] }] }),
    );
    const plan = await buildEnginePlan(START, 'white');
    expect(plan).not.toBeNull();
    expect(plan!.pvSan).toEqual(['d4', 'd5']);
    expect(plan!.bestMoveUci).toBe('d2d4');
    expect(plan!.evalCp).toBe(45);
    expect(getCachedStockfish).toHaveBeenCalledWith(START);
  });

  it('returns null when BOTH the fresh search stalls AND the cache is empty', async () => {
    analyzeWithBudget.mockRejectedValue(new Error('worker crash'));
    getCachedStockfish.mockReturnValue(undefined);
    expect(await buildEnginePlan(START, 'white')).toBeNull();
  });

  it('caps the PV at 6 plies', async () => {
    analyzeWithBudget.mockResolvedValue(
      analysis({ topLines: [{ rank: 1, evaluation: 20, mate: null, moves: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5', 'a7a6', 'b5a4', 'g8f6'] }] }),
    );
    const plan = await buildEnginePlan(START, 'white');
    expect(plan!.pvSan).toHaveLength(6);
    expect(plan!.pvSan).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6']);
  });

  it('passes mate through as a signed white-perspective distance', async () => {
    // Fool's-mate position, black to move: ...Qh4# is mate-in-1 and legal.
    const foolsMate = 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2';
    analyzeWithBudget.mockResolvedValue(
      analysis({ isMate: true, mateIn: -1, evaluation: -100000, topLines: [{ rank: 1, evaluation: -100000, mate: -1, moves: ['d8h4'] }] }),
    );
    const plan = await buildEnginePlan(foolsMate, 'black');
    expect(plan!.pvSan).toEqual(['Qh4#']);
    expect(plan!.evalCp).toBeNull();
    expect(plan!.mateIn).toBe(-1);
  });

  it('stops the line cleanly if a PV move is illegal from the position', async () => {
    analyzeWithBudget.mockResolvedValue(
      analysis({ topLines: [{ rank: 1, evaluation: 10, mate: null, moves: ['e2e4', 'h7h1'] }] }),
    );
    const plan = await buildEnginePlan(START, 'white');
    expect(plan!.pvSan).toEqual(['e4']);
  });

  it('falls back to bestMove when topLines is empty', async () => {
    analyzeWithBudget.mockResolvedValue(analysis({ topLines: [], bestMove: 'd2d4' }));
    const plan = await buildEnginePlan(START, 'black');
    expect(plan!.pvSan).toEqual(['d4']);
    expect(plan!.studentSide).toBe('black');
  });

  it('returns null when there is no move at all (engine unavailable / empty)', async () => {
    // Mirrors the catch-path contract: no usable engine output → null, and
    // the surface falls back to master-play + DB grounding.
    analyzeWithBudget.mockResolvedValue(analysis({ topLines: [], bestMove: '' }));
    expect(await buildEnginePlan(START, 'white')).toBeNull();
  });
});

// ── THE BUDGET IS THE LIMIT, NOT SOMEONE ELSE'S TIMEOUT ────────────────────
// `buildEnginePlan` ran an UNBOUNDED depth-18 search while its only caller
// wrapped it in a 6s `Promise.race`. A race abandons the WAITER; it does not
// stop the ENGINE. So on a surface with no eval bar keeping the cache warm --
// home-chat, review, masterclass, the six the 2026-08-11 grounding build just
// reached -- a move question started a deep search, the student got the canned
// "I can't verify that precisely" line six seconds later, and the worker kept
// grinding on a result nobody would read, with the next question queued behind
// it. On the single-threaded engine that is several moves' worth of budget
// spent on an answer already thrown away.
describe('a fresh plan search self-limits', () => {
  beforeEach(() => {
    analyzePosition.mockReset();
    analyzeWithBudget.mockReset();
    getCachedStockfish.mockReset();
  });

  it('uses the budgeted search, never the unbounded one', async () => {
    getCachedStockfish.mockReturnValue(undefined);
    analyzeWithBudget.mockResolvedValue(analysis({ bestMove: 'e2e4', topLines: [{ moves: ['e2e4', 'e7e5'], evaluation: 30, mateIn: null }] }));
    const plan = await buildEnginePlan(START, 'white');
    expect(analyzePosition, 'the unbounded search is back').not.toHaveBeenCalled();
    expect(analyzeWithBudget).toHaveBeenCalled();
    expect(plan?.pvSan).toEqual(['e4', 'e5']);
  });

  it('passes a real budget, so the search can stop itself', async () => {
    getCachedStockfish.mockReturnValue(undefined);
    analyzeWithBudget.mockResolvedValue(analysis({ bestMove: 'd2d4', topLines: [{ moves: ['d2d4'], evaluation: 20, mateIn: null }] }));
    await buildEnginePlan(START, 'white');
    const budget = analyzeWithBudget.mock.calls[0]?.[2];
    expect(typeof budget).toBe('number');
    expect(budget, 'an unbounded or absurd budget defeats the point').toBeGreaterThan(0);
    expect(budget).toBeLessThanOrEqual(6000);
  });

  it('honours a caller-supplied budget', async () => {
    getCachedStockfish.mockReturnValue(undefined);
    analyzeWithBudget.mockResolvedValue(analysis({ bestMove: 'd2d4', topLines: [{ moves: ['d2d4'], evaluation: 0, mateIn: null }] }));
    await buildEnginePlan(START, 'white', 900);
    expect(analyzeWithBudget.mock.calls[0]?.[2]).toBe(900);
  });

  it('still prefers the cache and searches nothing when it hits', async () => {
    // The property the "two best moves" fix turned on: a warm board must not
    // pay for a second opinion that can disagree with the eval bar.
    getCachedStockfish.mockReturnValue(analysis({ bestMove: 'g1f3', topLines: [{ moves: ['g1f3'], evaluation: 15, mateIn: null }] }));
    const plan = await buildEnginePlan(START, 'white');
    expect(analyzeWithBudget, 'searched despite a cache hit').not.toHaveBeenCalled();
    expect(analyzePosition).not.toHaveBeenCalled();
    expect(plan?.bestMoveUci).toBe('g1f3');
  });
});
