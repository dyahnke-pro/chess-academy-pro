import { describe, expect, it } from 'vitest';
import { queenlessMate } from './queenlessMate';

describe('queenlessMate', () => {
  it('reads the Danya board (how-to-avoid-blunders-part-1#4: …Nxf4#)', () => {
    const r = queenlessMate('2r5/4p3/3p1npk/3n2N1/5P1N/1P1r2PK/4R2P/4R3 b - - 0 1', 'b');
    expect(r?.mate).toBe('Nxf4#');
    expect(r?.text).toContain('Nxf4');
  });
  it('says the mate they threaten to the side that must stop it', () => {
    // White to move; Black, handed the move, mates with Nxf4.
    const r = queenlessMate('2r5/4p3/3p1npk/3n2N1/5P1N/1P1r2PK/4R2P/4R3 w - - 0 1', 'w');
    expect(r?.side).toBe('b');
    expect(r?.text).toContain('they threaten');
  });
  it('stays silent with a queen on the board, or no mate', () => {
    expect(queenlessMate('r1b2rk1/5pbp/1q2p3/1pn5/3p4/3B1N2/PP2QPPP/R1B2RK1 w - - 0 16', 'w')).toBeNull();
    expect(queenlessMate('8/5ppk/3P3p/8/8/2pK3P/5PP1/8 b - - 0 2', 'b')).toBeNull();
  });
});
