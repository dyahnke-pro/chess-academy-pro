import { describe, it, expect } from 'vitest';
import { readCriticalMoment, criticalMomentSpeaks, type CriticalFanLine } from './criticalMoment';

// Clean-pass walk, game SI5q0VJz ply 72 (after …Kf8): the fan read two mates
// and a +11 line, and the coach said "Two moves keep the forced mate here. The
// rest give it away." At depth 26, Qb4, Qc5, g4, Bc4 and g3 ALL mate. A line
// still +11 has not been shown NOT to mate — the search simply stopped first.
const FEN = '3n1k1r/2R3pp/5q2/1Q1B4/8/P4N2/5PPP/6K1 w - - 11 37';
const line = (rank: number, uci: string, mate: number | null, evaluation: number): CriticalFanLine =>
  ({ rank, evaluation, mate, bound: null, moves: [uci] });

describe('a mate count is unproven while a discard is still crushing', () => {
  it('two mates and a +11 line: silent, not "two moves keep the forced mate"', () => {
    const r = readCriticalMoment({
      topLines: [line(1, 'b5c5', 13, 0), line(2, 'b5b4', 15, 0), line(3, 'g2g3', null, 1261)],
      moverColor: 'w',
      fen: FEN,
    });
    expect(criticalMomentSpeaks(r)).toBe(false);
  });

  it('a discard that really drops the mate (+2) still lets the count speak', () => {
    const r = readCriticalMoment({
      topLines: [line(1, 'b5c5', 13, 0), line(2, 'b5b4', 15, 0), line(3, 'g2g3', null, 200)],
      moverColor: 'w',
      fen: FEN,
    });
    expect(r?.count).toBe(2);
    expect(criticalMomentSpeaks(r)).toBe(true);
  });
});
