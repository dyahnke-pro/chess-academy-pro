// ISOLATED PAWNS HAVE ONE OWNER (dup map, smaller sets): `findWeakPawns`
// carried its own copy of the rule `describeStructure` already computes. It now
// reads the structure computer, so the two can never disagree.
import { describe, it, expect } from 'vitest';
import { findWeakPawns } from './positionReadingService';
import { pawnsOf } from './boardStructure';

const BOARDS = [
  'r1bqkb1r/pp3ppp/2n1pn2/3p4/3P4/2NB1N2/PP3PPP/R1BQK2R w KQkq - 0 8', // IQP on d4
  'r7/pp3k2/3p1N2/6P1/3nP3/1P6/6K1/5R2 b - - 0 31',                       // Smith-Morra ending
  '4k3/p1p3p1/8/8/8/8/P3P2P/4K3 w - - 0 1',
];

describe('findWeakPawns.isolated is the structure computer’s', () => {
  for (const fen of BOARDS) for (const c of ['w', 'b'] as const) {
    it(`${fen.split(' ')[0]} ${c}`, () => {
      expect([...findWeakPawns(fen, c).isolated].sort()).toEqual([...pawnsOf(fen, c).isolated].sort());
    });
  }
  it('the IQP is isolated', () => {
    expect(findWeakPawns(BOARDS[0], 'w').isolated).toEqual(['d4']);
  });
});
