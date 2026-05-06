import { describe, it, expect } from 'vitest';
import {
  calculateAccuracy,
  getClassificationCounts,
  cpLossToAccuracy,
  capEval,
  winPercent,
  accuracyFromWinDelta,
} from './accuracyService';
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

  describe('winPercent', () => {
    it('returns 50% at eval 0', () => {
      expect(winPercent(0)).toBeCloseTo(50, 1);
    });
    it('saturates near 100 for big white advantage', () => {
      expect(winPercent(2000)).toBeGreaterThan(99);
    });
    it('saturates near 0 for big white disadvantage', () => {
      expect(winPercent(-2000)).toBeLessThan(1);
    });
    it('produces ~67% at +200cp', () => {
      const w = winPercent(200);
      expect(w).toBeGreaterThan(64);
      expect(w).toBeLessThan(70);
    });
  });

  describe('accuracyFromWinDelta', () => {
    it('returns 100 when no win-percent dropped', () => {
      expect(accuracyFromWinDelta(0)).toBeCloseTo(100, 0);
    });
    it('returns ~63 for a 10-point drop', () => {
      const a = accuracyFromWinDelta(10);
      expect(a).toBeGreaterThan(58);
      expect(a).toBeLessThan(68);
    });
    it('returns ~30 for a 25-point drop', () => {
      const a = accuracyFromWinDelta(25);
      expect(a).toBeGreaterThan(25);
      expect(a).toBeLessThan(40);
    });
    it('floors near 0 for >60-point drop', () => {
      expect(accuracyFromWinDelta(60)).toBeLessThan(8);
    });
  });

  describe('cpLossToAccuracy (legacy compat)', () => {
    it('returns ~100 for 0 cp loss', () => {
      expect(cpLossToAccuracy(0)).toBeCloseTo(100, 0);
    });
    it('returns very high for tiny losses', () => {
      expect(cpLossToAccuracy(10)).toBeGreaterThan(90);
    });
    it('returns lower for big losses', () => {
      expect(cpLossToAccuracy(300)).toBeLessThan(40);
    });
  });

  describe('calculateAccuracy', () => {
    it('returns 0 for empty moves', () => {
      const result = calculateAccuracy([]);
      expect(result.white).toBe(0);
      expect(result.black).toBe(0);
      expect(result.moveCount).toBe(0);
    });

    it('returns high accuracy for moves that maintain or grow the eval', () => {
      const moves: CoachGameMove[] = [
        makeMoveData({ moveNumber: 1, evaluation: 30, preMoveEval: 0 }),
        makeMoveData({ moveNumber: 2, evaluation: 25, preMoveEval: 30, isCoachMove: true }),
        makeMoveData({ moveNumber: 3, evaluation: 50, preMoveEval: 25 }),
      ];
      const result = calculateAccuracy(moves);
      expect(result.white).toBeGreaterThan(95);
    });

    it('returns lower accuracy for blundered moves', () => {
      const moves: CoachGameMove[] = [
        makeMoveData({ moveNumber: 1, evaluation: -200, preMoveEval: 0, classification: 'blunder' }),
        makeMoveData({ moveNumber: 3, evaluation: -300, preMoveEval: -200, classification: 'blunder' }),
      ];
      const result = calculateAccuracy(moves);
      // Two blunders from the moving side — chess.com algo gives
      // roughly 30-50% depending on win-percent delta. Definitely
      // less than a clean game.
      expect(result.white).toBeLessThan(60);
    });

    it('penalizes blunders less when already winning by a huge margin', () => {
      // Player is +800 (94% win) and drops to +200 (67% win) — a
      // 27-point win-percent drop. chess.com's algo treats this as
      // a real mistake but not catastrophic since they're still
      // winning by ~67%.
      const moves: CoachGameMove[] = [
        makeMoveData({ moveNumber: 1, evaluation: 200, preMoveEval: 800, classification: 'blunder' }),
      ];
      const result = calculateAccuracy(moves);
      // ~28% per chess.com's algorithm — reflects "you're still
      // winning but you slipped." Same game's cp-loss of 600 in the
      // old algo would have shown near-zero, which doesn't match
      // chess.com.
      expect(result.white).toBeGreaterThan(20);
      expect(result.white).toBeLessThan(40);
    });

    it('catastrophizes blunders when going from winning to losing', () => {
      // Player is +200 (67% win) and drops to -800 (~5% win) — a
      // 62-point win-percent drop. This is the chess.com "you threw
      // away the win" scenario.
      const moves: CoachGameMove[] = [
        makeMoveData({ moveNumber: 1, evaluation: -800, preMoveEval: 200, classification: 'blunder' }),
      ];
      const result = calculateAccuracy(moves);
      expect(result.white).toBeLessThan(15);
    });

    it('gives near-perfect accuracy for optimal play', () => {
      const moves: CoachGameMove[] = [
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
      expect(result.moveCount).toBe(1);
      expect(result.white).toBeGreaterThan(90);
    });

    it('produces realistic intermediate-player accuracy', () => {
      // Mix of good moves and errors. Harmonic mean drags the
      // average down because of the blunder.
      const moves: CoachGameMove[] = [
        makeMoveData({ moveNumber: 1, evaluation: 20, preMoveEval: 0 }),
        makeMoveData({ moveNumber: 3, evaluation: 30, preMoveEval: 20 }),
        makeMoveData({ moveNumber: 5, evaluation: -20, preMoveEval: 30 }),
        makeMoveData({ moveNumber: 7, evaluation: 10, preMoveEval: -20 }),
        makeMoveData({ moveNumber: 9, evaluation: -90, preMoveEval: 10 }),
        makeMoveData({ moveNumber: 11, evaluation: -80, preMoveEval: -90 }),
        makeMoveData({ moveNumber: 13, evaluation: -280, preMoveEval: -80 }),
      ];
      const result = calculateAccuracy(moves);
      expect(result.white).toBeGreaterThan(50);
      expect(result.white).toBeLessThan(95);
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
