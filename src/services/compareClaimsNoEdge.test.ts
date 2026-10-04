import { describe, expect, it } from 'vitest';
import { candidateCompareRead } from './tacticalRead';

// Clean-pass walk 2026-10-03, G2 ply 10 (lichess VRUh4Qgh): "Prefer the c-pawn
// taking on d4 to the pawn to h6 — it forces the issue while the edge is there"
// at a level position (cxd4 −0.03 for Black). The compare computes a 30–120cp
// gap between two moves, never an edge or a closing window.
const FEN = 'rnbq1rk1/pp1p1ppp/4pn2/2p5/1bPP4/2N1PN2/PP1B1PPP/R2QKB1R b KQ - 1 6';

describe('the forcing-first compare claims no edge it did not compute', () => {
  it('level position: no "edge", no "while it still works"', () => {
    const r = candidateCompareRead(FEN, [
      { moves: ['c5d4'], evaluation: 3 },
      { moves: ['h7h6'], evaluation: 60 },
    ], 'black');
    expect(r).not.toBeNull();
    expect(r!.text).not.toMatch(/edge|still works/);
  });
});
