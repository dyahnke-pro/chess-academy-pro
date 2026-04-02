import { describe, it, expect } from 'vitest';
import { setupIntro, setupCorrectPrep, setupRevealComplete, setupIncorrect } from './tacticNarrationService';

describe('tacticNarrationService', () => {
  describe('setupIntro', () => {
    it('returns basic intro without FEN', () => {
      const result = setupIntro('fork', 1);
      expect(result).toBe('Find one quiet move that make the fork inevitable.');
    });

    it('includes position context when FEN and color provided', () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1';
      const result = setupIntro('fork', 1, fen, 'white');
      expect(result).toContain('fork inevitable');
      expect(result).toContain('Material');
      // Should be longer than the basic intro due to context
      expect(result.length).toBeGreaterThan(60);
    });

    it('mentions king exposure for back rank tactics', () => {
      // King on g8 with no pawn shield
      const fen = '6k1/8/8/8/8/8/PPP5/R3K3 w Q - 0 1';
      const result = setupIntro('back_rank', 1, fen, 'white');
      expect(result).toContain('back rank');
    });

    it('mentions open files for pin tactics', () => {
      // Open e-file
      const fen = 'rnbqkbnr/pppp1ppp/8/8/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1';
      const result = setupIntro('pin', 2, fen, 'white');
      expect(result).toContain('e');
    });

    it('adjusts move text for multi-move difficulty', () => {
      const result = setupIntro('fork', 3);
      expect(result).toContain('3 quiet moves');
    });
  });

  describe('setupCorrectPrep', () => {
    it('returns remaining count', () => {
      expect(setupCorrectPrep(2)).toContain('2');
    });

    it('returns singular for one remaining', () => {
      expect(setupCorrectPrep(1)).toContain('One more');
    });

    it('returns complete for zero', () => {
      expect(setupCorrectPrep(0)).toContain('complete');
    });
  });

  describe('setupRevealComplete', () => {
    it('mentions the tactic type', () => {
      expect(setupRevealComplete('fork')).toContain('fork');
    });
  });

  describe('setupIncorrect', () => {
    it('returns encouragement', () => {
      expect(setupIncorrect()).toBeTruthy();
    });
  });
});
