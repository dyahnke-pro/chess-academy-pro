/**
 * boardClaimValidator — runtime board-fact guard tests.
 *
 * Anchored on the 2026-06-01 production hallucination: an in-game hint
 * said "Black's queen on b6 pins the knight on f3 to your king" on the
 * FEN below. Qb6, Nf3 and the white king on e1 are all real and
 * correctly placed — but b6/f3/e1 are not on one line, so the pin is
 * geometrically impossible. The move (Be2) was sound; the SENTENCE lied.
 * No runtime guard caught it. This file pins (ha) that down.
 */
import { describe, it, expect } from 'vitest';
import { validateBoardClaims, stripDisprovenSentences } from './boardClaimValidator';

// The exact production position (white to move, move 6, French Advance).
const BUG_FEN = 'r1b1kbnr/pp3ppp/1qn1p3/2ppP3/3P4/2P2N2/PP3PPP/RNBQKB1R w KQkq - 3 6';

describe('validateBoardClaims — pin geometry', () => {
  it('flags the production hallucination (Qb6 "pins" Nf3 to the king)', () => {
    const r = validateBoardClaims(
      "Black's queen on b6 pins the knight on f3 to your king.",
      BUG_FEN,
    );
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.kind === 'pin-geometry')).toBe(true);
  });

  it('flags the verbatim production sentence (pronoun pinned, conditional)', () => {
    // The exact shape that shipped: "the knight on f3" named earlier, then
    // "the queen on b6 pins it to your king" — "it" = the f3 knight.
    const r = validateBoardClaims(
      "It defends the knight on f3 — that knight is currently hanging since Black's queen on b6 pins it to your king if you castle.",
      BUG_FEN,
    );
    expect(r.violations.some((v) => v.kind === 'pin-geometry')).toBe(true);
  });

  it('does NOT flag a real, collinear pin (Ruy: Bb5 pins Nc6 to Ke8)', () => {
    // 1.e4 e5 2.Nf3 Nc6 3.Bb5 — b5/c6/e8 are on one diagonal.
    const ruy = 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
    const r = validateBoardClaims(
      'The bishop on b5 pins the knight on c6 to the king on e8.',
      ruy,
    );
    expect(r.ok).toBe(true);
  });

  it('flags a non-slider "pin" (a knight cannot pin along a line)', () => {
    // Knight on f3, queen on b6, king e1 — "knight pins queen" is impossible.
    const r = validateBoardClaims(
      'The knight on f3 pins the queen on b6 to the king on e1.',
      BUG_FEN,
    );
    expect(r.violations.some((v) => v.kind === 'pin-geometry')).toBe(true);
  });

  it('stays silent when squares cannot be resolved (no false positive)', () => {
    const r = validateBoardClaims(
      'Your bishop pins their knight to the queen somewhere on the kingside.',
      BUG_FEN,
    );
    expect(r.ok).toBe(true);
  });
});

describe('validateBoardClaims — piece on square', () => {
  it('flags a piece named on an empty square', () => {
    // f6 is empty in BUG_FEN.
    const r = validateBoardClaims('The knight on f6 defends the king.', BUG_FEN);
    expect(r.violations.some((v) => v.kind === 'piece-on-square')).toBe(true);
  });

  it('flags the wrong piece type on a square', () => {
    // f3 holds a knight, not a bishop.
    const r = validateBoardClaims('The bishop on f3 eyes the centre.', BUG_FEN);
    expect(r.violations.some((v) => v.kind === 'piece-on-square')).toBe(true);
  });

  it('accepts a correct piece-on-square claim', () => {
    // b6 really holds the black queen; c6 a black knight.
    const r = validateBoardClaims('The queen on b6 and the knight on c6 pressure d4.', BUG_FEN);
    expect(r.ok).toBe(true);
  });

  it('flags a wrong-color claim when the color is stated explicitly', () => {
    // b6 holds a BLACK queen; "white queen on b6" is false.
    const r = validateBoardClaims('The white queen on b6 is active.', BUG_FEN);
    expect(r.violations.some((v) => v.kind === 'piece-on-square')).toBe(true);
  });

  it('does NOT flag piece-on-square claims about a FUTURE position', () => {
    // f6 is empty NOW, but "after ...Nf6" describes a future board — skip.
    const r = validateBoardClaims('After the knight goes to f6, the knight on f6 guards d5.', BUG_FEN);
    // The "after" clause suppresses the present-tense check.
    expect(r.violations.some((v) => v.kind === 'piece-on-square')).toBe(false);
  });

  it('accepts the reversed "f3-knight" phrasing when correct', () => {
    const r = validateBoardClaims('The f3-knight is well placed.', BUG_FEN);
    expect(r.ok).toBe(true);
  });
});

describe('stripDisprovenSentences', () => {
  it('drops the hallucinated sentence but keeps the sound one', () => {
    const text =
      'Bishop to e2 is the move. The queen on b6 pins the knight on f3 to your king.';
    const { clean, dropped } = stripDisprovenSentences(text, BUG_FEN);
    expect(dropped).toHaveLength(1);
    expect(clean).toContain('Bishop to e2 is the move.');
    expect(clean).not.toContain('pins the knight');
  });

  it('leaves clean prose untouched', () => {
    const text = 'Bishop to e2 develops and unblocks the rook. It defends f3.';
    const { clean, dropped } = stripDisprovenSentences(text, BUG_FEN);
    expect(dropped).toHaveLength(0);
    expect(clean).toBe(text.trim());
  });
});
