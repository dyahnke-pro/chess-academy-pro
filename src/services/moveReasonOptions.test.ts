import { describe, it, expect } from 'vitest';
import { buildMoveReasonOptions } from './moveReasonOptions';
import { buildWhyPrompt, buildGroundedReveal } from './discussionPractice';
import { isNearBest, GOOD_MOVE_MAX_CPLOSS } from './slipDetector';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4_D5 = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2';
const CHECK_POS = '4k3/8/8/8/8/8/8/3QK3 w - - 0 1';
const CASTLE_POS = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
const BARE_KINGS = '8/8/8/4k3/8/4K3/8/8 w - - 0 1';

describe('buildMoveReasonOptions', () => {
  it('offers "win material" on a capture', () => {
    const opts = buildMoveReasonOptions(AFTER_E4_D5, 'exd5');
    expect(opts).toContain('To win material');
  });

  it('offers "attack the king" on a check', () => {
    const opts = buildMoveReasonOptions(CHECK_POS, 'Qd8+');
    expect(opts).toContain('To attack the king');
  });

  it('offers "king safe" on castling', () => {
    const opts = buildMoveReasonOptions(CASTLE_POS, 'O-O');
    expect(opts).toContain('To get my king safe');
  });

  it('ALWAYS includes the "I saw a tactic" decoy so no chip telegraphs the answer', () => {
    for (const [fen, san] of [[AFTER_E4_D5, 'exd5'], [CHECK_POS, 'Qd8+'], [START, 'e4']] as const) {
      expect(buildMoveReasonOptions(fen, san)).toContain('I saw a tactic');
    }
  });

  it('returns at most 5 unique options', () => {
    const opts = buildMoveReasonOptions(AFTER_E4_D5, 'exd5');
    expect(opts.length).toBeLessThanOrEqual(5);
    expect(new Set(opts).size).toBe(opts.length);
  });

  it('falls back to generic intents (with decoys) on an illegal move', () => {
    const opts = buildMoveReasonOptions(START, 'Zz9');
    expect(opts).toContain('I saw a tactic');
    expect(opts.length).toBeGreaterThan(0);
  });
});

describe('buildWhyPrompt — clean neutral probe (never leaks)', () => {
  it('is identical regardless of the move and names no board fact', () => {
    const q = buildWhyPrompt();
    expect(q).toBe("Why'd you play that?");
    // No square, piece, tactic, or good/bad tell.
    expect(q).not.toMatch(/fork|hang|nice|good|blunder|[a-h][1-8]/i);
  });
});

describe('buildGroundedReveal — grounded, shown only after the answer', () => {
  it('good move with no tactic → a plain positive read', () => {
    const r = buildGroundedReveal({ kind: 'good', fenAfter: BARE_KINGS, moverColor: 'w' });
    expect(r).toMatch(/solid/i);
  });

  it('slip with nothing hanging → a neutral "gives ground"', () => {
    const r = buildGroundedReveal({ kind: 'slip', fenAfter: BARE_KINGS, moverColor: 'w' });
    expect(r).toMatch(/gives ground/i);
  });
});

describe('isNearBest — good-move recognition gate', () => {
  it('accepts a near-best move and rejects a real loss', () => {
    expect(isNearBest(0)).toBe(true);
    expect(isNearBest(GOOD_MOVE_MAX_CPLOSS)).toBe(true);
    expect(isNearBest(GOOD_MOVE_MAX_CPLOSS + 1)).toBe(false);
    expect(isNearBest(150)).toBe(false);
  });
});
