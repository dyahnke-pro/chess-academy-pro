import { describe, it, expect } from 'vitest';
import { readPosition, theirBishopPair } from './positionalRead';

// Danya's article boards (2026-11-18): the opponent held the bishop pair and
// the read never said it — "White's two bishops are the long-term danger".
const pairOf = (fen: string, student: 'white' | 'black'): ReturnType<typeof readPosition>[number] | undefined => readPosition(fen, student).find((o) => o.kind === 'pair');

describe('positionalRead — their bishop pair', () => {
  it('the anatomy of a brilliancy #2: White has the pair, Black to move', () => {
    const o = pairOf('r4rk1/p3pp1p/b1p3p1/3nq3/8/6P1/P2BPPBP/2RQR1K1 b - - 0 17', 'black');
    expect(o?.side).toBe('opponent');
    expect(o?.text).toMatch(/knight and bishop/);
    expect([...(o?.squares ?? [])].sort()).toEqual(['d2', 'g2']);
  });
  it('the two-knight advantage #1: two bishops against two knights', () => {
    expect(pairOf('r2q1rk1/ppp2ppp/2n1pn2/8/2QP1B2/2P1PP1P/P4P2/2KR1B1R b - - 0 13', 'black')?.text).toMatch(/two knights/);
  });
  it('weak squares, who cares #3: Black has the pair, White to move', () => {
    expect(pairOf('r1bq1rk1/1pp3pp/p1pb1p2/8/3NPP2/3QB3/PPP3PP/R4RK1 w - - 0 14', 'white')).toBeTruthy();
  });
  it('quiet when the pair is the student\'s own (the plan says it)', () => {
    expect(pairOf('2kr3r/1b1nqpn1/1p1p2p1/p1pPp2p/P1P1P2P/1NPBBPP1/3Q4/2KR3R w - - 0 20', 'white')).toBeUndefined();
  });
  it('quiet when both sides keep two bishops, or the two are on one colour', () => {
    expect(pairOf('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'white')).toBeUndefined();
    // Two light-squared bishops (c4 and d1, one promoted): no pair.
    expect(theirBishopPair('4k3/8/8/8/2B5/8/8/3BK1n1 w - - 0 1', 'w')).toBeNull();
    // b4 and d1: one of each colour, a pair.
    expect(theirBishopPair('4k3/8/8/8/1B6/8/8/3BK1n1 w - - 0 1', 'w')).not.toBeNull();
  });
});

describe('positionalRead — every weak pawn, never the first', () => {
  it('the positional rook lift #1: both doubled files, b and g', () => {
    const o = readPosition('r3k2r/1p3pbp/p2pq1p1/4p1P1/4P1P1/1PP5/1P3P2/R1BQK2R w KQkq - 0 18', 'white')
      .find((x) => x.key.startsWith('student-doubled-'));
    expect(o?.text).toMatch(/the b- and g-files are doubled/);
    expect(o?.aliases).toContain('student-doubled-g');
  });
  it('one doubled file is still said as one', () => {
    const o = readPosition('r3r1k1/1pq2ppp/pnp2n2/5P2/5b2/1BN4P/PPQ2PP1/R1BR3K w - - 0 18', 'white')
      .find((x) => x.key.startsWith('student-doubled-'));
    expect(o?.text).toMatch(/on the f-file are doubled/);
  });
});
