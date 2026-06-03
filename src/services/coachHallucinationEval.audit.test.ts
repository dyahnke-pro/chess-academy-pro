/**
 * HALLUCINATION AUDIT — EVAL CONTRADICTION + FEN KEYING (2026-06-03, pass 5)
 * =========================================================================
 * David: "make each test harder than the last."
 *
 * Passes 1-4 hit board-facts + master-play through getCoachChatResponse.
 * The richer surfaces (MiddlegamePractice / useLiveCoach / coachMoveCommentary)
 * call groundCoachReply directly with an ENGINE EVAL + tactics context — gates
 * getCoachChatResponse can't run (it has no eval). This pass stresses those:
 *   - a "White is winning" claim on a board the engine says Black is crushing
 *   - a "dead equal" claim on a +5 position
 *   - and the subtle one: the gate must key on the CURRENT FEN it's handed,
 *     so the SAME sentence is a lie on one board and true on another.
 */
import { describe, it, expect } from 'vitest';
import { groundCoachReply } from './coachAnswerGates';

// f6 empty here (French Advance, move 6); also used as a "Black-to-punish" board.
const BUG_FEN = 'r1b1kbnr/pp3ppp/1qn1p3/2ppP3/3P4/2P2N2/PP3PPP/RNBQKB1R w KQkq - 3 6';
// A board where f6 DOES hold a (black) knight — same claim, different truth.
const F6_KNIGHT_FEN = 'rnbqkb1r/pppppppp/5n2/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 1 2';

describe('HALLUCINATION AUDIT pass 5 — eval contradiction', () => {
  it('strips "White is winning" when the engine has Black ahead by 6', () => {
    const r = groundCoachReply(
      'White is completely winning here. Keep improving your pieces.',
      { fen: BUG_FEN, evalCp: -600, source: '/audit/eval' },
    );
    expect(r).not.toMatch(/winning/i);
    expect(r).toMatch(/improving your pieces/i);
  });

  it('strips a "dead equal" claim on a +5 position', () => {
    const r = groundCoachReply(
      'The position is completely equal. Trade pieces and simplify.',
      { fen: BUG_FEN, evalCp: 520, source: '/audit/eval' },
    );
    expect(r).not.toMatch(/completely equal/i);
    expect(r).toMatch(/simplify/i);
  });

  it('strips "Black is much better" when White is up 4', () => {
    const r = groundCoachReply(
      'Black is much better in this line. Push your passed pawn.',
      { fen: BUG_FEN, evalCp: 410, source: '/audit/eval' },
    );
    expect(r).not.toMatch(/Black is much better/i);
    expect(r).toMatch(/passed pawn/i);
  });

  it('does NOT strip an eval claim that AGREES with the engine', () => {
    const r = groundCoachReply(
      'White is much better here. Convert with care.',
      { fen: BUG_FEN, evalCp: 410, source: '/audit/eval' },
    );
    expect(r).toMatch(/White is much better/i);
    expect(r).toMatch(/Convert with care/i);
  });

  it('combined: board lie + eval lie + pro-stat all stripped, the truth kept', () => {
    const r = groundCoachReply(
      'White is winning. The knight on f6 covers e4. Over 1,700 of his games reached this. Develop and castle.',
      { fen: BUG_FEN, evalCp: -700, playerDataGrounded: false, source: '/audit/eval' },
    );
    expect(r).not.toMatch(/winning/i);       // eval lie
    expect(r).not.toMatch(/knight on f6/i);  // board lie (f6 empty)
    expect(r).not.toMatch(/1,700/);          // pro-stat fabrication
    expect(r).toMatch(/Develop and castle/i);// the one true instruction survives
  });
});

describe('HALLUCINATION AUDIT pass 5 — the gate keys on the CURRENT fen', () => {
  const CLAIM = 'The knight on f6 guards the centre. Play solidly.';

  it('strips "the knight on f6" when f6 is EMPTY', () => {
    const r = groundCoachReply(CLAIM, { fen: BUG_FEN, source: '/audit/fen' });
    expect(r).not.toMatch(/knight on f6/i);
    expect(r).toMatch(/Play solidly/i);
  });

  it('KEEPS the identical sentence when f6 actually holds a knight', () => {
    const r = groundCoachReply(CLAIM, { fen: F6_KNIGHT_FEN, source: '/audit/fen' });
    expect(r).toMatch(/knight on f6/i);   // true on THIS board → untouched
    expect(r).toMatch(/Play solidly/i);
  });
});
