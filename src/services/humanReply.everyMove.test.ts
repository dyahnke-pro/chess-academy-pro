// THE COACH'S OWN READ OF EVERY REPLY IS THE TREE'S READ ON LEARN — the read
// that chose the opponent's move travels WITH the move, so the reply tree
// (`ifTheyPlay`) walks the same read and never asks for a second. It is never
// kept in a module cache (a hidden global the page used to look up by board).
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

import * as humanReplyModule from './humanReply';
import { humanReply } from './humanReply';

const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

describe('the read of every reply travels with the reply', () => {
  it('humanReply returns the read it chose from, at the rating it chose for', async () => {
    const pick = await humanReply(AFTER_E4, 1400, 100);
    expect(pick).not.toBeNull();
    const read = pick?.read;
    expect(read?.rating).toBe(1400);
    expect(read?.scored.map((s) => s.uci).sort()).toEqual(['c7c5', 'e7e5']);
    // Black to move: the replier's view of a White-POV +20 is −20.
    expect(read?.scored.find((s) => s.uci === 'e7e5')?.cp).toBe(-20);
    expect(read?.scored.find((s) => s.uci === 'e7e5')?.pv).toEqual(['e7e5', 'g1f3']);
  });

  it('no module cache of reads exists to look up by board', () => {
    expect(Object.keys(humanReplyModule)).not.toContain('everyMoveReadAt');
    expect(Object.keys(humanReplyModule)).not.toContain('keepEveryMoveRead');
  });
});
