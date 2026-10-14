import { describe, it, expect } from 'vitest';
import { withSubject } from './openSentence';
import { buildDrillBetterLine } from '../services/learnMoveTeaching';

describe('a move teaching sentence has a subject (review audit 2026-10-14)', () => {
  it('gives a verb-first stem the move as its subject', () => {
    expect(withSubject('Stakes a claim in the center.', 'd4')).toBe('d4 stakes a claim in the center.');
  });
  it('leaves a sentence that has a subject alone', () => {
    expect(withSubject('The knight bears down on d5.', 'Nc3')).toBe('The knight bears down on d5.');
    expect(withSubject('Nxe5 wins a pawn.', 'Nxe5')).toBe('Nxe5 wins a pawn.');
  });
  it("Learn's drill walkout never speaks a fragment", () => {
    const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const steps = buildDrillBetterLine(start, ['d4', 'd5', 'c4'], 0);
    expect(steps[0].why).toMatch(/^d4 /);
    for (const st of steps) if (st.why) expect(st.why).not.toMatch(/^(Stakes|Gains|Forces|Fights|Secures|Opens|Hits|Leans|Takes)\b/);
  });
});
