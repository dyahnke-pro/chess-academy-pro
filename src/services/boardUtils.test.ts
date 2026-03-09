import { describe, it, expect } from 'vitest';
import { getCapturedPieces, getMaterialAdvantage, uciToArrow, pieceToUnicode } from './boardUtils';

describe('boardUtils', () => {
  describe('getCapturedPieces', () => {
    it('returns empty arrays for starting position', () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const result = getCapturedPieces(fen);
      expect(result.white).toEqual([]);
      expect(result.black).toEqual([]);
    });

    it('detects captured pawns', () => {
      // After 1.e4 d5 2.exd5 — black lost a pawn
      const fen = 'rnbqkbnr/ppp1pppp/8/3P4/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2';
      const result = getCapturedPieces(fen);
      // White captured black's pawn
      expect(result.white).toContain('p');
      // White lost a pawn too (e2 pawn moved to d5, but it's still on the board as P)
      // Actually white still has 8 pawns (7 on rank 2 + 1 on d5), so no white pawn lost
    });

    it('detects multiple captured pieces', () => {
      // Position with fewer pieces — some have been captured
      // White: K, R, 5P; Black: K, Q, R, B, N, 6P
      const fen = '1r1qkb1r/pppppp1p/2n5/8/8/8/PPPPP3/R3K3 w Qk - 0 1';
      const result = getCapturedPieces(fen);
      // White is missing Q, R, 2B, 2N, 3P
      expect(result.black.length).toBeGreaterThan(0);
    });

    it('sorts captured pieces by value (highest first)', () => {
      // Position where white captured queen and pawn
      const fen = 'rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const result = getCapturedPieces(fen);
      // Black's queen is missing
      expect(result.white[0]).toBe('q');
    });
  });

  describe('getMaterialAdvantage', () => {
    it('returns 0 for starting position', () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      expect(getMaterialAdvantage(fen)).toBe(0);
    });

    it('returns positive when white has more material', () => {
      // White has an extra queen
      const fen = 'rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      expect(getMaterialAdvantage(fen)).toBeGreaterThan(0);
    });

    it('returns negative when black has more material', () => {
      // Black has an extra queen (white missing queen)
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR w KQkq - 0 1';
      expect(getMaterialAdvantage(fen)).toBeLessThan(0);
    });
  });

  describe('uciToArrow', () => {
    it('converts valid UCI string to arrow object', () => {
      const result = uciToArrow('e2e4', 'green');
      expect(result).toEqual({
        startSquare: 'e2',
        endSquare: 'e4',
        color: 'green',
      });
    });

    it('handles promotion moves', () => {
      const result = uciToArrow('e7e8q', 'green');
      expect(result).toEqual({
        startSquare: 'e7',
        endSquare: 'e8',
        color: 'green',
      });
    });

    it('returns null for empty string', () => {
      expect(uciToArrow('', 'green')).toBeNull();
    });

    it('returns null for too-short string', () => {
      expect(uciToArrow('e2', 'green')).toBeNull();
    });
  });

  describe('pieceToUnicode', () => {
    it('converts lowercase pieces to black Unicode symbols', () => {
      expect(pieceToUnicode('q')).toBe('\u265B');
      expect(pieceToUnicode('p')).toBe('\u265F');
    });

    it('converts uppercase pieces to white Unicode symbols', () => {
      expect(pieceToUnicode('Q')).toBe('\u2655');
      expect(pieceToUnicode('P')).toBe('\u2659');
    });

    it('returns input for unknown piece', () => {
      expect(pieceToUnicode('x')).toBe('x');
    });
  });
});
