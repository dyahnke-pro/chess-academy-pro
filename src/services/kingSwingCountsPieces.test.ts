import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { planFromUci } from './lookaheadPlan';

// Clean-pass review walk 2026-10-04, G2 35.Rxf5: "the stronger move was Qxf5 —
// it would swing pieces toward your king" for Qxf5 Qxf5 Rxf5 Be4 Rf7: the
// queens come off and ONE rook lands near the king twice. Pieces, not landings.
describe('swinging pieces toward the king counts pieces', () => {
  it('one rook landing twice is not "pieces"', () => {
    const fen = '2r1r2k/pp4pp/2b1P3/4Ppq1/8/1B1Q4/PP3RP1/6K1 w - - 4 35';
    const sans = ['Qxf5', 'Qxf5', 'Rxf5', 'Be4', 'Rf7'];
    const c = new Chess(fen);
    const uci = sans.map((s) => { const m = c.move(s); return m.from + m.to; });
    const plan = planFromUci(fen, uci, 'white', null);
    expect(plan?.mine.nearEnemyKing ?? 0).toBeLessThan(2);
    expect(JSON.stringify(plan?.mine.spokenClauses ?? [])).not.toMatch(/swing pieces/);
  });
});
