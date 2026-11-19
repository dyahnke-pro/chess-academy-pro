import { describe, expect, it } from 'vitest';
import { pawnCentre } from './pawnCentre';

// Real Danya boards (audit-reports/danya-havecheck): where he names the centre, and controls.
const CARLSEN_ANAND = '2r5/3r4/p3k1bp/1p1pp1p1/8/1P2NPP1/PKPR2P1/4R3 b - - 0 25'; // "Black has built an impressive pawn center"
const VAN_WELY = 'r2q1rk1/ppp2ppp/2n1pn2/8/2QP1B2/2P1PP1P/P4P2/2KR1B1R b - - 0 13'; // "White has a menacing pawn centre"
const BRILLIANCY = 'r1q2rk1/1pbn1ppp/p1p1pn2/2Pp4/PP1P1B2/1QN1PB1P/5PP1/R4RK1 w - - 0 17'; // both sides have a centre pawn
const NO_PAWNS = 'r3r1k1/1pq2ppp/pnp2n2/5P2/5b2/1BN4P/PPQ2PP1/R1BR3K w - - 0 18'; // nobody has a centre pawn

describe('pawnCentre', () => {
  it('names Black\'s d5-e5 centre on Carlsen–Anand, with the squares it takes', () => {
    const r = pawnCentre(CARLSEN_ANAND, 'b');
    expect(r?.side).toBe('b');
    expect(r?.pawns).toEqual(['d5', 'e5']);
    expect(r?.takes).toEqual(['c4', 'd4', 'e4', 'f4']);
    expect(r?.text).toContain('Your pawns on d5 and e5 hold the centre');
    expect(pawnCentre(CARLSEN_ANAND, 'w')?.text).toContain('You have no centre pawn');
  });
  it('names White\'s d4 with e3 ready to join on Van Wely–Naroditsky', () => {
    const r = pawnCentre(VAN_WELY, 'w');
    expect(r?.side).toBe('w');
    expect(r?.pawns).toEqual(['d4']);
    expect(r?.joins).toEqual(['e3']);
  });
  it('stays silent when both sides have a centre pawn', () => {
    expect(pawnCentre(BRILLIANCY, 'w')).toBeNull();
  });
  it('stays silent when nobody has a centre pawn', () => {
    expect(pawnCentre(NO_PAWNS, 'w')).toBeNull();
  });
});
