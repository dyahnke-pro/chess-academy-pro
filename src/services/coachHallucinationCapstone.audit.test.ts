/**
 * HALLUCINATION AUDIT — CAPSTONE (pass 12)
 * ========================================
 * Every hallucination class the campaign covered, packed into ONE coach
 * reply, run through the full gate stack (groundCoachReply: eval + player-stat
 * + board + pin/skewer geometry + arrow + tactic). Every lie must be stripped;
 * every true statement must survive. The grand-finale stress test.
 */
import { describe, it, expect } from 'vitest';
import { groundCoachReply } from './coachAnswerGates';

// f6 empty, c6 = black knight, b6 = black queen, f3 = white knight, e1 white king.
const BUG_FEN = 'r1b1kbnr/pp3ppp/1qn1p3/2ppP3/3P4/2P2N2/PP3PPP/RNBQKB1R w KQkq - 3 6';

describe('HALLUCINATION AUDIT pass 12 — capstone (all lie types, one reply)', () => {
  it('strips every lie and keeps every truth in a single packed reply', () => {
    const reply = [
      'The knight on f6 covers the centre.',                                  // (1) board presence lie
      'The queen on b6 pins the knight on f3 to your king on e1.',            // (2) impossible pin
      'The rook on a1 skewers the queen on b6 and the king on e8.',           // (3) impossible skewer
      'White is completely winning here.',                                    // (4) eval lie
      'White has a forced mate in three.',                                    // (5) mate lie
      'Over 1,700 of his games reached this exact spot.',                     // (6) fabricated pro-stat
      'The knight on c6 attacks d4.',                                         // (7) TRUE board claim
      'Develop your pieces and keep your king safe.',                         // (8) TRUE instruction
    ].join(' ');

    const r = groundCoachReply(reply, { fen: BUG_FEN, evalCp: -650, playerDataGrounded: false, source: '/audit/capstone' });

    // every lie gone
    expect(r, 'board presence lie').not.toMatch(/knight on f6/i);
    expect(r, 'impossible pin').not.toMatch(/pins the knight on f3/i);
    expect(r, 'impossible skewer').not.toMatch(/skewers the queen on b6/i);
    expect(r, 'eval lie').not.toMatch(/completely winning/i);
    expect(r, 'mate lie').not.toMatch(/forced mate/i);
    expect(r, 'fabricated pro-stat').not.toMatch(/1,700/);
    // every truth kept
    expect(r, 'true board claim').toMatch(/knight on c6/i);
    expect(r, 'true instruction').toMatch(/Develop your pieces/i);
  });

  it('a fully-clean reply is returned untouched (no over-strip)', () => {
    const clean = 'The knight on c6 hits d4. The queen on b6 eyes the centre. Develop and castle to safety.';
    const r = groundCoachReply(clean, { fen: BUG_FEN, evalCp: -650, source: '/audit/capstone' });
    expect(r).toMatch(/knight on c6/i);
    expect(r).toMatch(/queen on b6/i);
    expect(r).toMatch(/Develop and castle/i);
  });
});
