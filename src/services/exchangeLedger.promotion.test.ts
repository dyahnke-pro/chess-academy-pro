import { describe, expect, it } from 'vitest';
import { computeExchangeLedger, describeProofResult } from './exchangeLedger';

// A PAWN THAT QUEENS IS THE RESULT (Danya narration test 2026-11-19, pawn
// endgames a practical guide #2, saved engine line −451): "e4? Then they play
// g2, you answer exd5 and they play g1=Q — you win a pawn" said the capture
// and missed their new queen.
describe('describeProofResult — a line that queens', () => {
  const fen = '8/8/5p2/2Pp4/3P1Pk1/3KP1p1/8/8 w - - 0 54';
  it('their new queen is the result, not the pawn won on the way', () => {
    const l = computeExchangeLedger(fen, ['e4', 'g2', 'exd5', 'g1=Q'], 'w');
    expect(describeProofResult(l!, { fen, student: 'w' })).toBe('they queen first');
  });
  it('negative control: the same captures without the promotion still win a pawn', () => {
    const l = computeExchangeLedger(fen, ['e4', 'g2', 'exd5'], 'w');
    expect(describeProofResult(l!, { fen, student: 'w' })).toBe('you win a pawn');
  });
});
