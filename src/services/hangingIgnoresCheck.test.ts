import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { findHangingPieces } from './tacticClassifier';

// Review walk 2026-10-04, game am-SI5q0VJz: "Newly undefended: your rook on
// a1" on 24…Kf8 and again on 25…Nd8. The rook had been loose since 24.Rc7+;
// the board in between read it as safe only because Black was in check.
describe('a hanging piece does not vanish while its attacker is in check', () => {
  it('Ra1 is loose with Black in check, as it is once the check is answered', () => {
    const inCheck = findHangingPieces(new Chess('r6r/1nR1k1pp/4pq2/3p1b2/Q7/P4N2/B4PPP/R5K1 b - - 1 24'));
    const answered = findHangingPieces(new Chess('r4k1r/1nR3pp/4pq2/3p1b2/Q7/P4N2/B4PPP/R5K1 w - - 2 25'));
    expect(inCheck.some((h) => h.square === 'a1')).toBe(true);
    expect(answered.some((h) => h.square === 'a1')).toBe(true);
  });
});
