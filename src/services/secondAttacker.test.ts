import { describe, it, expect } from 'vitest';
import { secondAttacker, secondAttackerLine } from './secondAttacker';

const QF3 = 'r3r1k1/pbpq1ppp/1nNbpn2/1P1pB3/3P4/2NBP2P/PP3PP1/R2QK2R w KQ - 9 13';   // S-ZY3NtFO20, 13.Qf3
const BC4 = 'r1bqkb1r/pp1ppppp/2n5/7Q/4n3/8/PPPP1PPP/RNB1KBNR w KQkq - 2 5';        // 1Rejj6niwvo, 5.Bc4
const RC8 = 'r3k2r/p2qbpp1/2Qp1n1p/3P4/8/P1N2N2/1PP2PPP/R1B2RK1 b kq - 0 15';      // J4WzTSR3hmo, 15…Rc8

describe('secondAttacker — a second attacker makes the count', () => {
  it('Qf3 joins the bishop against the knight on f6, and taking there wins a pawn', () => {
    const a = secondAttacker(QF3, 'Qf3');
    expect(a).toMatchObject({ target: 'f6', partner: { square: 'e5', piece: 'b' }, attackers: 2, gain: 1, mate: null });
    const line = secondAttackerLine(a!, 'your', QF3);
    expect(line).toMatch(/pawn on g7 guards it/);
    expect(line).toMatch(/wins a pawn/);
  });

  it('Bc4 joins the queen on f7, where only the king guards and Qxf7 mates', () => {
    const a = secondAttacker(BC4, 'Bc4');
    expect(a).toMatchObject({ target: 'f7', mate: 'Qxf7#' });
    expect(secondAttackerLine(a!, 'their', BC4)).toMatch(/only the king guards it\. Qxf7 would be mate\./);
  });

  it('stays quiet on a plain attack and on a move that joins nothing', () => {
    // …Rc8 hits the queen on c6 beside the queen on d7: a smaller piece on a bigger one is an attack, not a count.
    expect(secondAttacker(RC8, 'Rc8')).toBeNull();
    // Qe2 instead of Qf3: the queen does not reach f6.
    expect(secondAttacker(QF3, 'Qe2')).toBeNull();
  });
});
