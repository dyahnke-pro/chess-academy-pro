import { describe, expect, it, vi } from 'vitest';

vi.mock('./stockfishEngine', () => ({
  stockfishEngine: { setMultiPv: vi.fn(), getBestMove: vi.fn(async () => 'e7e5'), holdForQuestion: vi.fn() },
}));

import { foldScore, scoreEveryMove, ratedMove, HUMAN_TOP_RATING, type HeldEngine } from './humanReply';
import { stockfishEngine } from './stockfishEngine';
import type { StockfishAnalysis } from '../types';

function read(lines: Array<{ moves: string[]; evaluation: number; mate: number | null; depth?: number }>): StockfishAnalysis {
  return {
    bestMove: lines[0]?.moves[0] ?? '', evaluation: lines[0]?.evaluation ?? 0, isMate: false, mateIn: null, depth: 10,
    nodesPerSecond: 0, topLines: lines.map((l, i) => ({ rank: i + 1, ...l })),
  } as StockfishAnalysis;
}
const engineOf = (a: StockfishAnalysis): HeldEngine => ({ analyzePosition: async () => a });

describe('one wide read scores every move from the side to move', () => {
  it('turns White\'s view into Black\'s when Black is to move, and folds a mate', async () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    const scored = await scoreEveryMove(engineOf(read([
      { moves: ['e7e5'], evaluation: -20, mate: null },
      { moves: ['g7g5'], evaluation: 90, mate: null },
    ])), fen, 500);
    expect(scored?.find((s) => s.uci === 'e7e5')?.cp).toBe(20);
    expect(scored?.find((s) => s.uci === 'g7g5')?.cp).toBe(-90);
    expect(foldScore(0, 3)).toBe(2097);
    expect(foldScore(0, -1)).toBe(-2099);
  });

  it('a move reported twice keeps its deeper score; MultiPV is widened and put back', async () => {
    vi.mocked(stockfishEngine.setMultiPv).mockClear();
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const scored = await scoreEveryMove(engineOf(read([
      { moves: ['e2e4'], evaluation: 30, mate: null, depth: 10 },
      { moves: ['e2e4'], evaluation: -50, mate: null, depth: 8 },
      { moves: ['d2d4'], evaluation: 25, mate: null, depth: 10 },
    ])), fen, 500);
    expect(scored?.filter((s) => s.uci === 'e2e4')).toHaveLength(1);
    expect(scored?.find((s) => s.uci === 'e2e4')?.cp).toBe(30);
    expect(vi.mocked(stockfishEngine.setMultiPv).mock.calls.map((c) => c[0])).toEqual([20, 3]);
  });

  it('above the ratings the model was fitted on, the capped engine plays', async () => {
    vi.mocked(stockfishEngine.holdForQuestion).mockClear();
    const r = await ratedMove('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', { targetElo: HUMAN_TOP_RATING + 100, moveTimeMs: 500, skill: 20 });
    expect(r?.source).toBe('engine-capped');
    expect(stockfishEngine.holdForQuestion).not.toHaveBeenCalled();
  });
});
