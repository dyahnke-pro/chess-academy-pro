import { describe, expect, it } from 'vitest';
import { inaccessibleHole } from './inaccessibleHole';

// Danya, "Weak Squares, Who Cares?" (audit-reports/danya-havecheck).
const F4 = '3rr1k1/1p3np1/p1p1pq1p/2Pp1p2/PP1P4/3QPPBP/6PK/2RR4 w - - 0 27'; // 27.f4: e4 weak, Black needs eight moves to get a knight there; f4 stops ...e5
const E4 = '1r3rk1/1pp1npp1/p3qn1p/1Pp1p3/P1P5/2NPPNP1/5PKP/1R1Q1R2 w - - 0 19'; // 19.e4: d4 weak, "partial inaccessibility"

describe('inaccessibleHole', () => {
  it('27.f4: e4 is weak but no black knight or bishop has a road there, and ...e5 is stopped', () => {
    const r = inaccessibleHole(F4, 'f4', 'w');
    expect(r?.hole).toBe('e4');
    expect(r?.moves).toBeNull();
    expect(r?.stops).toEqual([{ pawn: 'e6', to: 'e5' }]);
    expect(r?.text).toContain('Your pawn move leaves a weak square on e4');
    expect(r?.text).toContain('stops their e-pawn reaching e5');
  });
  it('19.e4: d4 is weak but their nearest minor needs six moves', () => {
    const r = inaccessibleHole(E4, 'e4', 'w');
    expect(r?.hole).toBe('d4');
    expect(r?.moves).toBe(6);
    expect(inaccessibleHole(E4, 'e4', 'b')?.text).toContain('Their pawn move leaves a weak square on d4');
  });
  it('stays silent when their knight reaches the hole at once', () => {
    expect(inaccessibleHole('4k3/8/3n4/8/8/5P2/6P1/4K3 w - - 0 1', 'f4', 'w')).toBeNull();
  });
  it('stays silent with no minor pieces, and on a move that leaves no hole', () => {
    expect(inaccessibleHole('4k3/r7/8/8/8/5P2/6P1/4K2R w - - 0 1', 'f4', 'w')).toBeNull();
    expect(inaccessibleHole(F4, 'Qe2', 'w')).toBeNull();
  });
});
