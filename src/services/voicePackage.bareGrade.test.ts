/**
 * A GRADE NEVER STANDS WITHOUT ITS REASON (prod Learn 2026-11-18, ply 27):
 * "You're behind in material — trading pieces takes your chances with them.
 * Your move was a mistake." The package dropped the sentence that said why
 * (already heard this turn) and kept the grade that led into it. The rule
 * "no why, no grade" holds at the place the why goes missing.
 */
import { describe, it, expect } from 'vitest';
import { buildVoicePackage, type VoiceFact } from './voicePackage';

const FEN = '2k4r/pppr1ppp/2n5/q2p4/5PQ1/2N5/PPP3P1/R1B1KBbR w KQ - 0 14';

describe('a grade whose reason was dropped goes with it', () => {
  it('the reason already said this turn: the bare grade is not said', () => {
    const reason = 'That left your rook on d7 pinned to your king.';
    const text = `You're behind in material — trading pieces takes your chances with them. Your move was a mistake. ${reason}`;
    const pkg = buildVoicePackage([{ kind: 'computed', text, fen: FEN } as VoiceFact], reason);
    expect(pkg.spoken).not.toMatch(/Your move was a mistake\.\s*$/);
    expect(pkg.spoken).toMatch(/behind in material/);
  });

  it('with its reason kept, the grade stays', () => {
    const text = 'Your move was a mistake. That left your rook on d7 pinned to your king.';
    const pkg = buildVoicePackage([{ kind: 'computed', text, fen: FEN } as VoiceFact]);
    expect(pkg.spoken).toMatch(/^Your move was a mistake\. That left/);
  });
});
