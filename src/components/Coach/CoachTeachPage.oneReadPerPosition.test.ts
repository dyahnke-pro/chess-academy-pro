import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// 🔒 ONE READ PER POSITION (clean-pass walk 2026-10-03, G1 ply 61). The coach
// told the student "There's a forced mate here, starting with Qa7+" from its
// coach-turn probe, then graded their move off the 5-second eval-bar read of
// the same board: "Qa7+ was cleaner — it would win the queen for a pawn". The
// student's move is judged by the read the student was already told about.
describe('the student move is judged by the coach-turn read of that board', () => {
  it('preStudentRead prefers studentBestReadRef for the same position', () => {
    const src = readFileSync(resolve(__dirname, 'CoachTeachPage.tsx'), 'utf8').replace(/\/\/.*$/gm, '');
    const at = src.indexOf('const preStudentRead =');
    expect(at).toBeGreaterThan(0);
    const decl = src.slice(at - 400, at + 300);
    expect(decl).toMatch(/studentBestReadRef\.current\.analysis/);
    expect(decl.indexOf('probeRead ??')).toBeGreaterThan(0);
    expect(src).toMatch(/analysis: studentBest \}/);
  });
});
