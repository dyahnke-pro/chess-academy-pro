import { describe, it, expect, vi } from 'vitest';

// The record's boot re-price reads through BACKGROUND_SCORER (review audit
// 2026-10-21): as foreground reads they slowed Review's walk and stamped the
// student as active, so the pass waited 20 s after every game it priced.
const seen = vi.hoisted(() => ({ calls: [] as unknown[][] }));
vi.mock('./stockfishEngine', () => ({
  stockfishEngine: {
    analyzePosition: vi.fn(async (...args: unknown[]) => {
      seen.calls.push(args);
      return { bestMove: 'e2e4', evaluation: 20, isMate: false, mateIn: null, depth: 14, topLines: [{ rank: 1, evaluation: 20, moves: ['e2e4'], mate: null, depth: 14 }], nodesPerSecond: 0 };
    }),
    analyzeBounded: vi.fn(),
  },
}));

const FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('BACKGROUND_SCORER', () => {
  it('every read stands aside for the screen in use, and a budget rides along', async () => {
    const { BACKGROUND_SCORER } = await import('./refutedAlternative');
    await BACKGROUND_SCORER.analyzePosition(FEN, 14);
    const scored = await BACKGROUND_SCORER.scoreMoves(FEN, ['e2e4', 'd2d4'], 14);
    await BACKGROUND_SCORER.scoreMoves(FEN, ['e2e4'], 14, 1500);
    expect(seen.calls.map((c) => c[4])).toEqual([{ background: true }, { background: true }, { background: true, budgetMs: 1500 }]);
    expect(seen.calls[1][2]).toEqual({ searchmoves: 'e2e4 d2d4' });
    expect(scored).toEqual([{ evaluation: 20, mate: null, moves: ['e2e4'], depth: 14 }]);
  });
});
