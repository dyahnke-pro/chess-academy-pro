/**
 * HALLUCINATION AUDIT — EVASION ROBUSTNESS + ARROW SYNTHESIS (pass 6)
 * ==================================================================
 * David: "make each test harder than the last."
 *
 * Two fronts:
 *  (A) FORMATTING EVASION — an LLM phrases a board lie with odd casing /
 *      spacing / punctuation. The gate must still catch it.
 *  (B) ARROW GATE (G6) — when the coach NAMES a move, a board arrow must
 *      appear so the student's eye lands on it; a sound move-mention with no
 *      arrow gets one synthesised, and that must not invent a bogus arrow.
 */
import { describe, it, expect } from 'vitest';
import { groundCoachReply } from './coachAnswerGates';
import { validateBoardClaims } from './boardClaimValidator';

const BUG_FEN = 'r1b1kbnr/pp3ppp/1qn1p3/2ppP3/3P4/2P2N2/PP3PPP/RNBQKB1R w KQkq - 3 6'; // f6 empty
const ITALIAN_FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';

describe('HALLUCINATION AUDIT pass 6A — formatting evasion (board lie, f6 empty)', () => {
  const EVASIONS = [
    'The knight on F6 guards the centre.',          // UPPERCASE file
    'The knight on  f6  is strong.',                // double spaces
    'The knight on f6, a fine outpost, holds.',     // trailing comma
    'The KNIGHT on f6 dominates.',                  // shouted piece
    'The bishop on f6 rakes the diagonal.',         // wrong piece, empty sq
  ];
  for (const claim of EVASIONS) {
    it(`catches: "${claim}"`, () => {
      const r = validateBoardClaims(claim, BUG_FEN);
      expect(r.ok, `slipped: ${claim}`).toBe(false);
    });
  }

  it('strips every evasive board lie through the full gate too', () => {
    const text = `Solid setup. ${EVASIONS.join(' ')} Just develop.`;
    const r = groundCoachReply(text, { fen: BUG_FEN, source: '/audit/evasion' });
    expect(r).toMatch(/Solid setup/i);
    expect(r).toMatch(/Just develop/i);
    expect(r).not.toMatch(/on f6/i);  // every f6 lie gone (case-insensitive)
    expect(r).not.toMatch(/on F6/);
  });
});

describe('HALLUCINATION AUDIT pass 6B — arrow gate (G6 lead-the-eye)', () => {
  it('synthesises a board arrow when the coach names a legal move without one', () => {
    // Black to move in the Italian; "...Nf6" is legal. The coach names it but
    // forgets the arrow → the gate must add a [BOARD: arrow:...] marker.
    const r = groundCoachReply(
      'A natural developing move is Nf6, hitting the e4 pawn.',
      { fen: ITALIAN_FEN, source: '/audit/arrow' },
    );
    expect(r).toMatch(/\[BOARD:\s*arrow:[a-h][1-8]-[a-h][1-8]/i);
  });

  it('does not strip the move-mention sentence while adding the arrow', () => {
    const r = groundCoachReply(
      'Develop with Nf6 to contest the centre.',
      { fen: ITALIAN_FEN, source: '/audit/arrow' },
    );
    expect(r).toMatch(/Nf6/);
    expect(r).toMatch(/\[BOARD:\s*arrow:/i);
  });
});
