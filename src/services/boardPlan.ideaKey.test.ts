// "Their passed pawn on h2 is the danger" was spoken by the positional read at
// move 18 and again by the structure plan at move 21 (fresh-game walk
// 2026-09-27). The plan fact carries the positional read's key for the same
// idea so the say-once memory treats them as one claim.
import { describe, it, expect } from 'vitest';
import { structurePlanFact } from './boardPlan';
import { readPosition } from './positionalRead';

describe('the structure plan and the positional read share one passer key', () => {
  it('their passer: same key both lanes', () => {
    const fen = '4k3/8/8/8/8/8/7P/4K3 b - - 0 40';
    const plan = structurePlanFact(fen, 'b');
    const obs = readPosition(fen, 'black').find((o) => o.kind === 'passer');
    expect(plan?.id).toBe('passer-theirs');
    expect(plan?.ideaKey).toBe('opponent-passer-h');
    expect(obs?.key).toBe(plan?.ideaKey);
  });
  it('NEGATIVE CONTROL: a plan with no passer carries no passer key', () => {
    const plan = structurePlanFact('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'w');
    expect(plan?.ideaKey).toBeUndefined();
  });
});
