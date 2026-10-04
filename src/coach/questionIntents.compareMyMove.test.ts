/**
 * Walk defect 11 (hand walk 2026-10-04, custom lesson): "why is that move
 * better than what I played?" was captured by the why-best-move lane and
 * answered "The engine plays g5…" — the student's own move never mentioned.
 * "What I played" is a referent: the question compares the student's move
 * with a better one, which is the retrospective verdict on THEIR move.
 */
import { describe, it, expect } from 'vitest';
import { buildQuestionGrounding, isCompareMyMoveQuestion, retrospectiveMoveRef } from './questionIntents';

const FEN = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 6 5';

describe('compare-my-move', () => {
  const asks = [
    'why is that move better than what I played?',
    'why is that better than what i played',
    'how is Nxe7 better than my move?',
    'what was wrong with what I played?',
    "why wasn't my move good enough?",
    'is that stronger than mine?',
    'why that instead of what I played?',
  ];
  for (const q of asks) {
    it(`"${q}" → the student's own last move, never the best-move-now walk`, () => {
      expect(isCompareMyMoveQuestion(q)).toBe(true);
      expect(retrospectiveMoveRef(q)).toEqual({ kind: 'my-last' });
      const g = buildQuestionGrounding(q, { fen: FEN });
      expect(g.retrospectiveMoveQuestion).toBe(true);
      expect(g.whyBestMoveQuestion).toBe(false);
    });
  }

  const not = [
    'why is that the best move?',
    'why is Nf3 better than e5?',
    'what did you play?',
    'is this position better than what you played last game',
  ];
  for (const q of not) {
    it(`NEGATIVE CONTROL — "${q}" is not about the student's own move`, () => {
      expect(isCompareMyMoveQuestion(q)).toBe(false);
    });
  }
});
