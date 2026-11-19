import { describe, expect, it } from 'vitest';
import { opponentTargets, targetLine } from './targetSelector';

// THE TARGET THEY CAN REACH IS ONE SENTENCE (Danya narration test 2026-11-19,
// how to survive an attack #0 and seven more: "Nothing of theirs hits it yet,
// but … next move. Nothing guards it.").
describe('targetLine — a target nothing hits yet', () => {
  it('names the pieces that can come and the guard in one sentence', () => {
    // White's isolated d4 pawn; Black's knight on a5 reaches c6 next move.
    const fen = '6k1/5ppp/8/n7/3P4/8/5PPP/6K1 b - - 0 1';
    const t = opponentTargets(fen, 'b')[0];
    expect(t).toBeTruthy();
    const line = targetLine(t, fen, 'their');
    expect(line).not.toMatch(/Nothing of theirs hits it yet/);
    expect(line).toMatch(/Their knight on a5 can get at it next move, and nothing guards it\.$/);
  });
});
