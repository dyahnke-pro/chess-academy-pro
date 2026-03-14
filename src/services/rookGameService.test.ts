import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import {
  buildFen,
  buildMazePieceMap,
  buildClearerPieceMap,
  getRookLegalMoves,
  isAlignedWithAny,
  calculateStars,
  getRookGameProgress,
  completeMazeLevel,
  completeClearerLevel,
  isPawnChapterCompleted,
} from './rookGameService';

// ─── DB Setup ────────────────────────────────────────────────────────────────

beforeEach(async () => {
  await db.delete();
  await db.open();
});

// ─── buildFen ────────────────────────────────────────────────────────────────

describe('buildFen', () => {
  it('builds empty board FEN', () => {
    const fen = buildFen({});
    expect(fen).toBe('8/8/8/8/8/8/8/8 w - - 0 1');
  });

  it('places a white rook on a1', () => {
    const fen = buildFen({ a1: 'R' });
    expect(fen).toBe('8/8/8/8/8/8/8/R7 w - - 0 1');
  });

  it('places multiple pieces', () => {
    const fen = buildFen({ a1: 'R', h8: 'p', d4: 'p' });
    expect(fen).toBe('7p/8/8/8/3p4/8/8/R7 w - - 0 1');
  });

  it('handles pieces on same rank correctly', () => {
    const fen = buildFen({ a1: 'R', c1: 'p', h1: 'p' });
    expect(fen).toBe('8/8/8/8/8/8/8/R1p4p w - - 0 1');
  });
});

// ─── buildMazePieceMap / buildClearerPieceMap ────────────────────────────────

describe('buildMazePieceMap', () => {
  it('places rook and obstacles', () => {
    const pieces = buildMazePieceMap('a1', ['c3', 'e5']);
    expect(pieces).toEqual({ a1: 'R', c3: 'p', e5: 'p' });
  });
});

describe('buildClearerPieceMap', () => {
  it('places rooks and enemies', () => {
    const pieces = buildClearerPieceMap(['a1', 'h8'], ['c3', 'f6']);
    expect(pieces).toEqual({ a1: 'R', h8: 'R', c3: 'p', f6: 'p' });
  });
});

// ─── getRookLegalMoves ───────────────────────────────────────────────────────

describe('getRookLegalMoves', () => {
  it('returns all horizontal and vertical squares from center of empty board', () => {
    const moves = getRookLegalMoves('d4', new Set());
    // 7 on file + 7 on rank = 14
    expect(moves).toHaveLength(14);
    expect(moves).toContain('d1');
    expect(moves).toContain('d8');
    expect(moves).toContain('a4');
    expect(moves).toContain('h4');
  });

  it('returns 14 squares from a1 on empty board', () => {
    const moves = getRookLegalMoves('a1', new Set());
    expect(moves).toHaveLength(14);
    expect(moves).toContain('a8');
    expect(moves).toContain('h1');
  });

  it('blocks rook movement at obstacle', () => {
    // Obstacle at a5 blocks the rook from going above a5
    const moves = getRookLegalMoves('a1', new Set(['a5']));
    expect(moves).toContain('a2');
    expect(moves).toContain('a3');
    expect(moves).toContain('a4');
    expect(moves).not.toContain('a5');
    expect(moves).not.toContain('a6');
    expect(moves).not.toContain('a8');
    // Horizontal still clear
    expect(moves).toContain('h1');
  });

  it('blocks rook from multiple directions', () => {
    // Obstacles at c1 and a3
    const moves = getRookLegalMoves('a1', new Set(['c1', 'a3']));
    expect(moves).toContain('b1'); // can go to b1 (before c1)
    expect(moves).not.toContain('c1'); // blocked by obstacle
    expect(moves).not.toContain('d1'); // behind obstacle
    expect(moves).toContain('a2'); // can go up one
    expect(moves).not.toContain('a3'); // blocked by obstacle
  });

  it('allows capture of enemy pieces (stops on capture)', () => {
    const blocked = new Set<string>();
    const capturable = new Set(['c1', 'a5']);
    const moves = getRookLegalMoves('a1', blocked, capturable);
    expect(moves).toContain('a5'); // can capture a5
    expect(moves).not.toContain('a6'); // stops on capture
    expect(moves).toContain('c1'); // can capture c1 on rank
    expect(moves).not.toContain('d1'); // stops on capture
  });

  it('obstacle blocks before capturable piece', () => {
    const blocked = new Set(['a3']);
    const capturable = new Set(['a5']);
    const moves = getRookLegalMoves('a1', blocked, capturable);
    expect(moves).not.toContain('a5'); // obstacle at a3 blocks reaching a5
    expect(moves).toContain('a2');
  });
});

