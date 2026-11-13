import { describe, expect, it } from 'vitest';
import { computeMoveFundamentals } from './moveFundamentals';

const led = (fen: string, san: string, side: 'white' | 'black'): string[] => computeMoveFundamentals(fen, san, side).map((f) => f.led);

describe('doubling rooks', () => {
  // Danya (vc-0ipLPOAN_m8) called R8a3 "doubling", but the rooks on a8 and
  // a2 already stood on one open file with nothing between: no new doubling.
  it('a rook sliding toward its partner on a file they already share is not new', () => {
    expect(led('r5k1/4pp2/3p3p/1b1P2pP/4P1P1/1N6/r1p2PBK/2R5 b - - 1 32', 'R8a3', 'black').some((l) => /doubles/.test(l))).toBe(false);
  });
  it('a rook onto an open file in front of its partner takes the file and doubles', () => {
    expect(led('3r2k1/5ppp/8/8/8/8/4RPPP/3R2K1 w - - 0 1', 'Red2', 'white')).toContain('doubles your rooks on the open d-file');
  });
  it('two rooks on the home rank are only connected, not doubled', () => {
    expect(led('6k1/5ppp/8/8/8/8/5PPP/R5RK w - - 0 1', 'Rd1', 'white').some((l) => /doubles/.test(l))).toBe(false);
  });
});

describe('a rook outpost', () => {
  // Danya (vc-1AMYr01rkHE): "The rook drops onto d3 — a dream outpost deep in
  // White's camp."
  it('…Rd3, held by the c4-pawn, is a rook outpost', () => {
    expect(led('5bk1/3r1n1p/pBp1q1p1/Pb2p3/2p1P3/1pP3NP/1P3PPK/R1Q2N2 b - - 2 30', 'Rd3', 'black')).toContain('plants your rook on the d3 outpost, deep in their camp where no pawn of theirs can attack it');
  });
});

describe('unmasking a file', () => {
  // Danya (vc-1AMYr01rkHE): "The knight steps to f7, unmasking the rook so it
  // bears straight down the file."
  it('…Nf7 off the d-file unmasks the rook on d7', () => {
    expect(led('3r1bk1/3r3p/p1pnqpp1/Pb2p3/2pPP3/1pP1BNNP/1P1R1PPK/R1Q5 b - - 3 26', 'Nf7', 'black').some((l) => /^unmasks your rook on d7, which now looks straight down the d-file/.test(l))).toBe(true);
  });
});
