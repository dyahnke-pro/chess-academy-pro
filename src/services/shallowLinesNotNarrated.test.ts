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
    ], 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(shallow.pv).toBeUndefined();
    expect(deep.pv?.afterPlayed).toEqual(['a1a2']);
    expect(legacy.pv?.afterPlayed).toEqual(['a1a2']);
  });
});

describe('a game from a set-up position is reviewed from its own board', () => {
  it('the first move carries the game\'s start, and the walk reads it there (Saavedra c7)', async () => {
    const { buildReviewSegmentsForTests } = await import('./coachFeatureService');
    const start = '8/8/1KP5/3r4/8/8/8/k7 w - - 0 1';
    const inputs = reviewMoveInputsFrom([{ ...move({ afterPlayed: [], afterBest: [] }), san: 'c7', fen: '8/2P5/1K6/3r4/8/8/8/k7 b - - 0 1' }], start);
    expect(inputs[0].fenBefore).toBe(start);
    // uncapped walks every facet on the first move: on the standard start c7 is illegal and threw.
    expect(() => buildReviewSegmentsForTests(inputs, 'white', null, true, 1500)).not.toThrow();
  });
});
