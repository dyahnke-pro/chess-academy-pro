import { describe, expect, it } from 'vitest';
import { harmlessWeakPawns } from './harmlessWeakPawns';

// Anand–Ivanchuk (how-to-ruin-your-pawn-structure#1): "Black's 'weak' pawns are safely
// defended by the e7 bishop and do not change the evaluation". Engine: -23 (Black a hair better).
const ANAND = '1r2k2r/4bp2/p2pbp2/1p2p2p/4P1P1/P3BP2/1PPR3P/1K3B1R w k - 0 18';

describe('harmlessWeakPawns', () => {
  it('names Black\'s doubled f-pawns as held by the bishops and costing nothing', () => {
    const r = harmlessWeakPawns(ANAND, 'w', { cp: -23, mate: null });
    expect(r?.side).toBe('b');
    expect(r?.pawns.map((p) => p.square).sort()).toEqual(['f6', 'f7']);
    expect(r?.text).toContain('Their doubled pawns on f7 and f6 look weak');
    expect(r?.text).toContain('the bishop on e7');
  });
  it('stays silent when the engine has the bent side clearly worse', () => {
    expect(harmlessWeakPawns(ANAND, 'w', { cp: 200, mate: null })).toBeNull();
  });
  it('stays silent when the doubled pawns can be attacked', () => {
    // White's rook on f1 hits the doubled f-pawns.
    expect(harmlessWeakPawns('4k3/5p2/4bp2/8/8/8/8/4KR2 w - - 0 1', 'w', { cp: 0, mate: null })).toBeNull();
  });
  it('stays silent on Danya\'s other structure board, where he means the pieces', () => {
    expect(harmlessWeakPawns('r4rk1/4q1p1/p2p3p/nppPpp2/6n1/2PP1N2/PPB2PPP/R2QR1K1 w - - 0 19', 'w', { cp: 90, mate: null })).toBeNull();
  });
});
