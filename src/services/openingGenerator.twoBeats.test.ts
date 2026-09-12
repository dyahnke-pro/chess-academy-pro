import { describe, it, expect } from 'vitest';
import { firstSentence } from './openingGenerator';

// ── TWO BEATS PER MOVE (David 2026-09-12: "Two beats if both teachings are
// legit") ────────────────────────────────────────────────────────────────────
//
// A ply's narration is assembled as `corpus note + generated prose`, and the
// player speaks it ONE SENTENCE AT A TIME. So an un-capped supporting passage
// turns a single move into three or four separate utterances. Walking the
// Accelerated Dragon, the knight-to-f3 ply spoke three times:
//
//   1. "White develops the knight to f3."                        (the note)
//   2. "With precise play White is slightly better, but it's a very playable
//       position that's easy to learn."                          (names no square)
//   3. "The traditional Dragon runs through the pawn to d6 and d4."
//
// The note is beat one and keeps its sentences — it is the teaching. The
// generated prose is beat two, so it gets one sentence.

describe('firstSentence — the supporting beat is one sentence', () => {
  it('keeps a single-sentence passage untouched', () => {
    const one = 'The traditional Dragon runs through the pawn to d6 and d4.';
    expect(firstSentence(one)).toBe(one);
  });

  it('takes only the first sentence of a multi-sentence passage', () => {
    const three =
      "With precise play White is slightly better, but it's a very playable position " +
      'that\'s easy to learn. The traditional Dragon runs through the pawn to d6 and d4. ' +
      'That is a different move order.';
    expect(firstSentence(three)).toBe(
      "With precise play White is slightly better, but it's a very playable position that's easy to learn.",
    );
  });

  it('never cuts mid-sentence', () => {
    const long =
      'The bishop to e2 is the old move, and the pawn to d5 equalizes — a drawback of ' +
      'the Accelerated is these liquidations. There is more to say after this.';
    const out = firstSentence(long);
    expect(out.endsWith('.')).toBe(true);
    expect(long.startsWith(out)).toBe(true);
  });

  it('returns empty for empty input rather than throwing', () => {
    expect(firstSentence('')).toBe('');
    expect(firstSentence('   ')).toBe('');
  });

  it('does not treat a move number as a sentence of its own', () => {
    // splitSentences glues a bare "9." onto what it introduces; prose is not
    // supposed to carry move-number prefixes (G9.4) but a slip must not become
    // a spoken utterance reading just "nine".
    expect(firstSentence('That gives ground. 9. Nc3 is better.')).toBe('That gives ground.');
  });
});
