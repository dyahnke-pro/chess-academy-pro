// THE WORST PIECE ANSWERS ON EVERY BOARD (#5, 2026-10-20). The census-8 merge
// kept only the reroute reading, which skips undeveloped, attacked, pinned and
// outpost pieces — so at move 8 of the walk-5 game "what is my worst piece?"
// had nothing to say. The scope reading it replaced answered on every board.
import { describe, it, expect } from 'vitest';
import { worstPieceNote } from './nextPlans';

describe('worstPieceNote', () => {
  it('names the least active piece where no piece is misplaced (walk-5 board, move 8)', () => {
    const w = worstPieceNote('r1bqkb1r/pp1p1ppp/6n1/2p5/3nP3/2N5/PPP1BPPP/R1BQ1RK1 w kq - 2 8', 'w');
    expect(w).not.toBeNull();
    expect(w?.misplaced).toBe(false);
    expect(['n', 'b', 'r', 'q']).toContain(w?.piece);
  });
  it('is null only with no piece to name', () => {
    expect(worstPieceNote('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1', 'w')).toBeNull();
  });
});
