import { describe, it, expect } from 'vitest';
import { buildHoldChallenge, judgeGuidedFindAttempt } from './guidedFindTheMove';

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

describe('judgeGuidedFindAttempt — found / retry / stale', () => {
  const ch = buildHoldChallenge(MATE_FEN, 'a1a8')!;

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
