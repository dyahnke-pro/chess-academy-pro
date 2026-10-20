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

describe('the plan method fades for a student who has proven planning (planArc, 2026-10-20)', () => {
  it('a proven no-plan skill hears the plan, not the method again', async () => {
    const { askThenAnswer } = await import('../utils/thinkPause');
    const { fadeWhenGreen } = await import('./learnTurnDoor');
    const method = `${askThenAnswer('How do you find a plan? First the forcing scan — checks, captures, threats. Then three things: where is their weakness, which of your pieces is worst, where is your pawn break?', 'Checks, captures, threats: nothing forcing. Your worst piece: the bishop on c1.', () => null)} So the plan: bring the bishop on c1 to e3; then break open with the push to f4. Why in that order? A break opens the position.`;
    expect(fadeWhenGreen('planArc', method, new Map([['no-plan', 'short' as const]]))).toBe('The plan: bring the bishop on c1 to e3; then break open with the push to f4.');
    expect(fadeWhenGreen('planArc', method, new Map([['no-plan', 'lighter' as const]]))).toBe(method);
    expect(fadeWhenGreen('planArc', method, null)).toBe(method);
  });
});
