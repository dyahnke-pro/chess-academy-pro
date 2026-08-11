// THE GATE MUTILATED AN ANSWER AND SERVED THE WRECKAGE (David, prod 2026-08-11).
//
// He asked "What is the plan for white and black?" and heard an answer that
// opened "No pawn can ever defend it, so White's pieces get tied down to guard
// duty…" — a pronoun with nothing in front of it. The proportionate penalty had
// removed the OPENING sentence for one introduced number and handed on the rest,
// which had been written to lean on it. He re-asked; the app logged its own
// `coach_non_answer, reason: re-ask`.
//
// What these hold: the surgical case stays surgical, and the one shape that is
// not surgical — a broken opening reference — falls through to the computed
// prose instead of being spoken.
import { describe, it, expect } from 'vitest';
import { stripSentencesWith } from './coachApi';

describe('stripSentencesWith', () => {
  it("David's answer: refuses to serve a remainder that opens on a dangling reference", () => {
    const out = stripSentencesWith(
      "Black's d5 pawn is backward on a half-open file. No pawn can ever defend it, so White's pieces get tied down to guard duty.",
      ['backward'],
    );
    expect(out, 'the computed prose is the correct serve here').toBe('');
  });

  it('still strips a bad sentence from the MIDDLE and keeps the answer', () => {
    const out = stripSentencesWith(
      'White wants the d-file. The engine likes this by 9 pawns. Your rook belongs on d1.',
      ['9 pawns'],
    );
    expect(out).toBe('White wants the d-file. Your rook belongs on d1.');
  });

  it('still strips a bad sentence from the END', () => {
    const out = stripSentencesWith(
      'White wants the d-file. Black has scored 62% here.',
      ['62%'],
    );
    expect(out).toBe('White wants the d-file.');
  });

  it('strips the opening happily when what follows stands on its own', () => {
    // The rule is about a BROKEN reference, not about the opening being
    // precious. A new first sentence that names its own subject is a complete
    // answer and must not be thrown away.
    const out = stripSentencesWith(
      'The engine likes this by 9 pawns. White wants to double rooks on the d-file.',
      ['9 pawns'],
    );
    expect(out).toBe('White wants to double rooks on the d-file.');
  });

  it('returns empty when every sentence is offending', () => {
    expect(stripSentencesWith('Bad. Also bad.', ['bad'])).toBe('');
  });

  it('leaves clean text exactly as it found it', () => {
    const clean = 'White wants the d-file. Your rook belongs on d1.';
    expect(stripSentencesWith(clean, ['nothing here'])).toBe(clean);
  });
});
