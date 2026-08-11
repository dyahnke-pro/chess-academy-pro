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
import {
  isPlanQuestion, isWhyBestMoveQuestion, isCandidateMoveQuestion, extractCandidateSan,
} from './questionIntents';

describe("David's questions, verbatim", () => {
  it('routes "why play night c3?" to the lane that talks about Nc3', () => {
    // TWO misses in one question. The phrasing missed every why-lane, and the
    // move extractor — reached at last — read "night c3" as the PAWN move c3,
    // because "night" carries no SAN piece letter and "c3" does. So the first
    // prod fix routed it to the engine-reasoning lane and heard back "The
    // engine plays e4. If d5, then exd5…": a grounded, correct answer to a
    // question nobody asked.
    //
    // A WHY about a move the student NAMED is a question about THAT move.
    expect(isCandidateMoveQuestion('Why play night c3?')).toBe(true);
    expect(extractCandidateSan('Why play night c3?')).toBe('Nc3');
    expect(isWhyBestMoveQuestion('Why play night c3?'), 'not the engine-reasoning lane').toBe(false);
  });

  it('resolves a move spoken in words, never the bare square inside it', () => {
    expect(extractCandidateSan('why knight c3')).toBe('Nc3');
    expect(extractCandidateSan('why the knight to c3?')).toBe('Nc3');
    expect(extractCandidateSan('is bishop b5 any good')).toBe('Bb5');
    expect(extractCandidateSan('what about queen h5')).toBe('Qh5');
    expect(extractCandidateSan('why push pawn d4')).toBe('d4');
    // Plain SAN still wins when there is no spoken form.
    expect(extractCandidateSan('why Nc3?')).toBe('Nc3');
  });

  it('routes the same question however the verb is inflected', () => {
    for (const ask of [
      'why play Nc3',
      'why playing Nc3?',
      'why move the knight to c3',
      'why develop the bishop to b5?',
      'why castle here?',
      'why push d4',
      'why Nc3?',
      'why the knight to c3?',
    ]) {
      expect(isCandidateMoveQuestion(ask), ask).toBe(true);
    }
  });

  it('a WHY with no move named is still the engine-reasoning ask', () => {
    // "why play that?" names nothing, so there is nothing to evaluate and the
    // engine's own line IS the answer.
    expect(isWhyBestMoveQuestion('why play that?')).toBe(true);
    expect(isWhyBestMoveQuestion('why is Nc3 better?'), 'the comparative form is unchanged').toBe(true);
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
    expect(isCandidateMoveQuestion('why is this position better for white?')).toBe(false);
    expect(isPlanQuestion('what piece should I take with?')).toBe(false);
  });
});
