import { describe, it, expect } from 'vitest';
import { planFromUci } from './lookaheadPlan';

// Clean-pass walk, game mZ1GOTOw 21.Rc1: "Nd4 was their move, to walk the
// knight on f3 round to f5, by way of d4 and g7." The line runs Nd4, Nf5+,
// Nxg7, Nf5 — the knight reached f5, took on g7 and came back. You do not
// travel to f5 by way of g7 when you were already on f5.
const FEN = '3r3r/p3kpp1/1pp3np/4P3/4N3/P4N2/1B3PPP/R4K2 w - - 2 21';
const PV = ['f3d4', 'd8d5', 'd4f5', 'e7d8', 'f5g7', 'g6e5', 'g7f5', 'h8f8', 'e4f6', 'd5b5', 'b2c3', 'e5c4'];

describe('a route ends where the piece first arrives', () => {
  it('names d4 alone on the way to f5, never the loop through g7', () => {
    const text = planFromUci(FEN, PV, 'white', null)?.mine.text ?? '';
    expect(text).not.toMatch(/by way of d4 and g7/);
  });
});
