// THE COACH'S OWN READ OF EVERY REPLY IS THE TREE'S READ ON LEARN — the read
// that chose the opponent's move is kept for the board it was made on, so the
// reply tree (`ifTheyPlay`) walks the same read and never asks for a second.
import { describe, it, expect, vi } from 'vitest';

vi.mock('./stockfishEngine', () => ({
  stockfishEngine: {
    setMultiPv: () => undefined,
    holdForQuestion: async <T,>(work: (e: { analyzePosition: () => Promise<unknown> }) => Promise<T>): Promise<T> => work({
      analyzePosition: async () => ({
        bestMove: 'e7e5', evaluation: 20, isMate: false, mateIn: null, depth: 10, nodesPerSecond: 0,
        topLines: [
          { rank: 1, evaluation: 20, moves: ['e7e5', 'g1f3'], mate: null, depth: 10 },
          { rank: 2, evaluation: 35, moves: ['c7c5', 'g1f3'], mate: null, depth: 10 },
        ],
      }),
    }),
    getBestMove: async () => null,
  },
}));

import { everyMoveReadAt, humanReply, keepEveryMoveRead } from './humanReply';

const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

describe('the read of every reply, kept for the tree', () => {
  it('humanReply keeps its read for the board, at the rating it chose for', async () => {
    const pick = await humanReply(AFTER_E4, 1400, 100);
    expect(pick).not.toBeNull();
    const kept = everyMoveReadAt(AFTER_E4.replace(' 0 1', ' 3 7'));
    expect(kept?.rating).toBe(1400);
    expect(kept?.scored.map((s) => s.uci).sort()).toEqual(['c7c5', 'e7e5']);
    // Black to move: the replier's view of a White-POV +20 is −20.
    expect(kept?.scored.find((s) => s.uci === 'e7e5')?.cp).toBe(-20);
    expect(kept?.scored.find((s) => s.uci === 'e7e5')?.pv).toEqual(['e7e5', 'g1f3']);
  });

  it('keeps only the last few boards', () => {
    for (let i = 0; i < 6; i += 1) keepEveryMoveRead(`8/8/8/8/8/8/8/K${i + 1}k w - - 0 1`, { rating: i, scored: [] });
    expect(everyMoveReadAt('8/8/8/8/8/8/8/K1k w - - 0 1')).toBeNull();
    expect(everyMoveReadAt('8/8/8/8/8/8/8/K6k w - - 0 1')?.rating).toBe(5);
  });
});
