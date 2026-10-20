// "You play knight to f3 first, so you can castle next" named the student's
// next move in Learn (hand walk 2026-10-20, Smith-Morra 6.Nf3, then 7.O-O; OS-11
// heard it in all four games). Held, the castle is said as what the move
// cleared, never as the move to play.
import { describe, it, expect } from 'vitest';
import { intentWithFallback } from './movePurpose';
import type { AnalysisLine } from '../types';

const BEFORE_NF3 = 'r1bqkbnr/pp2pppp/2np4/8/2B1P3/2N5/PP3PPP/R1BQK1NR w KQkq - 2 6';
const line = (moves: string[], evaluation = 20): AnalysisLine => ({ rank: 1, evaluation, mate: null, moves } as AnalysisLine);
const reads = { before: [line(['g1f3', 'g7g6', 'e1g1'])], after: [line(['g7g6', 'e1g1'])], passBefore: [], passAfter: [] };

describe('moveIntent — a castle the move prepares, in Learn', () => {
  it('held: says what the move cleared, never "castle next"', () => {
    const texts = [0, 1, 2, 3].map(() => intentWithFallback(BEFORE_NF3, 'Nf3', reads, 'student', false, false)?.text ?? '');
    for (const t of texts) expect(t).not.toMatch(/castle next/);
    expect(texts.some((t) => /clears/.test(t))).toBe(true);
  });
  it('named (review, chat): may still say it', () => {
    const t = intentWithFallback(BEFORE_NF3, 'Nf3', reads, 'student', false, true)?.text ?? '';
    expect(t).toMatch(/castle/);
  });
});
