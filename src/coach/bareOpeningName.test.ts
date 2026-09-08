/**
 * BARE-NAME ROUTING GUARD (2026-09-02 audit).
 *
 * CoachTeachPage routes short bare input into the full opening pipeline —
 * registry, cache, then a ~60s LLM generation. Its guard was `length <= 60 &&
 * !includes('?')`, while the comment beside it claimed sentences were excluded
 * because they "usually have a verb, > 60 chars, or end with ?/." Two of those
 * three were never implemented, so a real user's "Did I have any good moves"
 * (25 chars, no question mark) was taken as an OPENING NAME and burned a fresh
 * generation on it — `opening-cache-miss: "Did I have any good moves" -> fresh
 * generation`, /coach/teach, prod.
 *
 * The risk in a guard like this is over-reach: rejecting real opening names.
 * Half these cases exist to pin that it does not.
 */
import { describe, it, expect } from 'vitest';
import { looksLikeQuestionNotAnOpeningName as isQuestion, looksLikeConversationalReply as isReply } from './questionIntents';

describe('bare-name guard — questions must not be routed as opening names', () => {
  it('rejects the exact prod input that burned a generation', () => {
    expect(isQuestion('Did I have any good moves')).toBe(true);
  });

  it('rejects question shapes with no question mark', () => {
    for (const q of [
      'Was that a blunder',
      'Am I winning',
      'How do I play this',
      'Why did that lose',
      'Should I have castled',
      'Can you show me a trap',
      'What was my best move',
      'Explain that last move',
      'Tell me what went wrong',
    ]) {
      expect(isQuestion(q), `"${q}" should read as a question`).toBe(true);
    }
  });

  it('rejects sentence-terminated input — the "." and "!" the guard never checked', () => {
    expect(isQuestion('I played e4 and lost.')).toBe(true);
    expect(isQuestion('That was awful!')).toBe(true);
  });
});

describe('bare-name guard — real opening names must still route', () => {
  it('accepts the short bare names the routing exists for', () => {
    for (const name of ['The Vienna', 'Pirc defense', 'Italian', 'Caro-Kann', "King's Gambit"]) {
      expect(isQuestion(name), `"${name}" must stay an opening name`).toBe(false);
    }
  });

  it('accepts the long sub-variations the 60-char cap was widened for', () => {
    // Both cited in the guard's own comment as prior production regressions.
    for (const name of ['Pirc Defense: Baz Counter-gambit', "King's Indian Defense: Mar del Plata"]) {
      expect(isQuestion(name), `"${name}" must stay an opening name`).toBe(false);
    }
  });

  it('accepts names beginning with letters an interrogative also starts with', () => {
    // The opener list is whole-word matched, so these must not be caught by
    // "w…"/"d…"/"c…" prefixes.
    for (const name of ['Danish Gambit', 'Dutch Defense', 'Wing Gambit', 'Catalan', 'Colle System', 'Halloween Gambit']) {
      expect(isQuestion(name), `"${name}" must stay an opening name`).toBe(false);
    }
  });

  it('is empty-safe', () => {
    expect(isQuestion('')).toBe(false);
    expect(isQuestion(undefined)).toBe(false);
    expect(isQuestion('   ')).toBe(false);
  });
});

describe('bare-name guard — a "yes"/"no" reply is not an opening name (David 2026-09-08 play audit)', () => {
  it('catches the exact input that answered "Did you mean English Opening: Myers Defense?"', () => {
    expect(isReply('yes')).toBe(true);
  });

  it('catches the ways a student affirms an offer', () => {
    for (const r of [
      'yes', 'Yes', 'yeah', 'yep', 'yup', 'sure', 'ok', 'okay', 'alright',
      'please', 'yes please', 'do it', 'go ahead', 'go for it', "let's do it",
      'sounds good', 'absolutely', 'why not',
    ]) {
      expect(isReply(r), `"${r}" should read as a confirmation`).toBe(true);
    }
  });

  it('catches the ways a student declines an offer', () => {
    for (const r of ['no', 'No', 'nope', 'nah', 'no thanks', 'not now', 'maybe later', 'skip', 'pass', 'never mind']) {
      expect(isReply(r), `"${r}" should read as a negation`).toBe(true);
    }
  });

  it('tolerates trailing punctuation', () => {
    for (const r of ['yes.', 'yes!', 'no.', 'sure!', 'ok,']) {
      expect(isReply(r), `"${r}" should still read as a reply`).toBe(true);
    }
  });

  it('does NOT swallow a real request that merely starts with "yes"/"no"', () => {
    // Content past the affirmation → the normal path, so the opening still routes.
    for (const r of [
      'yes teach me the Sicilian', 'no I meant the French',
      "Yes Gambit",                 // a name that begins with yes-like letters
      'Nimzo-Indian', 'Nordic',     // begin with "n", must not be caught as "no"
      'Kan Variation',              // begins with "k", not "kk"
    ]) {
      expect(isReply(r), `"${r}" must stay an opening/request`).toBe(false);
    }
  });

  it('is empty-safe', () => {
    expect(isReply('')).toBe(false);
    expect(isReply(undefined)).toBe(false);
    expect(isReply('   ')).toBe(false);
  });
});
