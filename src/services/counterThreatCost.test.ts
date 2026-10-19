// A counter-threat is credited only when the move held (replay 2026-10-19,
// 14.Rd5: left the bishop, hit the queen, cost two points, praised).
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { counterThreatTeaching } from './learnBoardTeaching';

const SANS = 'e4 c5 d4 cxd4 c3 dxc3 Nxc3 d6 Bc4 Nc6 Nf3 g6 O-O Bg7 Bxf7+ Kxf7 Ng5+ Ke8 Bf4 Nf6 Re1 Qa5 Qb3 Rf8 Rad1 Ng4'.split(' ');

describe('danger levels needs the move to hold', () => {
  it('14.Rd5 (cost 211cp) is not praised; the same move at no cost is', () => {
    const c = new Chess(); for (const s of SANS) c.move(s);
    expect(counterThreatTeaching(c.fen(), 'Rd5', 'w', 211)).toBeNull();
    expect(counterThreatTeaching(c.fen(), 'Rd5', 'w', null)).toBeNull();
    expect(counterThreatTeaching(c.fen(), 'Rd5', 'w', 10)?.text).toMatch(/bigger threat comes first/);
  });
});
