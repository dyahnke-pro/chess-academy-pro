import { describe, it, expect } from 'vitest';
import { studentRoutePhrase, type Aim } from './planArc';

// David's Smith-Morra replay (2026-10-19), move 26: "The plan for you here:
// getting the knight to g4, by way of f6, to take the bishop there" — f6 was
// his next move (Nxf6+). The student's route is said by its goal.
describe("the student's route names its goal, never the next hop", () => {
  const aim: Aim = {
    id: 'route:n', kind: 'route', squares: ['f6', 'g4'], goal: 'g4', from: 'h7',
    phrase: 'getting the knight to g4, by way of f6', route: { name: 'knight', path: ['h7', 'f6', 'g4'], takes: 'bishop' },
  } as unknown as Aim;
  it('drops the waypoints', () => {
    const p = studentRoutePhrase(aim, 'h7');
    expect(p).not.toMatch(/f6/);
    expect(p).toMatch(/g4/);
  });
});
