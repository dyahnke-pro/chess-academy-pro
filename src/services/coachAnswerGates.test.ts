import { describe, it, expect, vi } from 'vitest';
import { groundCoachReply, isSpokenSentenceGrounded } from './coachAnswerGates';
import type { TacticsLiveContext } from '../coach/types';

// The gate logs fire-and-forget audits; silence them in the test.
vi.mock('./appAuditor', () => ({ logAppAudit: vi.fn(async () => {}) }));

const CTX_NO_TACTICS: TacticsLiveContext = {
  immediate: [],
  hanging: [],
  threats: [],
  opportunities: [],
  lookaheadDepth: 4,
};

describe('groundCoachReply — tactic gate enforcement', () => {
  it('ENFORCES: drops an out-of-vocab tactic sentence when a tactics context was sent', () => {
    const text = 'Develop the knight to f3. There is a winning pin on the e-file.';
    const out = groundCoachReply(text, {
      tactics: CTX_NO_TACTICS,
      source: 'test',
    });
    expect(out).toBe('Develop the knight to f3.');
    expect(out).not.toMatch(/pin/);
  });

  it('AUDIT-ONLY: keeps the prose when NO tactics context was sent (concept mention)', () => {
    const text = 'The idea of a pin is to immobilize a defending piece.';
    const out = groundCoachReply(text, {
      tactics: null,
      source: 'test',
    });
    expect(out).toBe(text);
  });

  it('keeps a tactic sentence phrased as a negation even with a context block', () => {
    const text = 'There is no fork here, so just castle.';
    const out = groundCoachReply(text, {
      tactics: CTX_NO_TACTICS,
      source: 'test',
    });
    expect(out).toBe(text);
  });
});

describe('isSpokenSentenceGrounded — tactic gate on the SPOKEN path (David 2026-06-16)', () => {
  const FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  it('BLOCKS a spoken sentence claiming an out-of-vocab tactic', () => {
    // The false "knight fork" — not in the (empty) tactics context.
    expect(isSpokenSentenceGrounded("That's a knight fork winning the rook.", FEN, 'test', CTX_NO_TACTICS)).toBe(false);
  });

  it('ALLOWS a spoken sentence with no tactic claim', () => {
    expect(isSpokenSentenceGrounded('Develop your pieces toward the center.', FEN, 'test', CTX_NO_TACTICS)).toBe(true);
  });

  it('ALLOWS when no tactics context is supplied (board-only gate, prior behavior)', () => {
    expect(isSpokenSentenceGrounded("There's a fork coming.", FEN, 'test')).toBe(true);
  });
});
