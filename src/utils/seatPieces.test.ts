import { describe, it, expect } from 'vitest';
import { seatBare } from './seatPieces';

// Naroditsky's game after 22.Nc3 Rd8 (hand walk 2026-09-24), student White.
const FEN = '2kr4/1r3ppp/Rn1q2b1/1Ppp4/6P1/2NP3P/2P2PB1/Q4RK1 w - - 5 23';

describe('seatBare', () => {
  it('owns each piece from the board and REPLACES "the" (never "the their")', () => {
    expect(seatBare('Moving the knight on b6 would unveil the rook on a6 against the queen on d6', FEN, 'w'))
      .toBe('Moving their knight on b6 would unveil your rook on a6 against their queen on d6');
  });
  it('seats a bare description and capitalises the first word', () => {
    expect(seatBare('rook on a6 pins knight on b6 against queen on d6', FEN, 'w'))
      .toBe('Your rook on a6 pins their knight on b6 against their queen on d6');
  });
  it('leaves an already-owned piece alone', () => {
    expect(seatBare('your rook on a6 is active', FEN, 'w')).toBe('Your rook on a6 is active');
  });
});
