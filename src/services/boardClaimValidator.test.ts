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
import {
  validateBoardClaims,
  stripDisprovenSentences,
  groundCoachAnswerBoardClaims,
} from './boardClaimValidator';

// The exact production position (white to move, move 6, French Advance).
const BUG_FEN = 'r1b1kbnr/pp3ppp/1qn1p3/2ppP3/3P4/2P2N2/PP3PPP/RNBQKB1R w KQkq - 3 6';

// Standard start — no knight on a3 (rank 3 is empty), so any "knight on a3"
// prose is provably false here. Used for the coach-answer gate tests.
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

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

  it('flags an impossible SKEWER phrased with "and" (audit 2026-06-03 pass 2)', () => {
    // Twin of the pin incident: "skewers B and C" (not "to C") used to slip
    // because the target was only split on " to ". b6/f3/e1 aren't collinear.
    const r = validateBoardClaims(
      'The queen on b6 skewers the knight on f3 and the king on e1.',
      BUG_FEN,
    );
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.kind === 'pin-geometry')).toBe(true);
  });

  it('does NOT flag a real collinear skewer phrased with "and"', () => {
    // Bb5 / Nc6 / Ke8 are on one diagonal — a legitimate skewer claim.
    const ruy = 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
    const r = validateBoardClaims(
      'The bishop on b5 skewers the knight on c6 and the king on e8.',
      ruy,
    );
    expect(r.ok).toBe(true);
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

describe('validateBoardClaims — negation / absence (audit 2026-06-03 pass 7)', () => {
  // The gate must NOT strip a TRUE statement about a piece being ABSENT.
  const F6_KNIGHT = 'rnbqkb1r/pppppppp/5n2/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 1 2';
  it('keeps "there is no knight on f6" when f6 is empty (true absence)', () => {
    expect(validateBoardClaims('There is no knight on f6 to defend the king.', BUG_FEN).ok).toBe(true);
  });
  it('keeps the contraction form "you don\'t have a knight on f6"', () => {
    expect(validateBoardClaims("You don't have a knight on f6 yet.", BUG_FEN).ok).toBe(true);
  });
  it('keeps "without a bishop on f6" / "no longer a rook on f6"', () => {
    expect(validateBoardClaims('Without a bishop on f6, the dark squares are weak.', BUG_FEN).ok).toBe(true);
    expect(validateBoardClaims('There is no longer a rook on f6.', BUG_FEN).ok).toBe(true);
  });
  it('FLAGS a FALSE absence claim ("no knight on f6" when f6 holds a knight)', () => {
    expect(validateBoardClaims('There is no knight on f6.', F6_KNIGHT).ok).toBe(false);
  });
  it('still flags a presence lie ("the knight on f6" on an empty f6)', () => {
    expect(validateBoardClaims('The knight on f6 guards the centre.', BUG_FEN).ok).toBe(false);
  });
  it('a negation in one clause does NOT shield a presence lie in another (pass 9)', () => {
    // The negation is clause-scoped (split on comma/semicolon), so "no rook
    // on a1" must not protect the false "knight on f6" in the next clause.
    expect(validateBoardClaims('There is no rook on a1, but the knight on f6 controls e4.', BUG_FEN).ok).toBe(false);
    expect(validateBoardClaims('No bishop on c8; the knight on f6 is a monster.', BUG_FEN).ok).toBe(false);
    expect(validateBoardClaims('Without a queen on d1, the knight on f6 dominates.', BUG_FEN).ok).toBe(false);
  });
  // KNOWN MINOR LIMITATION (documented, not fixed): a DEPARTURE phrasing whose
  // cue sits AFTER the phrase ("the knight on f6 is gone") is still flagged —
  // isNegatedAt only scans the clause BEFORE the phrase, because scanning
  // after would mis-invert common true present claims ("the knight on f6 is
  // not well placed"). The before-only scope is the safe choice; the cost is
  // an occasional strip of a rare "X on sq is gone" sentence.
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

describe('groundCoachAnswerBoardClaims — the spine gate', () => {
  it('drops a false board-fact sentence from the SPOKEN [VOICE:] block', () => {
    const answer =
      '[VOICE: Welcome back. The knight on a3 eyes c4. Let us continue.]';
    const r = groundCoachAnswerBoardClaims(answer, START_FEN);
    expect(r.violations.length).toBeGreaterThan(0);
    expect(r.text).not.toMatch(/knight on a3/i); // never spoken
    expect(r.text).toMatch(/Welcome back/);       // true sentences kept
    expect(r.text).toMatch(/^\[VOICE:.*\]$/);      // VOICE block stays intact
  });

  it('drops a false board-fact sentence from the visible prose', () => {
    const answer = 'Here is the plan. The queen on c4 defends the pawn. Develop your pieces.';
    const r = groundCoachAnswerBoardClaims(answer, START_FEN);
    expect(r.text).not.toMatch(/queen on c4/i);
    expect(r.text).toMatch(/Here is the plan/);
    expect(r.text).toMatch(/Develop your pieces/);
  });

  it('PRESERVES [BOARD:] and [[ACTION:]] markers while stripping a lie', () => {
    const answer =
      'The knight on a3 forks. [BOARD: arrow:e2-e4:green] [[ACTION:play_move {"san":"e4"}]] Good luck.';
    const r = groundCoachAnswerBoardClaims(answer, START_FEN);
    expect(r.text).toContain('[BOARD: arrow:e2-e4:green]');
    expect(r.text).toContain('[[ACTION:play_move {"san":"e4"}]]');
    expect(r.text).not.toMatch(/knight on a3/i);
  });

  it('does NOT mangle prose numbers (no sentinel/digit collision)', () => {
    const answer = 'He scored in over 1700 games here. [BOARD: arrow:d2-d4:green] Strong choice.';
    const r = groundCoachAnswerBoardClaims(answer, START_FEN);
    expect(r.text).toContain('1700 games');
    expect(r.text).toContain('[BOARD: arrow:d2-d4:green]');
  });

  it('returns the text unchanged when every claim is true', () => {
    const answer = '[VOICE: A solid developing move. The rook stays home for now.]';
    const r = groundCoachAnswerBoardClaims(answer, START_FEN);
    expect(r.violations).toHaveLength(0);
    expect(r.text).toBe(answer);
  });
});
