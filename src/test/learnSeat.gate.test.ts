import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// THE SEAT IS NEVER THE SIDE TO MOVE (David 2026-10-19: "at one point computer
// got confused about me being white"). Learn's answers derived the student's
// colour from the FEN's turn, and after the student's move that is the
// opponent. The seat comes from the seat (playerColor / the drill / the lesson).
describe('Learn reads the student\'s seat, never the turn', () => {
  const src = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
  it('no student colour is taken from the side to move', () => {
    const lines = src.split('\n').filter((l) => /student\w*\s*=\s*fenTurn\b|studentColor\s*=\s*fenTurn\s*===|student\w*:\s*fenTurn\b/.test(l));
    expect(lines).toEqual([]);
  });
});
