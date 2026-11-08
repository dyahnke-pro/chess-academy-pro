import { describe, it, expect } from 'vitest';
import { refutationOf } from './slipDepth';

describe('slipDepth — how the punishment landed', () => {
  it('cuts the refutation where the cost lands, in the punisher\'s moves', () => {
    // A knight left on d5 is taken at once.
    const r = refutationOf('4k3/8/8/3n4/8/8/8/3QK3 w - - 0 1', ['d1d5']);
    expect(r).not.toBeNull();
    expect(r?.moves).toBe(1);
    expect(r?.plies).toBe(1);
    expect(r?.mate).toBe(false);
    expect(r?.netPawns).toBe(3);
    expect(r?.quietStart).toBe(false);
    // A back-rank mate is a mate, one move deep.
    const m = refutationOf('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', ['a1a8']);
    expect(m?.mate).toBe(true);
    expect(m?.moves).toBe(1);
  });

  it('reads a quiet start on a real slip (7.Nc3?! …d4 forks, two moves to land)', () => {
    const r = refutationOf('r2qkb1r/ppp1ppp1/2n2n1p/3p3b/8/2NPBNPP/PPP1PPB1/R2QK2R b KQkq - 1 7', ['d5d4', 'e3d4', 'c6d4', 'g3g4', 'h5g6', 'f3e5']);
    expect(r).toMatchObject({ moves: 2, plies: 3, quietStart: true, mate: false, sans: ['d4', 'Bxd4', 'Nxd4'] });
  });

  it('claims no depth when the line proves no material and no mate', () => {
    expect(refutationOf('4k3/8/8/8/8/8/8/3QK3 w - - 0 1', ['d1d2'])).toBeNull();
    expect(refutationOf('4k3/8/8/8/8/8/8/3QK3 w - - 0 1', [])).toBeNull();
  });
});
