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

  // The speedrun replay (2026-11-17): their capture said as their threat, and
  // "both" only for two attackers.
  it('their count is their threat, and a third attacker is the third', () => {
    const BB4 = 'r1b1kbnr/pppp1ppp/2n5/4P3/8/2N2N2/PqPBPPPP/R2QKB1R b KQkq - 1 6'; // hv0P9kotpJw 6…Bb4
    const a = secondAttacker(BB4, 'Bb4');
    expect(a).not.toBeNull();
    const line = secondAttackerLine(a!, 'their', BB4);
    expect(line).toMatch(/They threaten to take on c3 and win your knight\./);
    expect(line).not.toMatch(/^.*Taking on c3/);
    const NC6 = 'rnb1r1k1/pppp1p2/5q1p/2b3p1/3N4/2P3B1/P1P1BPPP/R2QK2R b KQ - 2 12'; // _4xbS0Crtic 12…Nc6
    const b = secondAttacker(NC6, 'Nc6');
    expect(b?.attackers).toBe(3);
    const three = secondAttackerLine(b!, 'your', NC6);
    expect(three).toMatch(/adds a third attacker on their knight on d4\./);
    expect(three).not.toMatch(/both hit|second attacker/);
  });
});
