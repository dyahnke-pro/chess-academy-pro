import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock stockfishEngine before importing
vi.mock('./stockfishEngine', () => ({
  stockfishEngine: {
    analyzePosition: vi.fn(),
    initialize: vi.fn(),
  },
}));

import { getAdaptiveMove, getTargetStrength, tryOpeningBookMove } from './coachGameEngine';
import { stockfishEngine } from './stockfishEngine';
import type { StockfishAnalysis } from '../types';

const analyzePositionMock = vi.mocked(stockfishEngine).analyzePosition;

const mockAnalysis: StockfishAnalysis = {
  bestMove: 'e2e4',
  evaluation: 30,
  isMate: false,
  mateIn: null,
  depth: 12,
  topLines: [
    { rank: 1, evaluation: 30, moves: ['e2e4', 'e7e5'], mate: null },
    { rank: 2, evaluation: 20, moves: ['d2d4', 'd7d5'], mate: null },
    { rank: 3, evaluation: 10, moves: ['c2c4', 'e7e5'], mate: null },
  ],
  nodesPerSecond: 1000000,
};

describe('coachGameEngine', () => {
  beforeEach(() => {
    analyzePositionMock.mockResolvedValue(mockAnalysis);
  });

  describe('getAdaptiveMove', () => {
    it('returns a move and analysis', async () => {
      const result = await getAdaptiveMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 1200);
      expect(result.move).toBeTruthy();
      expect(result.analysis).toBe(mockAnalysis);
    });

    it('calls stockfish with lower depth for lower ELO', async () => {
      await getAdaptiveMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 800);
      expect(analyzePositionMock).toHaveBeenCalledWith(
        expect.any(String),
        4, // depth for 800 ELO
      );
    });

    it('calls stockfish with higher depth for higher ELO', async () => {
      await getAdaptiveMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 1900);
      expect(analyzePositionMock).toHaveBeenCalledWith(
        expect.any(String),
        18, // depth for 1900+ ELO
      );
    });

    it('always returns a valid move from the analysis', async () => {
      // Run multiple times to test randomness
      for (let i = 0; i < 20; i++) {
        const result = await getAdaptiveMove('startfen', 1000);
        expect(['e2e4', 'd2d4', 'c2c4']).toContain(result.move);
      }
    });
  });

  describe('getAdaptiveMove — depth by ELO', () => {
    it('uses depth 4 for < 1000 ELO', async () => {
      await getAdaptiveMove('startfen', 900);
      expect(analyzePositionMock).toHaveBeenCalledWith(expect.any(String), 4);
    });

    it('uses depth 6 for 1000-1199 ELO', async () => {
      await getAdaptiveMove('startfen', 1100);
      expect(analyzePositionMock).toHaveBeenCalledWith(expect.any(String), 6);
    });

    it('uses depth 10 for 1200-1499 ELO', async () => {
      await getAdaptiveMove('startfen', 1300);
      expect(analyzePositionMock).toHaveBeenCalledWith(expect.any(String), 10);
    });

    it('uses depth 14 for 1500-1799 ELO', async () => {
      await getAdaptiveMove('startfen', 1600);
      expect(analyzePositionMock).toHaveBeenCalledWith(expect.any(String), 14);
    });

    it('uses depth 18 for 1800+ ELO', async () => {
      await getAdaptiveMove('startfen', 2000);
      expect(analyzePositionMock).toHaveBeenCalledWith(expect.any(String), 18);
    });
  });

  describe('getTargetStrength', () => {
    it('returns player rating minus 100', () => {
      expect(getTargetStrength(1420)).toBe(1320);
    });

    it('floors at 600', () => {
      expect(getTargetStrength(500)).toBe(600);
    });

    it('handles high ratings', () => {
      expect(getTargetStrength(2200)).toBe(2100);
    });

    it('returns exactly 600 for rating 700', () => {
      expect(getTargetStrength(700)).toBe(600);
    });

    it('returns 600 for rating 600 (at the floor)', () => {
      expect(getTargetStrength(600)).toBe(600);
    });
  });

  describe('tryOpeningBookMove', () => {
    const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const AFTER_E4_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

    it('returns the next book move when on the opening line', () => {
      // French Defense: e4 e6 — AI is black, after 1.e4 should play e6
      const frenchMoves = ['e4', 'e6', 'd4', 'd5'];
      const result = tryOpeningBookMove(AFTER_E4_FEN, ['e4'], frenchMoves, 'black');
      expect(result).toBe('e7e6');
    });

    it('returns null when no opening is requested', () => {
      const result = tryOpeningBookMove(AFTER_E4_FEN, ['e4'], null, 'black');
      expect(result).toBeNull();
    });

    it('returns null when game has deviated from book', () => {
      const frenchMoves = ['e4', 'e6', 'd4', 'd5'];
      // Player played d4 instead of e4 — not in the French Defense line
      const result = tryOpeningBookMove(AFTER_E4_FEN, ['d4'], frenchMoves, 'black');
      expect(result).toBeNull();
    });

    it('returns null when it is not the AI turn', () => {
      // AI is black but it's white's turn at move 0
      const frenchMoves = ['e4', 'e6', 'd4', 'd5'];
      const result = tryOpeningBookMove(START_FEN, [], frenchMoves, 'black');
      expect(result).toBeNull();
    });

    it('returns null when past the end of book moves', () => {
      const frenchMoves = ['e4', 'e6'];
      const afterE4E6Fen = 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
      const result = tryOpeningBookMove(afterE4E6Fen, ['e4', 'e6'], frenchMoves, 'white');
      expect(result).toBeNull();
    });

    it('returns the correct move for AI playing white', () => {
      // Italian Game: e4 e5 Nf3 — AI is white, at move 0 should play e4
      const italianMoves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'];
      const result = tryOpeningBookMove(START_FEN, [], italianMoves, 'white');
      expect(result).toBe('e2e4');
    });
  });
});
