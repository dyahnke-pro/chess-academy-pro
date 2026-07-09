import { describe, it, expect, vi } from 'vitest';
import { isSpokenSentenceGrounded } from './coachAnswerGates';
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

// groundCoachReply tests DELETED with the function (David 2026-07-09 — "finish
// ripping"). The real-time SPOKEN-sentence gate (isSpokenSentenceGrounded) is
// the surviving tactic check; VoiceChatMic still uses it.
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
