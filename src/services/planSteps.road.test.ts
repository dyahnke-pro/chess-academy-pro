// One piece's road in the plan (2026-11-19): Danya's "find your worst piece
// and improve it", read off the engine's quiet line on his own boards.
import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { planSteps, planStepsText } from './planSteps';

/** The board read's call (`boardPlan.stepsOf`): the line's first move is the
 *  plan's own first step. */
function boardPlan(fen: string, line: string[]): ReturnType<typeof planSteps> {
  const c = new Chess(fen);
  c.move({ from: line[0].slice(0, 2), to: line[0].slice(2, 4), promotion: line[0][4] });
  return planSteps(c.fen(), line.slice(1), line[0], 3, true, true);
}

describe('planSteps — one piece\'s road', () => {
  it('names the knight on the rim and its road (mysterious-gm-moves, Nb3-a1-c2-e3)', () => {
    const p = boardPlan('4r1k1/pb3q1p/np1prpp1/2p4n/2P1P2B/1NPB1P2/P2Q2PP/3RR2K w - - 0 22',
      ['b3a1', 'a6b8', 'a1c2', 'b7c6', 'c2e3', 'b8d7', 'd3c2', 'd7e5', 'e1f1', 'f7g7']);
    expect(p?.maneuver).toEqual({ piece: 'knight', from: 'b3', route: ['a1', 'c2', 'e3'], justMoved: false });
    expect(planStepsText(p!, 'your')).toBe('Your knight on b3 has a better road: a1, c2 and then e3.');
  });

  it('a road back through its own start is a shuffle, not a road (positional-rook-lift, Rh1-h2-h1)', () => {
    const p = boardPlan('r3k2r/1p3pbp/p2pq1p1/4p1P1/4P1P1/1PP5/1P3P2/R1BQK2R w KQkq - 0 18',
      ['c1e3', 'e8g8', 'f2f3', 'a6a5', 'h1h2', 'f8b8', 'h2h1', 'b7b5', 'e1e2']);
    expect(p?.maneuver ?? null).toBeNull();
  });

  it('a square one move reaches is not a road (mysterious-gm-moves #4, Qh5-d1-c1-g5)', () => {
    const p = boardPlan('5rk1/pp1q1rpp/4b3/3pPp1Q/P1pP3P/2P3P1/1P3RB1/5RK1 w - - 0 26',
      ['h5d1', 'g7g6', 'a4a5', 'd7d8', 'd1c1', 'g8g7', 'c1g5', 'd8a5']);
    expect(p?.maneuver ?? null).toBeNull();
  });

  it('a move already played is not a step of the road from here', () => {
    const c = new Chess('4r1k1/pb3q1p/np1prpp1/2p4n/2P1P2B/1NPB1P2/P2Q2PP/3RR2K w - - 0 22');
    c.move('Na1');
    const p = planSteps(c.fen(), ['a6b8', 'a1c2', 'b7c6', 'c2e3', 'b8d7', 'd3c2'], 'b3a1', 3, true, false);
    // The knight now stands on a1: its road from here is a1 → c2 → e3.
    expect(p?.maneuver).toEqual({ piece: 'knight', from: 'a1', route: ['c2', 'e3'], justMoved: true });
    expect(planStepsText(p!, 'your')).toBe('Your knight keeps going: c2 and then e3.');
  });
});
