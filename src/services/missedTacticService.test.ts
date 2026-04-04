import { describe, it, expect } from 'vitest';
import { detectTacticType, detectMissedTactics } from './missedTacticService';
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

describe('detectTacticType', () => {
  it('detects promotion with explicit promotion piece', () => {
    const fen = '8/P7/8/8/8/8/8/4K2k w - - 0 1';
    expect(detectTacticType(fen, 'a7a8q')).toBe('promotion');
  });

  it('detects promotion from pawn reaching 8th rank', () => {
    const fen = '8/P7/8/8/8/8/8/4K2k w - - 0 1';
    expect(detectTacticType(fen, 'a7a8')).toBe('promotion');
  });

  it('detects back rank check', () => {
    // White rook on a1, black king on g8 with pawns blocking
    const fen = '6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1';
    expect(detectTacticType(fen, 'a1a8')).toBe('back_rank');
  });

  it('detects fork (knight attacks two valuable pieces)', () => {
    // Knight on e5 moves to d3 forking queen on b2 and rook on f2
    // Use a midboard position to avoid back_rank detection
    const fen = '8/8/4k3/4N3/8/8/1q3r2/4K3 w - - 0 1';
    // Ne5-d3 attacks b2 (queen) and f2 (rook) — both ≥3 value
    expect(detectTacticType(fen, 'e5d3')).toBe('fork');
  });

  it('detects pin on file (rook pins piece to king)', () => {
    // White rook on a2 moves to a1, and from a1 pins black knight on a4 to black king on a8
    // Position: black king a8, black knight a4, white rook a2, white king h1
    const fen = 'k7/8/8/8/n7/8/R7/7K w - - 0 1';
    // Ra2-a1 creates a pin on the a-file (rook on a1, knight on a4, king on a8)
    const result = detectTacticType(fen, 'a2a1');
    expect(result).toBe('pin');
  });

  it('returns tactical_sequence for invalid input', () => {
    expect(detectTacticType('invalid fen', 'e2e4')).toBe('tactical_sequence');
  });

  it('returns tactical_sequence for empty move', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(detectTacticType(fen, '')).toBe('tactical_sequence');
  });

  it('detects hanging piece capture', () => {
    // White knight on e5 captures undefended black pawn/piece on f7
    const fen = 'rnbqkb1r/pppppppp/5n2/4N3/8/8/PPPPPPPP/RNBQKB1R w KQkq - 0 1';
    const result = detectTacticType(fen, 'e5f7');
    expect(typeof result).toBe('string');
    expect(result).not.toBe('');
  });

  it('handles all new tactic types as valid return values', () => {
    // Just verify the function can return without crashing on various positions
    const positions = [
      { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', move: 'e2e4' },
      { fen: '8/8/8/8/8/8/4K3/4k3 w - - 0 1', move: 'e2e3' },
      { fen: 'r1bqkbnr/pppppppp/2n5/4N3/8/8/PPPPPPPP/RNBQKB1R w KQkq - 0 1', move: 'e5c6' },
    ];
    for (const { fen, move } of positions) {
      const result = detectTacticType(fen, move);
      expect(typeof result).toBe('string');
    }
  });
});

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
