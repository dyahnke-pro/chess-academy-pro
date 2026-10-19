// "they guard it no times" (replay 2026-10-19, David's Smith-Morra 17.hxg3
// Rxf2): an unguarded weak pawn is counted in words.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { deriveNextPlanFacts } from './nextPlans';

describe('the weak-pawn count reads as English', () => {
  it('never "no times"', () => {
    const c = new Chess();
    for (const m of 'e4 c5 d4 cxd4 c3 dxc3 Nxc3 d6 Bc4 Nc6 Nf3 g6 O-O Bg7 Bxf7+ Kxf7 Ng5+ Ke8 Bf4 Nf6 Re1 Qa5 Qb3 Rf8 Rad1 Ng4 Rd5 Qb4 Bg3 Be5 Nxh7 Bxg3 hxg3 Rxf2'.split(' ')) c.move(m);
    const text = deriveNextPlanFacts(c.fen(), 'w', { studentPovCp: null }).map((p) => p.text).join(' ');
    expect(text).not.toMatch(/no times/);
  });
});

describe('the how names only pieces on the board', () => {
  it('a knight ending never says "heavy pieces" (replay 2026-10-19, 42.Nb5)', () => {
    const c = new Chess();
    const sans = 'e4 c5 d4 cxd4 c3 dxc3 Nxc3 d6 Bc4 Nc6 Nf3 g6 O-O Bg7 Bxf7+ Kxf7 Ng5+ Ke8 Bf4 Nf6 Re1 Qa5 Qb3 Rf8 Rad1 Ng4 Rd5 Qb4 Bg3 Be5 Nxh7 Bxg3 hxg3 Rxf2 Rg5 Qxb3 axb3 Rxb2 Rxg6 Kf7 Rg5 Rf2 Nd5 Bd7 Rxg4 Rxg2+ Kxg2 Bxg4 Rf1+ Kg8 Nhf6+ exf6 Nxf6+ Kf8 Nxg4+ Ke7 Nf6 Kf7 g4 Nd4 g5 Nxb3 Nd5+ Kg7 Rf6 Nc5 Kf3 Rf8 Rxf8 Kxf8 g6 a5 Nc3 Nb3 Kf4 Nd4 Kg5 Ne6+ Kf6 Nf4 g7+ Kg8 Nb5 Nh5+'.split(' ');
    for (const m of sans) c.move(m);
    const text = deriveNextPlanFacts(c.fen(), 'w', { studentPovCp: null }).map((p) => p.text).join(' ');
    expect(text).not.toMatch(/heavy pieces/);
  });
});
