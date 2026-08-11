// THE THREE QUESTIONS DAVID ASKED THE COACH ON 2026-08-11, AND WHAT IT DID.
//
// He typed three, and PostHog recorded two failures: the first answered with a
// sentence that opened on a dangling "it" (the fidelity gate had stripped the
// sentence the pronoun referred to, and shipped the remainder), and the third
// restated his own move back at him. Only the middle one worked.
//
// The routing was the root of two of the three: neither "what is the plan for
// white and black" nor "why play night c3?" matched the intent that owns the
// answer, so the question fell through to the general path, which has no
// grounded package to voice and can only phrase.
import { describe, it, expect } from 'vitest';
import { isPlanQuestion, isWhyBestMoveQuestion } from './questionIntents';

describe("David's questions, verbatim", () => {
  it('routes "why play night c3?" to the why-this-move lane', () => {
    // "night" is his typing, and it is the common one — the spoken word for a
    // knight is spelled that way by everybody typing fast. It must not be the
    // reason the question misses.
    expect(isWhyBestMoveQuestion('Why play night c3?')).toBe(true);
  });

  it('routes the same question however the verb is inflected', () => {
    for (const ask of [
      'why play Nc3',
      'why playing Nc3?',
      'why move the knight to c3',
      'why develop the bishop to b5?',
      'why take on e5',
      'why castle here?',
      'why push d4',
      'why trade queens',
      'why Nc3?',
      'why the knight to c3?',
    ]) {
      expect(isWhyBestMoveQuestion(ask), ask).toBe(true);
    }
  });

  it('routes a plan question asked about BOTH sides', () => {
    // His first question. The lane existed and had the answer — the plan is
    // computed per side off one PV — and the phrasing simply did not match.
    for (const ask of [
      'What is the plan for white and black?',
      'plan for both sides?',
      'what are the plans here',
      "what's white trying to do?",
      'what is black up to',
      'what is my opponent planning',
      'what are they going for here?',
    ]) {
      expect(isPlanQuestion(ask), ask).toBe(true);
    }
  });

  it('still routes the one that already worked', () => {
    expect(isPlanQuestion('What is my plan')).toBe(true);
  });

  it('does not swallow questions that belong to another lane', () => {
    expect(isWhyBestMoveQuestion('why is this position better for white?')).toBe(false);
    expect(isPlanQuestion('what piece should I take with?')).toBe(false);
  });
});