// ─── isAlignedWithAny ────────────────────────────────────────────────────────

describe('isAlignedWithAny', () => {
  it('returns true when on same file', () => {
    expect(isAlignedWithAny('c3', ['c7', 'f2'])).toBe(true);
  });

  it('returns true when on same rank', () => {
    expect(isAlignedWithAny('c3', ['f3', 'a1'])).toBe(true);
  });

  it('returns false when not aligned', () => {
    expect(isAlignedWithAny('c3', ['d4', 'f6'])).toBe(false);
  });

  it('returns false with empty targets', () => {
    expect(isAlignedWithAny('c3', [])).toBe(false);
  });
});

// ─── calculateStars ──────────────────────────────────────────────────────────

describe('calculateStars', () => {
  it('returns 3 stars at par', () => {
    expect(calculateStars(3, 3)).toBe(3);
  });

  it('returns 3 stars under par', () => {
    expect(calculateStars(2, 3)).toBe(3);
  });

  it('returns 2 stars at par + 1', () => {
    expect(calculateStars(4, 3)).toBe(2);
  });

  it('returns 2 stars at par + 2', () => {
    expect(calculateStars(5, 3)).toBe(2);
  });

  it('returns 1 star over par + 2', () => {
    expect(calculateStars(6, 3)).toBe(1);
  });
});

// ─── Progress Persistence ────────────────────────────────────────────────────

describe('progress persistence', () => {
  it('returns default progress when none exists', async () => {
    const progress = await getRookGameProgress();
    expect(progress).toEqual({ rookMaze: {}, rowClearer: {} });
  });

  it('saves and retrieves maze level completion', async () => {
    await completeMazeLevel(1, 3, 3);
    const progress = await getRookGameProgress();
    expect(progress.rookMaze[1]).toEqual({
      completed: true,
      bestMoves: 3,
      stars: 3,
    });
  });

  it('saves and retrieves clearer level completion', async () => {
    await completeClearerLevel(1, 4, 4);
    const progress = await getRookGameProgress();
    expect(progress.rowClearer[1]).toEqual({
      completed: true,
      bestMoves: 4,
      stars: 3,
    });
  });

  it('updates best moves when improved', async () => {
    await completeMazeLevel(1, 5, 3);
    await completeMazeLevel(1, 3, 3);
    const progress = await getRookGameProgress();
    expect(progress.rookMaze[1].bestMoves).toBe(3);
    expect(progress.rookMaze[1].stars).toBe(3);
  });

  it('preserves higher star rating on worse moves', async () => {
    await completeMazeLevel(1, 3, 3); // 3 stars
    await completeMazeLevel(1, 6, 3); // 1 star, worse moves
    const progress = await getRookGameProgress();
    // Should keep best moves = 3, stars = 3
    expect(progress.rookMaze[1].bestMoves).toBe(3);
    expect(progress.rookMaze[1].stars).toBe(3);
  });

  it('preserves best stars even when improving moves', async () => {
    await completeMazeLevel(1, 3, 3); // 3 stars, 3 moves
    await completeMazeLevel(1, 2, 3); // 3 stars, 2 moves (better)
    const progress = await getRookGameProgress();
    expect(progress.rookMaze[1].bestMoves).toBe(2);
    expect(progress.rookMaze[1].stars).toBe(3);
  });
});

// ─── isPawnChapterCompleted ──────────────────────────────────────────────────

describe('isPawnChapterCompleted', () => {
  it('returns false when no journey progress exists', async () => {
    const result = await isPawnChapterCompleted();
    expect(result).toBe(false);
  });

  it('returns false when pawn chapter not completed', async () => {
    await db.meta.put({
      key: 'journey_progress',
      value: JSON.stringify({
        chapters: { pawn: { completed: false } },
        currentChapterId: 'pawn',
        startedAt: new Date().toISOString(),
        completedAt: null,
      }),
    });
    const result = await isPawnChapterCompleted();
    expect(result).toBe(false);
  });

  it('returns true when pawn chapter completed', async () => {
    await db.meta.put({
      key: 'journey_progress',
      value: JSON.stringify({
        chapters: {
          pawn: {
            completed: true,
            completedAt: new Date().toISOString(),
          },
        },
        currentChapterId: 'rook',
        startedAt: new Date().toISOString(),
        completedAt: null,
      }),
    });
    const result = await isPawnChapterCompleted();
    expect(result).toBe(true);
  });
});
