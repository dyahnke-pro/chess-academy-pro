import { describe, it, expect } from 'vitest';
import {
  squareToCoords,
  coordsToSquare,
  isLightSquare,
  isDarkSquare,
  getBishopMoves,
  positionToFen,
  advancePawns,
  checkPawnPromotion,
  countEnemyPieces,
  countBlackPawns,
  findPieceSquares,
  getPromotionRankSquares,
} from './bishopGameUtils';

describe('bishopGameUtils', () => {
  // ── Coordinate conversion ──────────────────────────────────────

  describe('squareToCoords', () => {
    it('converts a1 to (0,0)', () => {
      expect(squareToCoords('a1')).toEqual({ file: 0, rank: 0 });
    });

    it('converts h8 to (7,7)', () => {
      expect(squareToCoords('h8')).toEqual({ file: 7, rank: 7 });
    });

    it('converts e4 to (4,3)', () => {
      expect(squareToCoords('e4')).toEqual({ file: 4, rank: 3 });
    });
  });

  describe('coordsToSquare', () => {
    it('converts (0,0) to a1', () => {
      expect(coordsToSquare(0, 0)).toBe('a1');
    });

    it('converts (7,7) to h8', () => {
      expect(coordsToSquare(7, 7)).toBe('h8');
    });

    it('roundtrips with squareToCoords', () => {
      const squares = ['a1', 'b3', 'c5', 'd7', 'e2', 'f4', 'g6', 'h8'];
      for (const sq of squares) {
        const { file, rank } = squareToCoords(sq);
        expect(coordsToSquare(file, rank)).toBe(sq);
      }
    });
  });

  // ── Square color ───────────────────────────────────────────────

  describe('isLightSquare / isDarkSquare', () => {
    it('a1 is dark', () => {
      expect(isLightSquare('a1')).toBe(false);
      expect(isDarkSquare('a1')).toBe(true);
    });

    it('a2 is light', () => {
      expect(isLightSquare('a2')).toBe(true);
      expect(isDarkSquare('a2')).toBe(false);
    });

    it('h1 is light', () => {
      expect(isLightSquare('h1')).toBe(true);
    });

    it('h8 is dark', () => {
      expect(isDarkSquare('h8')).toBe(true);
    });

    it('d4 is dark (file 3 + rank 3 = 6, even)', () => {
      expect(isDarkSquare('d4')).toBe(true);
    });

    it('e4 is light (file 4 + rank 3 = 7, odd)', () => {
      expect(isLightSquare('e4')).toBe(true);
    });
  });

  // ── Bishop moves ───────────────────────────────────────────────

  describe('getBishopMoves', () => {
    it('returns all diagonal squares from center on empty board', () => {
      const pieces: Record<string, string> = { d4: 'B' };
      const moves = getBishopMoves('d4', pieces);
      // Should reach corners along both diagonals
      expect(moves).toContain('a1');
      expect(moves).toContain('g7');
      expect(moves).toContain('a7');
      expect(moves).toContain('g1');
      expect(moves.length).toBe(13);
    });

    it('returns all diagonal squares from corner', () => {
      const pieces: Record<string, string> = { a1: 'B' };
      const moves = getBishopMoves('a1', pieces);
      expect(moves).toContain('b2');
      expect(moves).toContain('h8');
      expect(moves.length).toBe(7); // b2,c3,d4,e5,f6,g7,h8
    });

    it('stops when hitting a white piece (cannot capture or pass)', () => {
      const pieces: Record<string, string> = { d4: 'B', f6: 'P' };
      const moves = getBishopMoves('d4', pieces);
      expect(moves).toContain('e5');
      expect(moves).not.toContain('f6'); // blocked by friendly piece
      expect(moves).not.toContain('g7');
    });

    it('can capture a black piece but stops there', () => {
      const pieces: Record<string, string> = { d4: 'B', f6: 'p' };
      const moves = getBishopMoves('d4', pieces);
      expect(moves).toContain('e5');
      expect(moves).toContain('f6'); // can capture
      expect(moves).not.toContain('g7'); // blocked after capture
    });

    it('returns empty array if completely surrounded by friendly pieces', () => {
      const pieces: Record<string, string> = {
        d4: 'B', c3: 'P', e3: 'P', c5: 'P', e5: 'P',
      };
      const moves = getBishopMoves('d4', pieces);
      expect(moves).toEqual([]);
    });

    it('handles bishop at edge of board', () => {
      const pieces: Record<string, string> = { a4: 'B' };
      const moves = getBishopMoves('a4', pieces);
      // Only two diagonals go onto the board (right-up and right-down)
      expect(moves).toContain('b5');
      expect(moves).toContain('b3');
      expect(moves).not.toContain('a5'); // not diagonal
    });
  });

  // ── FEN generation ─────────────────────────────────────────────

  describe('positionToFen', () => {
    it('generates valid FEN with just a bishop', () => {
      const pieces: Record<string, string> = { d4: 'B' };
      const fen = positionToFen(pieces);
      // Should have dummy kings at a1 and h8
      expect(fen).toContain('K');
      expect(fen).toContain('k');
      expect(fen).toContain('B');
      expect(fen).toMatch(/ w - - 0 1$/);
    });

    it('places dummy kings at a1 and h8 when no kings exist', () => {
      const pieces: Record<string, string> = { e4: 'B' };
      const fen = positionToFen(pieces);
      // rank 1 should contain K at a1
      const ranks = fen.split(' ')[0].split('/');
      expect(ranks[7]).toMatch(/K/); // rank 1 (last in FEN)
      expect(ranks[0]).toMatch(/k/); // rank 8 (first in FEN)
    });

    it('does not add extra kings if kings already present', () => {
      const pieces: Record<string, string> = { e1: 'K', e8: 'k', d4: 'B' };
      const fen = positionToFen(pieces);
      const kingCount = (fen.split(' ')[0].match(/[Kk]/g) ?? []).length;
      expect(kingCount).toBe(2);
    });

    it('correctly encodes multiple pieces on same rank', () => {
      const pieces: Record<string, string> = { b6: 'p', d6: 'p', f6: 'p' };
      const fen = positionToFen(pieces);
      // rank 6 = index 2 in FEN (rank 8,7,6,5...)
      const ranks = fen.split(' ')[0].split('/');
      expect(ranks[2]).toBe('1p1p1p2'); // a=empty, b=p, c=empty, d=p, e=empty, f=p, g+h=empty
    });
  });

  // ── Pawn advancement ───────────────────────────────────────────

  describe('advancePawns', () => {
    it('moves black pawns one rank toward rank 1', () => {
      const pieces: Record<string, string> = { d6: 'p', f6: 'p' };
      const result = advancePawns(pieces);
      expect(result['d5']).toBe('p');
      expect(result['f5']).toBe('p');
      expect(result['d6']).toBeUndefined();
      expect(result['f6']).toBeUndefined();
    });

    it('does not move non-pawn pieces', () => {
      const pieces: Record<string, string> = { d6: 'p', e4: 'B' };
      const result = advancePawns(pieces);
      expect(result['e4']).toBe('B');
      expect(result['d5']).toBe('p');
    });

    it('pawn on rank 1 stays in place', () => {
      const pieces: Record<string, string> = { c1: 'p' };
      const result = advancePawns(pieces);
      expect(result['c1']).toBe('p');
    });

    it('pawn does not advance onto occupied square', () => {
      const pieces: Record<string, string> = { d4: 'p', d3: 'B' };
      const result = advancePawns(pieces);
      expect(result['d4']).toBe('p'); // stays in place
      expect(result['d3']).toBe('B');
    });
  });

  // ── Win/loss conditions ────────────────────────────────────────

  describe('checkPawnPromotion', () => {
    it('returns true when a pawn is on rank 1', () => {
      expect(checkPawnPromotion({ c1: 'p', e4: 'B' })).toBe(true);
    });

    it('returns false when no pawn on rank 1', () => {
      expect(checkPawnPromotion({ c2: 'p', e4: 'B' })).toBe(false);
    });

    it('returns false with empty board', () => {
      expect(checkPawnPromotion({})).toBe(false);
    });
  });

  describe('countEnemyPieces', () => {
    it('counts black pawns and rooks but not king', () => {
      const pieces = { a1: 'K', h8: 'k', d4: 'p', e5: 'r', f6: 'p' };
      expect(countEnemyPieces(pieces)).toBe(3);
    });

    it('returns 0 with no enemy pieces', () => {
      const pieces = { a1: 'K', h8: 'k', d4: 'B' };
      expect(countEnemyPieces(pieces)).toBe(0);
    });
  });

  describe('countBlackPawns', () => {
    it('counts only black pawns', () => {
      const pieces = { d4: 'p', e5: 'r', f6: 'p', g3: 'B' };
      expect(countBlackPawns(pieces)).toBe(2);
    });

    it('returns 0 with no pawns', () => {
      expect(countBlackPawns({ e4: 'B' })).toBe(0);
    });
  });

  // ── Piece finding ──────────────────────────────────────────────

  describe('findPieceSquares', () => {
    it('finds all squares with a specific piece', () => {
      const pieces = { d4: 'B', f2: 'B', c6: 'p' };
      const bishops = findPieceSquares(pieces, 'B');
      expect(bishops).toHaveLength(2);
      expect(bishops).toContain('d4');
      expect(bishops).toContain('f2');
    });

    it('returns empty array when piece not found', () => {
      expect(findPieceSquares({ d4: 'B' }, 'p')).toEqual([]);
    });
  });

  // ── Promotion rank ─────────────────────────────────────────────

  describe('getPromotionRankSquares', () => {
    it('returns all 8 squares on rank 1', () => {
      const squares = getPromotionRankSquares();
      expect(squares).toHaveLength(8);
      expect(squares).toContain('a1');
      expect(squares).toContain('h1');
    });
  });
});
