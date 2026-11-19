import { describe, expect, it } from 'vitest';
import { kingSquareByChecks } from './kingAttackReads';

// A CHECK THAT LOSES ITS PIECE WINS NO TIME (Danya narration test 2026-11-19).
describe('kingSquareByChecks — only checks that win time', () => {
  it('the positional rook lift #2: Nxe5+ after …Kd7 loses the knight to …dxe5', () => {
    const r = kingSquareByChecks('2kr2r1/1b5p/p2pn1qB/1pp1p1p1/4P3/1PPPQNP1/1P3P1R/3RK3 b - - 0 25', 'b', 'Kb8');
    expect(r?.text ?? '').not.toMatch(/d7/);
  });
  it('modern chess technique #2: on c4 the rook checks only by giving itself up', () => {
    const r = kingSquareByChecks('2b5/p3k3/2p1p1p1/PrN4p/1P1R1P1P/3K2P1/8/8 w - - 0 55', 'w', 'Kd2');
    expect(r?.text ?? '').not.toMatch(/c4/);
  });
  it('negative control: a check that keeps its piece still makes the square wrong', () => {
    // Black's knight on d3: after Ke2 it checks from f4 or c1 and stays.
    expect(kingSquareByChecks('4k3/8/8/8/8/3n4/8/4K3 w - - 0 1', 'w', 'Kd2')?.text).toMatch(/e2/);
  });
});
