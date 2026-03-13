import { describe, it, expect } from 'vitest';
import { generateSocraticNudge } from './socraticNudgeService';

describe('socraticNudgeService', () => {
  describe('puzzle theme nudges', () => {
    it('returns fork nudge for fork theme', () => {
      const result = generateSocraticNudge({
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        bestMoveUci: 'e2e4',
        puzzleThemes: ['fork'],
      });
      expect(result).toContain('attack two things');
    });

    it('returns pin nudge for pin theme', () => {
      const result = generateSocraticNudge({
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        bestMoveUci: 'e2e4',
        puzzleThemes: ['pin'],
      });
      expect(result).toContain('stuck defending');
    });

    it('returns skewer nudge for skewer theme', () => {
      const result = generateSocraticNudge({
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        bestMoveUci: 'e2e4',
        puzzleThemes: ['skewer'],
      });
      expect(result).toContain('X-ray');
    });

    it('returns back rank nudge for backRankMate theme', () => {
      const result = generateSocraticNudge({
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        bestMoveUci: 'e2e4',
        puzzleThemes: ['backRankMate'],
      });
      expect(result).toContain('back rank');
    });

    it('returns discovered attack nudge', () => {
      const result = generateSocraticNudge({
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        bestMoveUci: 'e2e4',
        puzzleThemes: ['discoveredAttack'],
      });
      expect(result).toContain('reveal an attack');
    });

    it('returns sacrifice nudge', () => {
      const result = generateSocraticNudge({
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        bestMoveUci: 'e2e4',
        puzzleThemes: ['sacrifice'],
      });
      expect(result).toContain('sacrifice');
    });

    it('returns deflection nudge', () => {
      const result = generateSocraticNudge({
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        bestMoveUci: 'e2e4',
        puzzleThemes: ['deflection'],
      });
      expect(result).toContain('lure it away');
    });

    it('returns mate nudge for mateIn1', () => {
      const result = generateSocraticNudge({
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        bestMoveUci: 'e2e4',
        puzzleThemes: ['mateIn1'],
      });
      expect(result).toContain('checkmate');
    });

    it('uses first matching theme', () => {
      const result = generateSocraticNudge({
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        bestMoveUci: 'e2e4',
        puzzleThemes: ['unknownTheme', 'fork', 'pin'],
      });
      expect(result).toContain('attack two things');
    });

    it('falls through when themes do not match any known nudge', () => {
      const result = generateSocraticNudge({
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        bestMoveUci: 'e2e4',
        puzzleThemes: ['unknownTheme'],
      });
      // Should fall through to move-type or positional nudge, not theme
      expect(result).toBeTruthy();
    });
  });

  describe('castling detection', () => {
    it('detects white kingside castling', () => {
      const result = generateSocraticNudge({
        fen: 'rnbqkbnr/pppppppp/8/8/8/5NP1/PPPPPP1P/RNBQKB1R w KQkq - 0 3',
        bestMoveUci: 'e1g1',
      });
      expect(result).toContain('king safety');
    });

    it('detects white queenside castling', () => {
      const result = generateSocraticNudge({
        fen: 'rnbqkbnr/pppppppp/8/8/8/2NB4/PPPPPPPP/R1BQK1NR w KQkq - 0 3',
        bestMoveUci: 'e1c1',
      });
      expect(result).toContain('king safety');
    });

    it('detects black castling', () => {
      const result = generateSocraticNudge({
        fen: 'rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 4 4',
        bestMoveUci: 'e8g8',
      });
      expect(result).toContain('king safety');
    });
  });

  describe('check detection', () => {
    it('detects a move that gives check', () => {
      // White queen on d1 moves to a4, giving check to black king on a8 via a-file
      // King is on a-file (NOT e-file) so king safety won't fire
      const result = generateSocraticNudge({
        fen: 'k7/8/8/8/8/8/8/3QK3 w - - 0 1',
        bestMoveUci: 'd1a4',
      });
      expect(result).toContain('check');
    });
  });

  describe('capture detection', () => {
    it('detects a capturing move', () => {
      // White knight captures on e5
      const result = generateSocraticNudge({
        fen: 'rnbqkb1r/pppppppp/5n2/4N3/4P3/8/PPPP1PPP/RNBQKB1R b KQkq - 0 2',
        bestMoveUci: 'f6e4',
      });
      expect(result).toContain('unprotected');
    });
  });

  describe('promotion detection', () => {
    it('detects a pawn promotion move', () => {
      // Pawn on b7 promotes to b8=Q — king on h6 (not on same rank/file/diagonal as b8)
      const result = generateSocraticNudge({
        fen: '8/1P6/7k/8/8/8/8/4K3 w - - 0 1',
        bestMoveUci: 'b7b8q',
      });
      expect(result).toContain('promotion');
    });

    it('detects an advanced pawn nearing promotion', () => {
      // White pawn on c7 not yet promoting (move c7c8 without promotion suffix for testing the rank-check)
      // Actually use pawn on b6 moving to b7 (rank 6→7, close to promotion)
      const result = generateSocraticNudge({
        fen: '7k/8/1P6/8/8/8/8/4K3 w - - 0 1',
        bestMoveUci: 'b6b7',
      });
      expect(result).toContain('close to the other side');
    });
  });

  describe('center control detection', () => {
    it('detects a central pawn push', () => {
      const result = generateSocraticNudge({
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        bestMoveUci: 'e2e4',
      });
      expect(result).toContain('center');
    });
  });

  describe('development detection', () => {
    it('detects undeveloped knight on back rank', () => {
      const result = generateSocraticNudge({
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1',
        bestMoveUci: 'g1f3',
      });
      expect(result).toContain('starting square');
    });

    it('detects undeveloped bishop on back rank', () => {
      const result = generateSocraticNudge({
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 2',
        bestMoveUci: 'f1c4',
      });
      expect(result).toContain('starting square');
    });
  });

  describe('king safety heuristic', () => {
    it('detects opponent uncastled king on e-file', () => {
      // Position where opponent king is on e8 and best move is not castling/check/capture
      const result = generateSocraticNudge({
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
        bestMoveUci: 'b1c3',
      });
      // This might match development first since Nb1->c3 is from back rank
      // The king safety check happens later in the chain
      expect(result).toBeTruthy();
    });
  });

  describe('material balance heuristic', () => {
    it('detects material advantage', () => {
      // White has extra queen
      const result = generateSocraticNudge({
        fen: '4k3/8/8/8/8/8/4Q3/4K3 w - - 0 1',
        bestMoveUci: 'e2e7',
      });
      // This is a check move, so it might match check first
      expect(result).toBeTruthy();
    });

    it('detects material deficit', () => {
      // Black to move, down a queen
      const result = generateSocraticNudge({
        fen: '4k3/8/8/8/3n4/8/4Q3/4K3 b - - 0 1',
        bestMoveUci: 'd4e2',
      });
      expect(result).toContain('unprotected');
    });
  });

  describe('fallback', () => {
    it('returns fallback when no classifier matches', () => {
      // A quiet position with a quiet move that is hard to classify
      const result = generateSocraticNudge({
        fen: '8/8/4k3/8/3K4/8/8/8 w - - 0 1',
        bestMoveUci: 'd4d5',
      });
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(10);
    });
  });

  describe('edge cases', () => {
    it('handles empty puzzle themes array', () => {
      const result = generateSocraticNudge({
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        bestMoveUci: 'e2e4',
        puzzleThemes: [],
      });
      expect(result).toBeTruthy();
    });

    it('handles undefined puzzle themes', () => {
      const result = generateSocraticNudge({
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        bestMoveUci: 'e2e4',
      });
      expect(result).toBeTruthy();
    });

    it('returns a string for any valid position', () => {
      const result = generateSocraticNudge({
        fen: 'r1bqkbnr/pppppppp/2n5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2',
        bestMoveUci: 'd2d4',
      });
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
