// D1 (coach audit 2026-09-11, findings #3/#4 + re-audit): the concept lane's
// broad "what's <word>" / "how does the" shapes over-match self-knowledge,
// app-method, and why-best-move asks. The ROOT fix is token-gated fall-through
// at DISPATCH (coachApi): the concept lane answers only with a real glossary
// token and otherwise falls through to the owning lane, with an honest decline
// as the last resort. So `conceptQuestion` MAY be true alongside a more-specific
// flag — that overlap is fine and is resolved by the router, not the detector.
// What this gate locks: the OWNING-lane detector fires for each phrasing (the
// input the router needs), and a genuine concept ask still flags concept.
import { describe, it, expect } from 'vitest';
import {
  buildQuestionGrounding,
  isConceptQuestion,
  isStrengthsQuestion,
  isTeachingMethodQuestion,
  isWhyBestMoveQuestion,
} from './questionIntents';

const FEN = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 4';

describe('D1 — owning-lane detectors fire (router resolves any concept overlap)', () => {
  it('#3 "what\'s the strongest part of my game" flags the strengths lane', () => {
    const ask = "what's the strongest part of my game?";
    expect(isStrengthsQuestion(ask)).toBe(true);
    const g = buildQuestionGrounding(ask, { fen: FEN });
    expect(g.strengthsQuestion).toBe(true);
  });

  it('#4 "how do you teach openings" flags the teaching-method lane', () => {
    const ask = 'how do you teach openings?';
    expect(isTeachingMethodQuestion(ask)).toBe(true);
    const g = buildQuestionGrounding(ask, { fen: FEN });
    expect(g.teachingMethodQuestion).toBe(true);
  });

  it('the two why-best-move phrasings that also match concept still flag why-best-move', () => {
    for (const ask of ["what's the idea behind the engine's move?", 'how does the engine see this?']) {
      expect(isWhyBestMoveQuestion(ask), ask).toBe(true);
      expect(buildQuestionGrounding(ask, { fen: FEN }).whyBestMoveQuestion, ask).toBe(true);
    }
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
