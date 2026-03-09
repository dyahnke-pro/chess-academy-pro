import { describe, it, expect } from 'vitest';
import { detectMissedTactics } from './missedTacticService';
import type { CoachGameMove } from '../types';

function makeMoves(overrides: Partial<CoachGameMove>[]): CoachGameMove[] {
  return overrides.map((o, i) => ({
    moveNumber: i + 1,
    san: o.san ?? 'e4',
    fen: o.fen ?? 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    isCoachMove: false,
    commentary: '',
    evaluation: 0,
    classification: 'good',
    expanded: false,
    bestMove: null,
    bestMoveEval: null,
    preMoveEval: 0,
    ...o,
  }));
}

describe('detectMissedTactics', () => {
  it('returns empty array for no moves', () => {
    const result = detectMissedTactics([], 'white');
    expect(result).toEqual([]);
  });

  it('returns empty array for all good moves', () => {
    const moves = makeMoves([
      { moveNumber: 1, classification: 'good' },
      { moveNumber: 3, classification: 'great' },
      { moveNumber: 5, classification: 'brilliant' },
    ]);
    const result = detectMissedTactics(moves, 'white');
    expect(result).toEqual([]);
  });

  it('skips coach moves', () => {
    const moves = makeMoves([
      { moveNumber: 2, isCoachMove: true, classification: 'blunder', bestMove: 'e2e4', bestMoveEval: 200, evaluation: -100 },
    ]);
    const result = detectMissedTactics(moves, 'black');
    expect(result).toEqual([]);
  });

  it('detects blunder with sufficient eval swing', () => {
    const moves = makeMoves([
      {
        moveNumber: 1,
        san: 'h3',
        fen: 'rnbqkbnr/pppppppp/8/8/8/7P/PPPPPPP1/RNBQKBNR b KQkq - 0 1',
        classification: 'blunder',
        bestMove: 'e2e4',
        bestMoveEval: 150,
        evaluation: -100,
      },
    ]);
    const result = detectMissedTactics(moves, 'white');
    expect(result).toHaveLength(1);
    expect(result[0].playerMoved).toBe('h3');
    expect(result[0].bestMove).toBe('e2e4');
    expect(result[0].evalSwing).toBe(250);
    expect(result[0].tacticType).toBeDefined();
    expect(result[0].explanation).toContain('e2e4');
  });

  it('skips moves below eval swing threshold', () => {
    const moves = makeMoves([
      {
        moveNumber: 1,
        classification: 'mistake',
        bestMove: 'e2e4',
        bestMoveEval: 50,
        evaluation: 0,
      },
    ]);
    const result = detectMissedTactics(moves, 'white');
    expect(result).toEqual([]);
  });

  it('filters by player color', () => {
    const moves = makeMoves([
      {
        moveNumber: 1, // white move
        classification: 'blunder',
        bestMove: 'e2e4',
        bestMoveEval: 200,
        evaluation: -100,
      },
    ]);
    const resultBlack = detectMissedTactics(moves, 'black');
    expect(resultBlack).toEqual([]);

    const resultWhite = detectMissedTactics(moves, 'white');
    expect(resultWhite).toHaveLength(1);
  });

  it('sorts by eval swing descending', () => {
    const moves = makeMoves([
      {
        moveNumber: 1,
        classification: 'mistake',
        bestMove: 'e2e4',
        bestMoveEval: 150,
        evaluation: 0,
      },
      {
        moveNumber: 3,
        classification: 'blunder',
        bestMove: 'd2d4',
        bestMoveEval: 500,
        evaluation: -100,
      },
    ]);
    const result = detectMissedTactics(moves, 'white');
    expect(result).toHaveLength(2);
    expect(result[0].evalSwing).toBeGreaterThan(result[1].evalSwing);
  });

  it('limits to 10 tactics maximum', () => {
    const moves = makeMoves(
      Array.from({ length: 20 }, (_, i) => ({
        moveNumber: i * 2 + 1,
        classification: 'blunder' as const,
        bestMove: 'e2e4',
        bestMoveEval: 300,
        evaluation: -100,
      })),
    );
    const result = detectMissedTactics(moves, 'white');
    expect(result.length).toBeLessThanOrEqual(10);
  });

  it('skips moves without bestMove', () => {
    const moves = makeMoves([
      {
        moveNumber: 1,
        classification: 'blunder',
        bestMove: null,
        bestMoveEval: null,
        evaluation: -100,
      },
    ]);
    const result = detectMissedTactics(moves, 'white');
    expect(result).toEqual([]);
  });
});
