/**
 * HALLUCINATION AUDIT — CHECK / CHECKMATE STATE (pass 14)
 * ======================================================
 * A coach falsely announcing "you're in check" / "this is checkmate" is a
 * board-fact hallucination, and chess.js is exact ground truth — so this is
 * a low-false-positive gate. This pass proves: false announcements on a quiet
 * board are caught; REAL check/mate is kept; hypothetical & negated forms are
 * left alone.
 */
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { validateBoardClaims } from './boardClaimValidator';
import { groundCoachReply } from './coachAnswerGates';

const QUIET = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'; // 1.e4 e5 — no check
const FOOLS_MATE = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3'; // Qh4#

describe('HALLUCINATION AUDIT pass 14 — false check / checkmate', () => {
  it('sanity: the test FENs are what we think (no check vs checkmate)', () => {
    expect(new Chess(QUIET).inCheck()).toBe(false);
    expect(new Chess(FOOLS_MATE).inCheck()).toBe(true);
    expect(new Chess(FOOLS_MATE).isCheckmate()).toBe(true);
  });

  it('CATCHES false check/checkmate announcements on a quiet board', () => {
    const lies = [
      'Your king on e1 is in check.',
      'You are in check right now.',
      'The king is in check.',
      'This is checkmate.',
      'Checkmate!',
    ];
    for (const l of lies) {
      expect(validateBoardClaims(l, QUIET).ok, `MISSED: ${l}`).toBe(false);
    }
  });

  it('KEEPS a real check/checkmate (Fool\'s mate position)', () => {
    const truths = [
      'You are in check.',
      'The king on e1 is in check.',
      'The queen on h4 checks the king on e1.',
      'This is checkmate.',
    ];
    for (const t of truths) {
      expect(validateBoardClaims(t, FOOLS_MATE).ok, `wrongly flagged: ${t}`).toBe(true);
    }
  });

  it('KEEPS hypothetical and negated check claims (no false positive)', () => {
    const keep = [
      'If you castle, your king could be in check.',     // future
      'Be careful or you will be in check next move.',    // future
      'Your king is not in check.',                       // negated
      'Keep your king out of check.',                     // "out of check" ≠ "in check"
      'This move threatens checkmate.',                   // future ("threatens")
    ];
    for (const k of keep) {
      expect(validateBoardClaims(k, QUIET).ok, `false positive: ${k}`).toBe(true);
    }
  });

  it('strips the false check claim end-to-end while keeping the instruction', () => {
    const r = groundCoachReply('You are in check! Move your king to safety.', { fen: QUIET, source: '/audit/check' });
    expect(r).not.toMatch(/in check/i);
    expect(r).toMatch(/Move your king to safety/i);
  });
});
