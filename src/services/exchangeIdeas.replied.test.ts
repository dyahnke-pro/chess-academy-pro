// A read of THEIR reply is history once they have replied (hand walk
// 2026-10-20, David's Smith-Morra, 14.Rd5 Qb4). On the board after 14.Rd5 the
// read is true — if they take on f4 anyway, the queen on a5 drops. Spoken after
// 14…Qb4 it named a queen that had already left a5.
import { describe, it, expect } from 'vitest';
import { exchangeIdeas } from './exchangeIdeas';

const BEFORE_RD5 = 'r1b1kr2/pp2p1bp/2np2p1/q5N1/4PBn1/1QN5/PP3PPP/3RR1K1 w - - 10 14';
const AFTER_RD5 = 'r1b1kr2/pp2p1bp/2np2p1/q2R2N1/4PBn1/1QN5/PP3PPP/4R1K1 b - - 11 14';
const AFTER_QB4 = 'r1b1kr2/pp2p1bp/2np2p1/3R2N1/1q2PBn1/1QN5/PP3PPP/4R1K1 w - - 12 15';
const studentMove = { fenBefore: BEFORE_RD5, san: 'Rd5', costCp: 190, bestSan: 'e5', history: null };

describe('exchangeIdeas — a read of their reply after they have replied', () => {
  it('on the board after the student’s move, the read holds: their queen on a5 drops', () => {
    const xs = exchangeIdeas({ fen: AFTER_RD5, student: 'w', lines: [], studentMove, nameMove: false });
    expect(xs.find((x) => x.id === 'threat-cost')?.text).toMatch(/queen on a5/);
  });
  it('after 14…Qb4 it is not said — the queen is no longer on a5', () => {
    const xs = exchangeIdeas({ fen: AFTER_QB4, student: 'w', lines: [], studentMove, nameMove: false });
    expect(xs.find((x) => x.id === 'threat-cost')).toBeUndefined();
    expect(xs.some((x) => /queen on a5/.test(x.text))).toBe(false);
  });
});
