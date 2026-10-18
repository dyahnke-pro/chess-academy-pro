import { describe, it, expect } from 'vitest';
import { fadeText } from './fadeText';
describe('a question fades whole, never to a dangling question', () => {
  const q = 'How do you find a plan? First the forcing scan — checks, captures, threats. ‖ Their weakness: the pawn on d6. Your worst piece: the bishop on c1.';
  it('a proven skill is not asked — the point of the answer is said', () => {
    expect(fadeText(q, 'short')).toBe('Their weakness: the pawn on d6.');
  });
  it('a lighter skill keeps the question with its answer', () => {
    expect(fadeText(q, 'lighter')).toBe(q);
  });
});
