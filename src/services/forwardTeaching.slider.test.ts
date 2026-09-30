// The wishlist (census #15): where a passive bishop or rook wants to go.
import { describe, it, expect } from 'vitest';
import { computeSliderRoute } from './forwardTeaching';

describe('computeSliderRoute — a slider\'s wish square and path', () => {
  it('a rook behind its own pawn heads for the pawnless file', () => {
    const r = computeSliderRoute('4k3/8/8/8/8/8/PPP1PPPP/R3K3 w - - 0 1', 'a1');
    expect(r?.target).toBe('d1');
    expect(r?.why).toBe('the d-file, with no pawn of yours in the way');
  });

  it('a bishop shut in by its own pawns finds a long diagonal two moves away', () => {
    // Bf1 sees three squares (d3 blocks it); via e2 it reaches the long f3 diagonal.
    const r = computeSliderRoute('4k3/8/8/8/8/3P4/PPP2PPP/4KB2 w - - 0 1', 'f1');
    expect(r?.route).toEqual(['e2', 'f3']);
    expect(r?.why).toBe('a long diagonal instead of 3 squares');
  });

  it('a bishop that already sweeps its diagonal is not passive', () => {
    expect(computeSliderRoute('4k3/8/8/8/8/8/PPPP1PPP/4KB2 w - - 0 1', 'f1')).toBeNull();
  });

  it('never routes onto a square an enemy pawn hits', () => {
    // d1 is the only pawnless file square and a black pawn on e2 guards it.
    expect(computeSliderRoute('4k3/8/8/8/8/8/PPP1pPPP/R3K3 w - - 0 1', 'a1')).toBeNull();
  });

  it('says nothing for a knight — that route has its own computer', () => {
    expect(computeSliderRoute('4k3/8/8/8/8/8/8/1N2K3 w - - 0 1', 'b1')).toBeNull();
  });
});
