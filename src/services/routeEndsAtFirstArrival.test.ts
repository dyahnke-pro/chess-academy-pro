import { describe, expect, it } from 'vitest';
import { phraseFrom, type Aim } from './planArc';

// Review walk 2026-10-04, G2 (lichess VRUh4Qgh) 18…Ng4: "That was the plan:
// getting the knight to g4, by way of f6, g4 and f2." A route never names its
// own destination as a waypoint, nor squares visited after it first arrived.
describe('a route ends where it first arrives', () => {
  it('drops the destination and everything after the first arrival', () => {
    const aim: Aim = { id: 'route:n', kind: 'route', squares: ['f6', 'g4', 'f2', 'g4'], goal: 'g4', phrase: 'getting the knight to g4, by way of f6', from: 'd5', route: { name: 'knight', path: ['d5', 'f6', 'g4', 'f2', 'g4'] } } as Aim;
    const text = phraseFrom(aim, 'f6');
    expect(text).toBe('getting the knight to g4');
  });
});
