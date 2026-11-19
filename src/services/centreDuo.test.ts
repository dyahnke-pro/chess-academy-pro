import { describe, expect, it } from 'vitest';
import { centreDuo } from './centreDuo';

// His own game (how-to-ruin-your-pawn-structure#3): "two menacing central pawns (e5 and f5), and
// White's central pawn structure is clearly deformed".
const RUIN = 'r4rk1/4q1p1/p2p3p/nppPpp2/6n1/2PP1N2/PPB2PPP/R2QR1K1 w - - 0 19';

describe('centreDuo', () => {
  it('names Black\'s e5-f5 duo against White\'s doubled d-pawns', () => {
    const r = centreDuo(RUIN, 'w');
    expect(r?.side).toBe('b');
    expect(r?.duo).toEqual(['e5', 'f5']);
    expect(r?.deformed.map((d) => d.square).sort()).toEqual(['d3', 'd5']);
    expect(r?.text).toContain('Their pawns on e5 and f5 stand side by side');
  });
  it('stays silent when the other centre is sound', () => {
    expect(centreDuo('2r5/3r4/p3k1bp/1p1pp1p1/8/1P2NPP1/PKPR2P1/4R3 b - - 0 25', 'b')).toBeNull();
    expect(centreDuo('r1q2rk1/1pbn1ppp/p1p1pn2/2Pp4/PP1P1B2/1QN1PB1P/5PP1/R4RK1 w - - 0 17', 'w')).toBeNull();
  });
});
