// D1 (coach audit 2026-09-11, findings #3/#4): the concept lane's broad
// "what's <word>" / "how does the" / "explain" shapes matched self-knowledge
// and app-method asks, and concept dispatches BEFORE those lanes, so it stole
// them — the student asking "what's the strongest part of my game" was told
// what a concept is. isConceptQuestion now defers to the owning lane.
import { describe, it, expect } from 'vitest';
import {
  buildQuestionGrounding,
  isConceptQuestion,
  isStrengthsQuestion,
  isTeachingMethodQuestion,
} from './questionIntents';

const FEN = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 4';

describe('D1 — concept lane defers to the self-knowledge / app-method lanes', () => {
  it('#3 "what\'s the strongest part of my game" is a strengths ask, not concept', () => {
    const ask = "what's the strongest part of my game?";
    expect(isStrengthsQuestion(ask)).toBe(true);
    expect(isConceptQuestion(ask)).toBe(false);
    const g = buildQuestionGrounding(ask, { fen: FEN });
    expect(g.strengthsQuestion).toBe(true);
    expect(g.conceptQuestion).toBeFalsy();
  });

  it('#4 "how do you teach openings" is a teaching-method ask, not concept', () => {
    const ask = 'how do you teach openings?';
    expect(isTeachingMethodQuestion(ask)).toBe(true);
    expect(isConceptQuestion(ask)).toBe(false);
    const g = buildQuestionGrounding(ask, { fen: FEN });
    expect(g.teachingMethodQuestion).toBe(true);
    expect(g.conceptQuestion).toBeFalsy();
  });

  it('a REAL concept ask still flags conceptQuestion', () => {
    expect(isConceptQuestion('what is a fork?')).toBe(true);
    expect(isStrengthsQuestion('what is a fork?')).toBe(false);
    const g = buildQuestionGrounding('what is a fork?', { fen: FEN });
    expect(g.conceptQuestion).toBe(true);
  });
});

describe('#5 — an endgame ask suppresses the plan lane (plan dispatches first)', () => {
  const ENDGAME_FEN = '4r3/5pk1/6p1/8/8/6P1/4R1K1/8 w - - 0 1';
  it('"what\'s my plan in this rook endgame?" is an endgame ask, not a plan ask', () => {
    const g = buildQuestionGrounding("what's my plan in this rook endgame?", { fen: ENDGAME_FEN });
    expect(g.endgameQuestion).toBe(true);
    expect(g.planQuestion).toBe(false);
  });
  it('a plain "what\'s my plan here?" still flags planQuestion', () => {
    const g = buildQuestionGrounding("what's my plan here?", { fen: FEN });
    expect(g.planQuestion).toBe(true);
    expect(g.endgameQuestion).toBeFalsy();
  });
});
