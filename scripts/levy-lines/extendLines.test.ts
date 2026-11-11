// The course walker that carries a lesson line on to a middlegame must read at
// least as deep as the fact sheet that will grade every move it picks. At depth
// 12 it played Nc3 (+2.1) on the GothamChess Fantasy main line, a move the
// sheet's depth-14 read scores as level against Nxf7 — a 2-pawn miss taught as
// the line's last move.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const walker = readFileSync('scripts/levy-lines/extend-lines.mjs', 'utf8');
const sheet = readFileSync('src/services/lessonFacts.measure.test.ts', 'utf8');

describe('extend-lines walks at least as deep as the fact sheet grades', () => {
  it('passes a walk depth to the walker, no shallower than the sheet', () => {
    const walk = Number(/const WALK_DEPTH = (\d+);/.exec(walker)?.[1]);
    const graded = Number(/LESSON_DEPTH \?\? (\d+)/.exec(sheet)?.[1]);
    expect(graded).toBeGreaterThan(0);
    expect(walk).toBeGreaterThanOrEqual(graded);
    expect(walker).toMatch(/depth: WALK_DEPTH/);
  });
});
