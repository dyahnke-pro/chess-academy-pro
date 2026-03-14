import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { KING_ESCAPE_LEVELS, KING_MARCH_LEVELS } from './kingGameLevels';

describe('kingGameLevels', () => {
  describe('KING_ESCAPE_LEVELS', () => {
    it('has 3 levels', () => {
      expect(KING_ESCAPE_LEVELS).toHaveLength(3);
    });

    it('all levels have valid FEN with king in check', () => {
      for (const level of KING_ESCAPE_LEVELS) {
        const chess = new Chess(level.fen);
        expect(chess.inCheck()).toBe(true);
      }
    });

    it('all levels have at least one legal move', () => {
      for (const level of KING_ESCAPE_LEVELS) {
        const chess = new Chess(level.fen);
        const moves = chess.moves({ verbose: true });
        expect(moves.length).toBeGreaterThan(0);
      }
    });

    it('level 1 has 4 safe squares', () => {
      const chess = new Chess(KING_ESCAPE_LEVELS[0].fen);
      const moves = chess.moves({ verbose: true });
      expect(moves).toHaveLength(4);
    });

    it('level 2 has 3 safe squares', () => {
      const chess = new Chess(KING_ESCAPE_LEVELS[1].fen);
      const moves = chess.moves({ verbose: true });
      expect(moves).toHaveLength(3);
    });

    it('level 3 has 2 safe squares', () => {
      const chess = new Chess(KING_ESCAPE_LEVELS[2].fen);
      const moves = chess.moves({ verbose: true });
      expect(moves).toHaveLength(2);
    });

    it('level 1 shows danger and safe squares', () => {
      expect(KING_ESCAPE_LEVELS[0].showDangerSquares).toBe(true);
      expect(KING_ESCAPE_LEVELS[0].showSafeSquares).toBe(true);
    });

    it('level 2 shows danger but not safe squares', () => {
      expect(KING_ESCAPE_LEVELS[1].showDangerSquares).toBe(true);
      expect(KING_ESCAPE_LEVELS[1].showSafeSquares).toBe(false);
    });

    it('level 3 shows no highlights', () => {
      expect(KING_ESCAPE_LEVELS[2].showDangerSquares).toBe(false);
      expect(KING_ESCAPE_LEVELS[2].showSafeSquares).toBe(false);
    });
  });

  describe('KING_MARCH_LEVELS', () => {
    it('has 3 levels', () => {
      expect(KING_MARCH_LEVELS).toHaveLength(3);
    });

    it('all levels have valid FEN with king NOT in check', () => {
      for (const level of KING_MARCH_LEVELS) {
        const chess = new Chess(level.fen);
        expect(chess.inCheck()).toBe(false);
      }
    });

    it('all levels have goal square e8', () => {
      for (const level of KING_MARCH_LEVELS) {
        expect(level.goalSquare).toBe('e8');
      }
    });

    it('goal square e8 is not attacked in any level', () => {
      for (const level of KING_MARCH_LEVELS) {
        const chess = new Chess(level.fen);
        expect(chess.isAttacked('e8', 'b')).toBe(false);
      }
    });

    it('all levels have a valid path from e1 to e8 (no captures)', () => {
      for (const level of KING_MARCH_LEVELS) {
        const path = findPathNoCapture(level.fen, level.goalSquare);
        expect(path).not.toBeNull();
        if (path === null) throw new Error('path is null');
        expect(path.length).toBeGreaterThan(1);
        expect(path[path.length - 1]).toBe(level.goalSquare);
      }
    });

    it('level 1 has 2 enemy pieces', () => {
      const pieceCount = countBlackPieces(KING_MARCH_LEVELS[0].fen);
      expect(pieceCount).toBe(2);
    });

    it('level 2 has 4 enemy pieces', () => {
      const pieceCount = countBlackPieces(KING_MARCH_LEVELS[1].fen);
      expect(pieceCount).toBe(4);
    });

    it('level 3 has 6 enemy pieces', () => {
      const pieceCount = countBlackPieces(KING_MARCH_LEVELS[2].fen);
      expect(pieceCount).toBe(6);
    });

    it('level 1 shows danger and safe squares', () => {
      expect(KING_MARCH_LEVELS[0].showDangerSquares).toBe(true);
      expect(KING_MARCH_LEVELS[0].showSafeSquares).toBe(true);
    });

    it('level 2 shows danger but not safe squares', () => {
      expect(KING_MARCH_LEVELS[1].showDangerSquares).toBe(true);
      expect(KING_MARCH_LEVELS[1].showSafeSquares).toBe(false);
    });

    it('level 3 shows no highlights', () => {
      expect(KING_MARCH_LEVELS[2].showDangerSquares).toBe(false);
      expect(KING_MARCH_LEVELS[2].showSafeSquares).toBe(false);
    });
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countBlackPieces(fen: string): number {
  const position = fen.split(' ')[0];
  let count = 0;
  for (const ch of position) {
    // Black pieces are lowercase letters (excluding 'k' which is the king)
    if (ch >= 'a' && ch <= 'z' && ch !== 'k') {
      count++;
    }
  }
  return count;
}

function findPathNoCapture(fen: string, goal: string): string[] | null {
  const visited = new Set<string>();
  const queue: Array<{ fen: string; path: string[] }> = [{ fen, path: ['e1'] }];
  visited.add('e1');

  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) break;
    const chess = new Chess(item.fen);
    const moves = chess.moves({ verbose: true }).filter((m) => !m.captured);

    for (const move of moves) {
      if (visited.has(move.to)) continue;
      visited.add(move.to);
      const newPath = [...item.path, move.to];
      if (move.to === goal) return newPath;

      const c2 = new Chess(item.fen);
      c2.move(move);
      let newFen = c2.fen();
      const parts = newFen.split(' ');
      parts[1] = 'w';
      parts[3] = '-';
      newFen = parts.join(' ');

      queue.push({ fen: newFen, path: newPath });
    }
  }
  return null;
}
