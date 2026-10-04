import { describe, it, expect } from 'vitest';
import { readConversion } from './conversionMethod';

// Clean-pass walk, game VRUh4Qgh after 25…Bxh4: "You're a piece up — trade
// pieces, not pawns." Black has two rooks and two bishops against a rook, a
// bishop and two knights — the exchange and a pawn up, not an extra piece.
const FEN = 'r4rk1/pp1b2pp/4p3/3PPp2/7b/2NQ1N2/PPB2qP1/R6K w - - 0 26';

describe('the edge is named by what is really extra', () => {
  it('the exchange and a pawn is not "a piece"', () => {
    const text = readConversion(FEN, 'b')?.text ?? '';
    expect(text).not.toMatch(/a piece up/);
    expect(text).toMatch(/the exchange and a pawn up/);
  });
});
