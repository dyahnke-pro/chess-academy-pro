import { describe, it, expect } from 'vitest';
import { reviewMoveInputsFrom } from './reviewNarrationBuild';
import type { CoachGameMove } from '../types';

// Clean-pass review walk 2026-10-04: the review narrates before its deep dive
// lands, and claims were read off the quick sweep's depth-12 lines — "axb4 —
// it would win two pawns" (axb4 Ne7 Bxa4: Black just takes back on b4), "Rxc1+
// arrives" (Rhc8 Nd4?! Rxc1+). A sweep line does not reach the narration; the
// deepen rebuilds it with the deep lines.
const move = (pv: CoachGameMove['pv']): CoachGameMove => ({
  moveNumber: 1, san: 'e4', fen: 'x', isCoachMove: false, commentary: '', evaluation: 0, classification: 'mistake',
  expanded: false, bestMove: 'e2e4', bestMoveEval: 0, preMoveEval: 0, pv,
} as unknown as CoachGameMove);

describe('a quick-sweep line is not narrated from', () => {
  it('drops a depth-12 line, keeps a deep one and an unstamped (older) one', () => {
    const [shallow, deep, legacy] = reviewMoveInputsFrom([
      move({ afterPlayed: ['a1a2'], afterBest: ['b1b2'], depth: 12 }),
      move({ afterPlayed: ['a1a2'], afterBest: ['b1b2'], depth: 16 }),
      move({ afterPlayed: ['a1a2'], afterBest: ['b1b2'] }),
    ]);
    expect(shallow.pv).toBeUndefined();
    expect(deep.pv?.afterPlayed).toEqual(['a1a2']);
    expect(legacy.pv?.afterPlayed).toEqual(['a1a2']);
  });
});
