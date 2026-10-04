import { describe, expect, it } from 'vitest';
import { classifyCpLoss } from './gameAnalysisService';

// Review walk 2026-10-04, G1 (lichess SI5q0VJz) 41.Qxe5+: Qxd8# was mate in one,
// the move left White +7.8 and Review graded it GOOD while Learn called it a
// blunder. David 2026-10-04: "Keep it as a blunder in review."
const MATE_FOR_WHITE = 29_999;

describe('a missed forced mate is a blunder in review', () => {
  it('mate before, +7.8 after: blunder', () => {
    expect(classifyCpLoss(0, MATE_FOR_WHITE, 779, true)).toBe('blunder');
  });
  it('mate before, still mate after (a longer one): not a blunder', () => {
    expect(classifyCpLoss(0, MATE_FOR_WHITE, MATE_FOR_WHITE - 5, true)).not.toBe('blunder');
  });
  it('the same for Black', () => {
    expect(classifyCpLoss(0, -MATE_FOR_WHITE, -779, false)).toBe('blunder');
  });
});
