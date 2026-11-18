// THE STUDENT'S ERROR BAR IN LEARN (David 2026-11-18): a pawn and a half under
// 1000, a pawn to 2000, inaccuracies above. One bar every Learn grade reads.
import { describe, it, expect } from 'vitest';
import { learnErrorBarCp } from './slipDetector';

describe('learnErrorBarCp', () => {
  it('the three bars by rating', () => {
    expect(learnErrorBarCp(800)).toBe(150);
    expect(learnErrorBarCp(1409)).toBe(100);
    expect(learnErrorBarCp(2147)).toBe(50);
  });
});
