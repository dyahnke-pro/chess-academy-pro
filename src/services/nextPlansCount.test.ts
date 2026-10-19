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
