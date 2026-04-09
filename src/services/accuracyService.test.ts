import { describe, it, expect } from 'vitest';
import { calculateAccuracy, getClassificationCounts, cpLossToAccuracy, capEval } from './accuracyService';
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
  describe('capEval', () => {
    it('caps mate scores to ±1500', () => {
      expect(capEval(30000)).toBe(1500);
      expect(capEval(-30000)).toBe(-1500);
      expect(capEval(20001)).toBe(1500);
      expect(capEval(-20001)).toBe(-1500);
    });

    it('passes through normal evaluations', () => {
      expect(capEval(0)).toBe(0);
      expect(capEval(500)).toBe(500);
      expect(capEval(-300)).toBe(-300);
      expect(capEval(19999)).toBe(19999);
    });
  });

  describe('cpLossToAccuracy', () => {
    it('returns ~100 for perfect move (0 cp loss)', () => {
      expect(cpLossToAccuracy(0)).toBeCloseTo(100, 0);
    });

    it('returns ~91 for 10cp loss', () => {
      const acc = cpLossToAccuracy(10);
      expect(acc).toBeGreaterThan(88);
      expect(acc).toBeLessThan(94);
    });

    it('returns ~62 for 50cp loss (significant inaccuracy)', () => {
      const acc = cpLossToAccuracy(50);
      expect(acc).toBeGreaterThan(55);
      expect(acc).toBeLessThan(68);
    });

    it('returns ~38 for 100cp loss (mistake)', () => {
      const acc = cpLossToAccuracy(100);
      expect(acc).toBeGreaterThan(33);
      expect(acc).toBeLessThan(44);
    });

    it('returns ~4 for 300cp loss (blunder)', () => {
      const acc = cpLossToAccuracy(300);
      expect(acc).toBeGreaterThan(0);
      expect(acc).toBeLessThan(8);
    });

    it('floors at 0 for extreme losses', () => {
      expect(cpLossToAccuracy(1000)).toBe(0);
    });
  });

  describe('calculateAccuracy', () => {
    it('returns 0 for empty moves', () => {
      const result = calculateAccuracy([]);
      expect(result.white).toBe(0);
      expect(result.black).toBe(0);
      expect(result.moveCount).toBe(0);
    });

    it('returns high accuracy for moves with small centipawn loss', () => {
      const moves: CoachGameMove[] = [
        // White plays: eval goes from 0 to +30 (no loss, white gained)
        makeMoveData({ moveNumber: 1, evaluation: 30, preMoveEval: 0 }),
        // Coach move (black): eval goes from +30 to +25 (black perspective: 25 → 30 = -5 cp loss from black view → actually gained)
        makeMoveData({ moveNumber: 2, evaluation: 25, preMoveEval: 30, isCoachMove: true }),
        // White plays: eval goes from +25 to +50 (white gained again)
        makeMoveData({ moveNumber: 3, evaluation: 50, preMoveEval: 25 }),
      ];
      const result = calculateAccuracy(moves);
      // White gained eval on both moves, so accuracy should be very high
      expect(result.white).toBeGreaterThan(95);
    });

    it('returns lower accuracy for blundered moves', () => {
      const moves: CoachGameMove[] = [
        // White blunders: eval drops from 0 to -200 (200cp loss for white)
        makeMoveData({ moveNumber: 1, evaluation: -200, preMoveEval: 0, classification: 'blunder' }),
        // White blunders again: eval drops from -200 to -300 (100cp loss for white)
        makeMoveData({ moveNumber: 3, evaluation: -300, preMoveEval: -200, classification: 'blunder' }),
      ];
      const result = calculateAccuracy(moves);
      // 200cp loss → ~14%, 100cp loss → ~38%, average ≈ 26%
      expect(result.white).toBeLessThan(35);
    });

    it('penalizes blunders even in winning positions', () => {
      // Player is +800 and drops to +200 — a 600cp loss
      const moves: CoachGameMove[] = [
        makeMoveData({ moveNumber: 1, evaluation: 200, preMoveEval: 800, classification: 'blunder' }),
      ];
      const result = calculateAccuracy(moves);
      // 600cp loss should give near-0 accuracy, definitely < 20%
      expect(result.white).toBeLessThan(20);
    });

    it('gives near-perfect accuracy for optimal play', () => {
      const moves: CoachGameMove[] = [
        // Each move either maintains or slightly improves the eval
        makeMoveData({ moveNumber: 1, evaluation: 30, preMoveEval: 0 }),
        makeMoveData({ moveNumber: 3, evaluation: 45, preMoveEval: 30 }),
        makeMoveData({ moveNumber: 5, evaluation: 60, preMoveEval: 45 }),
      ];
      const result = calculateAccuracy(moves);
      expect(result.white).toBeGreaterThan(95);
    });

    it('skips book moves', () => {
      const moves: CoachGameMove[] = [
        makeMoveData({ moveNumber: 1, evaluation: 30, preMoveEval: 0, classification: 'book' }),
      ];
      const result = calculateAccuracy(moves);
      expect(result.moveCount).toBe(0);
    });

    it('skips moves with null evals', () => {
      const moves: CoachGameMove[] = [
        makeMoveData({ moveNumber: 1, evaluation: null, preMoveEval: null }),
      ];
      const result = calculateAccuracy(moves);
      expect(result.moveCount).toBe(0);
    });

    it('does not require bestMoveEval to include a move', () => {
      const moves: CoachGameMove[] = [
        makeMoveData({ moveNumber: 1, evaluation: 30, preMoveEval: 0, bestMoveEval: null }),
      ];
      const result = calculateAccuracy(moves);
      // Move should be counted even without bestMoveEval
      expect(result.moveCount).toBe(1);
      expect(result.white).toBeGreaterThan(90);
    });

    it('produces realistic intermediate-player accuracy', () => {
      // Simulate a game with a mix of good moves and errors
      const moves: CoachGameMove[] = [
        makeMoveData({ moveNumber: 1, evaluation: 20, preMoveEval: 0 }),    // +20, good
        makeMoveData({ moveNumber: 3, evaluation: 30, preMoveEval: 20 }),   // +10, good
        makeMoveData({ moveNumber: 5, evaluation: -20, preMoveEval: 30 }),  // 50cp loss (inaccuracy)
        makeMoveData({ moveNumber: 7, evaluation: 10, preMoveEval: -20 }),  // gained eval
        makeMoveData({ moveNumber: 9, evaluation: -90, preMoveEval: 10 }),  // 100cp loss (mistake)
        makeMoveData({ moveNumber: 11, evaluation: -80, preMoveEval: -90 }),// gained eval
        makeMoveData({ moveNumber: 13, evaluation: -280, preMoveEval: -80 }),// 200cp loss (blunder)
      ];
      const result = calculateAccuracy(moves);
      // Should produce a realistic intermediate range (50-80%)
      expect(result.white).toBeGreaterThan(50);
      expect(result.white).toBeLessThan(80);
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
