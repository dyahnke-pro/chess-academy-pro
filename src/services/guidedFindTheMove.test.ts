import { describe, it, expect } from 'vitest';
import {
  shouldOfferGuidedFind,
  buildGuidedFindChallenge,
  judgeGuidedFindAttempt,
  GUIDED_FIND_MIN_EVAL_CP,
} from './guidedFindTheMove';

/**
 * P2 of the coach-voice faucet (docs/plans/2026-07-06-coach-voice-why-faucet.md;
 * David 2026-07-11: "I would love for the coach to ask the user questions").
 * The three unbreakable rules under test:
 *   1. the question contains ZERO board facts beyond piece + goal — never the
 *      square, never the SAN;
 *   2. the answer appears only in the hint/confirm (post-commit surfaces);
 *   3. everything is computed — chess.js + the engine's move in, prose out.
 */

// White to move, up a queen; Qxd7+ is a capture-with-check. Plenty of legal moves.
const WINNING_FEN = '4k3/3q4/8/8/8/8/3Q4/4K2R w K - 0 1';
// Back-rank mate: Ra8#.
const MATE_FEN = '6k1/5ppp/8/8/8/8/8/R6K w - - 0 1';

describe('shouldOfferGuidedFind — the deterministic gate', () => {
  it('offers on a winning eval + a notable (capturing/checking) best move', () => {
    expect(
      shouldOfferGuidedFind({ fen: WINNING_FEN, bestUci: 'd2d7', evalCpStudentPov: 400 }),
    ).toBe(true);
  });

  it('refuses below the winning bar — a level game is not a quiz moment', () => {
    expect(
      shouldOfferGuidedFind({ fen: WINNING_FEN, bestUci: 'd2d7', evalCpStudentPov: GUIDED_FIND_MIN_EVAL_CP - 1 }),
    ).toBe(false);
    expect(shouldOfferGuidedFind({ fen: WINNING_FEN, bestUci: 'd2d7', evalCpStudentPov: null })).toBe(false);
  });

  it('refuses a quiet non-tactical move — the find needs a payoff', () => {
    // Ke1-f1: no capture, no check, no tactic. Winning eval alone is not enough.
    const quiet = '4k3/8/8/8/8/8/3Q4/4K3 w - - 0 1';
    expect(shouldOfferGuidedFind({ fen: quiet, bestUci: 'e1f1', evalCpStudentPov: 500 })).toBe(false);
  });

  it('refuses missing/illegal best moves', () => {
    expect(shouldOfferGuidedFind({ fen: WINNING_FEN, bestUci: undefined, evalCpStudentPov: 400 })).toBe(false);
    expect(shouldOfferGuidedFind({ fen: WINNING_FEN, bestUci: 'a1a8', evalCpStudentPov: 400 })).toBe(false);
  });
});

describe('buildGuidedFindChallenge — piece + goal, NEVER the square', () => {
  it('mate: names the delivering piece, withholds the square (rule 1)', () => {
    const ch = buildGuidedFindChallenge(MATE_FEN, 'a1a8');
    expect(ch).not.toBeNull();
    expect(ch!.question).toMatch(/checkmate/i);
    expect(ch!.question).toMatch(/rook/);
    // The honesty contract: no square, no SAN in the question.
    expect(ch!.question).not.toMatch(/a8/);
    expect(ch!.question).not.toMatch(/Ra8/);
    // The answer lives only in the post-commit surfaces.
    expect(ch!.answerSan).toBe('Ra8#');
    expect(ch!.hint).toContain('Ra8#');
    expect(ch!.confirm).toContain('Ra8#');
  });

  it('capture-with-check: square-free question, computed answer', () => {
    const ch = buildGuidedFindChallenge(WINNING_FEN, 'd2d7');
    expect(ch).not.toBeNull();
    expect(ch!.question).toMatch(/queen/);
    expect(ch!.question).not.toMatch(/d7/);
    expect(ch!.answerSan).toBe('Qxd7+');
    expect(ch!.from).toBe('d2');
    expect(ch!.to).toBe('d7');
    expect(ch!.fen).toBe(WINNING_FEN);
  });

  it('returns null on an unplayable move (empty > generic > invented)', () => {
    expect(buildGuidedFindChallenge(WINNING_FEN, 'zz99')).toBeNull();
    expect(buildGuidedFindChallenge(WINNING_FEN, 'a1a8')).toBeNull();
  });

  it('builds an escalating hint LADDER: piece → from-square → move, no early leak (David 2026-07-20)', () => {
    const ch = buildGuidedFindChallenge(WINNING_FEN, 'd2d7')!;
    expect(ch.hintLadder).toHaveLength(3);
    // Rung 0: the piece only — no square, no SAN.
    expect(ch.hintLadder[0]).toMatch(/queen/i);
    expect(ch.hintLadder[0]).not.toMatch(/d7|Qxd7/);
    // Rung 1: the from-square — narrows it, still not the destination.
    expect(ch.hintLadder[1]).toMatch(/d2/);
    expect(ch.hintLadder[1]).not.toMatch(/d7|Qxd7/);
    // Rung 2 (final): the full move.
    expect(ch.hintLadder[2]).toContain('Qxd7+');
  });

  it('returns null when the best move lands NOTHING notable — never "can land a null"', () => {
    // Ke1-f1: no mate, no capture, no check, no tactic. A caller that skips
    // shouldOfferGuidedFind must NOT get a prompt with a null tactic interpolated
    // (David 2026-07-19 audit: "Your pawn can land a null. What's the square?").
    const quiet = '4k3/8/8/8/8/8/3Q4/4K3 w - - 0 1';
    const ch = buildGuidedFindChallenge(quiet, 'e1f1');
    expect(ch).toBeNull();
  });
});

describe('judgeGuidedFindAttempt — found / retry / stale', () => {
  const ch = buildGuidedFindChallenge(MATE_FEN, 'a1a8')!;

  it('found on exact SAN', () => {
    expect(judgeGuidedFindAttempt(ch, { san: 'Ra8#', fenBefore: MATE_FEN })).toBe('found');
  });

  it('found on matching from→to even when the SAN string differs', () => {
    expect(judgeGuidedFindAttempt(ch, { san: 'Ra8', from: 'a1', to: 'a8', fenBefore: MATE_FEN })).toBe('found');
  });

  it('retry on a different move — take it back and look again', () => {
    expect(judgeGuidedFindAttempt(ch, { san: 'Rb1', from: 'a1', to: 'b1', fenBefore: MATE_FEN })).toBe('retry');
  });

  it('stale when the board drifted since the ask — never judge the wrong position', () => {
    expect(judgeGuidedFindAttempt(ch, { san: 'Ra8#', fenBefore: WINNING_FEN })).toBe('stale');
  });
});
