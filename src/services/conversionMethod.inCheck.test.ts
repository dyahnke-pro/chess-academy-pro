import { describe, expect, it } from 'vitest';
import { readConversion } from './conversionMethod';

// NO CONVERSION PLAN WHILE IN CHECK, AND THE STUDENT'S OWN LOOSE PIECE COUNTS
// (Danya narration test 2026-11-19, how to ruin your pawn structure #0).
describe('readConversion', () => {
  it('in check with the queen hanging is not "up material, finish developing"', () => {
    expect(readConversion('1r2k2r/4bpp1/p2pbN1p/1p2p3/4P1P1/P3BP2/1PPq3P/1K1R1B1R b k - 0 17', 'b')).toBeNull();
  });
  it('negative control: a clean extra rook still gets the method', () => {
    expect(readConversion('6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1', 'w')).not.toBeNull();
  });
});
