import { describe, it, expect } from 'vitest';
import { smallerShift, ACHIEVES_NOTHING_CP, SHIFT_COST_CP } from './weighedMoves';

describe('a try that keeps the result still costs (fix 8, his ?! moves)', () => {
  it('half a pawn inside an edge achieves nothing and gives part of it back', () => {
    expect(smallerShift(250, true, false, ACHIEVES_NOTHING_CP)).toBe('It achieves nothing, and gives back part of your edge.');
  });
  it('a reason that already said "wins nothing" is not said twice', () => {
    expect(smallerShift(250, true, true, 60)).toBe('It gives back part of your edge.');
  });
  it('a pawn or more is a real cost, never "achieves nothing"', () => {
    expect(smallerShift(-900, true, false, SHIFT_COST_CP + 200)).toBe('It makes your position a lot harder.');
    expect(smallerShift(0, false, false, SHIFT_COST_CP)).toBe('It leaves them clearly worse than the better move would.');
  });
});
