import { describe, it, expect } from 'vitest';
import { calculateAccuracy, getClassificationCounts } from './accuracyService';
import type { CoachGameMove } from '../types';

function makeMoveData(overrides: Partial<CoachGameMove> & { moveNumber: number }): CoachGameMove {
  return {
    san: 'e4',
    fen: 'some-fen',
    isCoachMove: false,
    commentary: '',
    evaluation: 0,
    classification: 'good',
    expanded: false,
    bestMove: null,
    bestMoveEval: null,
    preMoveEval: null,
    ...overrides,
  };
}

describe('accuracyService', () => {
  describe('calculateAccuracy', () => {
    it('returns 0 for empty moves', () => {
      const result = calculateAccuracy([]);
      expect(result.white).toBe(0);
      expect(result.black).toBe(0);
      expect(result.moveCount).toBe(0);
    });

    it('returns high accuracy for moves matching best move', () => {
      const moves: CoachGameMove[] = [
        makeMoveData({ moveNumber: 1, evaluation: 30, bestMoveEval: 30, preMoveEval: 0 }),
        makeMoveData({ moveNumber: 2, evaluation: 25, bestMoveEval: 25, preMoveEval: 30, isCoachMove: true }),
        makeMoveData({ moveNumber: 3, evaluation: 50, bestMoveEval: 50, preMoveEval: 25 }),
      ];
      const result = calculateAccuracy(moves);
      expect(result.white).toBeGreaterThan(90);
    });

    it('returns lower accuracy for blundered moves', () => {
      const moves: CoachGameMove[] = [
        makeMoveData({ moveNumber: 1, evaluation: -200, bestMoveEval: 50, preMoveEval: 0, classification: 'blunder' }),
        makeMoveData({ moveNumber: 3, evaluation: -300, bestMoveEval: 30, preMoveEval: -200, classification: 'blunder' }),
      ];
      const result = calculateAccuracy(moves);
      expect(result.white).toBeLessThan(80);
    });

    it('skips book moves', () => {
      const moves: CoachGameMove[] = [
        makeMoveData({ moveNumber: 1, evaluation: 30, bestMoveEval: 30, preMoveEval: 0, classification: 'book' }),
      ];
      const result = calculateAccuracy(moves);
      expect(result.moveCount).toBe(0);
    });

    it('skips moves with null evals', () => {
      const moves: CoachGameMove[] = [
        makeMoveData({ moveNumber: 1, evaluation: null, bestMoveEval: null, preMoveEval: null }),
      ];
      const result = calculateAccuracy(moves);
      expect(result.moveCount).toBe(0);
    });
  });

  describe('getClassificationCounts', () => {
    it('counts move classifications for white', () => {
      const moves: CoachGameMove[] = [
        makeMoveData({ moveNumber: 1, classification: 'brilliant' }),
        makeMoveData({ moveNumber: 2, classification: 'good', isCoachMove: true }),
        makeMoveData({ moveNumber: 3, classification: 'blunder' }),
        makeMoveData({ moveNumber: 5, classification: 'good' }),
        makeMoveData({ moveNumber: 7, classification: 'inaccuracy' }),
      ];

      const counts = getClassificationCounts(moves, 'white');
      expect(counts.brilliant).toBe(1);
      expect(counts.blunder).toBe(1);
      expect(counts.good).toBe(1);
      expect(counts.inaccuracy).toBe(1);
    });

    it('excludes coach moves', () => {
      const moves: CoachGameMove[] = [
        makeMoveData({ moveNumber: 1, classification: 'good', isCoachMove: true }),
      ];
      const counts = getClassificationCounts(moves, 'white');
      expect(counts.good).toBe(0);
    });

    it('returns all zeros for empty moves', () => {
      const counts = getClassificationCounts([], 'white');
      expect(counts.brilliant).toBe(0);
      expect(counts.blunder).toBe(0);
    });
  });
});
