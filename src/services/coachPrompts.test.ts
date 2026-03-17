import { describe, it, expect } from 'vitest';
import {
  SYSTEM_PROMPT,
  GAME_NARRATION_ADDITION,
  POSITION_ANALYSIS_ADDITION,
  SESSION_PLAN_ADDITION,
  buildChessContextMessage,
} from './coachPrompts';
import type { CoachContext, StockfishAnalysis } from '../types';

describe('coachPrompts', () => {
  describe('SYSTEM_PROMPT', () => {
    it('is a non-empty string', () => {
      expect(SYSTEM_PROMPT).toBeTruthy();
      expect(SYSTEM_PROMPT.length).toBeGreaterThan(100);
    });

    it('mentions key coaching traits', () => {
      expect(SYSTEM_PROMPT.toLowerCase()).toContain('chess');
    });
  });

  describe('GAME_NARRATION_ADDITION', () => {
    it('is a non-empty string with game narration content', () => {
      expect(GAME_NARRATION_ADDITION).toBeTruthy();
      expect(GAME_NARRATION_ADDITION.length).toBeGreaterThan(50);
    });

    it('mentions takeback policy', () => {
      expect(GAME_NARRATION_ADDITION.toLowerCase()).toContain('takeback');
    });
  });

  describe('POSITION_ANALYSIS_ADDITION', () => {
    it('is a non-empty string with analysis content', () => {
      expect(POSITION_ANALYSIS_ADDITION).toBeTruthy();
      expect(POSITION_ANALYSIS_ADDITION.length).toBeGreaterThan(30);
    });
  });

  describe('SESSION_PLAN_ADDITION', () => {
    it('is a non-empty string with session planning content', () => {
      expect(SESSION_PLAN_ADDITION).toBeTruthy();
      expect(SESSION_PLAN_ADDITION.length).toBeGreaterThan(30);
    });
  });

  describe('buildChessContextMessage', () => {
    it('includes FEN in output', () => {
      const ctx: CoachContext = {
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        lastMoveSan: null,
        moveNumber: 1,
        pgn: '',
        openingName: null,
        stockfishAnalysis: null,
        playerMove: null,
        moveClassification: null,
        playerProfile: { rating: 1400, weaknesses: [] },
      };
      const msg = buildChessContextMessage(ctx);
      expect(msg).toContain('rnbqkbnr');
      expect(msg).toContain('FEN');
    });

    it('includes lastMoveSan when provided', () => {
      const ctx: CoachContext = {
        fen: 'test',
        lastMoveSan: 'e4',
        moveNumber: 1,
        pgn: '1. e4',
        openingName: null,
        stockfishAnalysis: null,
        playerMove: null,
        moveClassification: null,
        playerProfile: { rating: 1400, weaknesses: [] },
      };
      const msg = buildChessContextMessage(ctx);
      expect(msg).toContain('Last move: e4');
      expect(msg).toContain('Move 1');
    });

    it('omits lastMoveSan line when null', () => {
      const ctx: CoachContext = {
        fen: 'test',
        lastMoveSan: null,
        moveNumber: 0,
        pgn: '',
        openingName: null,
        stockfishAnalysis: null,
        playerMove: null,
        moveClassification: null,
        playerProfile: { rating: 1400, weaknesses: [] },
      };
      const msg = buildChessContextMessage(ctx);
      expect(msg).not.toContain('Last move:');
    });

    it('includes opening name when provided', () => {
      const ctx: CoachContext = {
        fen: 'test',
        lastMoveSan: null,
        moveNumber: 0,
        pgn: '',
        openingName: 'Sicilian Defense',
        stockfishAnalysis: null,
        playerMove: null,
        moveClassification: null,
        playerProfile: { rating: 1400, weaknesses: [] },
      };
      const msg = buildChessContextMessage(ctx);
      expect(msg).toContain('Opening: Sicilian Defense');
    });

    it('includes Stockfish analysis with evaluation', () => {
      const analysis: StockfishAnalysis = {
        bestMove: 'e2e4',
        evaluation: 45,
        isMate: false,
        mateIn: null,
        depth: 20,
        topLines: [
          { rank: 1, evaluation: 45, moves: ['e2e4', 'e7e5'], mate: null },
        ],
        nodesPerSecond: 1000000,
      };
      const ctx: CoachContext = {
        fen: 'test',
        lastMoveSan: null,
        moveNumber: 0,
        pgn: '',
        openingName: null,
        stockfishAnalysis: analysis,
        playerMove: null,
        moveClassification: null,
        playerProfile: { rating: 1400, weaknesses: [] },
      };
      const msg = buildChessContextMessage(ctx);
      expect(msg).toContain('Stockfish evaluation: +0.45');
      expect(msg).toContain('Best move: e2e4');
      expect(msg).toContain('Top lines:');
    });

    it('formats mate evaluation', () => {
      const analysis: StockfishAnalysis = {
        bestMove: 'Qh7',
        evaluation: 0,
        isMate: true,
        mateIn: 3,
        depth: 20,
        topLines: [],
        nodesPerSecond: 1000000,
      };
      const ctx: CoachContext = {
        fen: 'test',
        lastMoveSan: null,
        moveNumber: 0,
        pgn: '',
        openingName: null,
        stockfishAnalysis: analysis,
        playerMove: null,
        moveClassification: null,
        playerProfile: { rating: 1400, weaknesses: [] },
      };
      const msg = buildChessContextMessage(ctx);
      expect(msg).toContain('Mate in 3');
    });

    it('includes player move and classification', () => {
      const ctx: CoachContext = {
        fen: 'test',
        lastMoveSan: null,
        moveNumber: 0,
        pgn: '',
        openingName: null,
        stockfishAnalysis: null,
        playerMove: 'Nf3',
        moveClassification: 'good',
        playerProfile: { rating: 1400, weaknesses: [] },
      };
      const msg = buildChessContextMessage(ctx);
      expect(msg).toContain("Player's move: Nf3");
      expect(msg).toContain('Classification: good');
    });

    it('includes player profile and weaknesses', () => {
      const ctx: CoachContext = {
        fen: 'test',
        lastMoveSan: null,
        moveNumber: 0,
        pgn: '',
        openingName: null,
        stockfishAnalysis: null,
        playerMove: null,
        moveClassification: null,
        playerProfile: { rating: 1500, weaknesses: ['Weak at endgames'] },
      };
      const msg = buildChessContextMessage(ctx);
      expect(msg).toContain('1500 ELO');
      expect(msg).toContain('Weak at endgames');
    });

    it('omits weakness line when weaknesses array is empty', () => {
      const ctx: CoachContext = {
        fen: 'test',
        lastMoveSan: null,
        moveNumber: 0,
        pgn: '',
        openingName: null,
        stockfishAnalysis: null,
        playerMove: null,
        moveClassification: null,
        playerProfile: { rating: 1400, weaknesses: [] },
      };
      const msg = buildChessContextMessage(ctx);
      expect(msg).not.toContain('Current weakness');
    });

    it('includes hint context when provided', () => {
      const ctx: CoachContext = {
        fen: 'test',
        lastMoveSan: 'Nf3',
        moveNumber: 5,
        pgn: '1. e4 e5 2. Nf3',
        openingName: null,
        stockfishAnalysis: null,
        playerMove: 'Nf3',
        moveClassification: 'good',
        playerProfile: { rating: 1400, weaknesses: [] },
        hintContext: {
          level: 2,
          nudgeText: 'Look for a fork!',
        },
      };
      const msg = buildChessContextMessage(ctx);
      expect(msg).toContain('hint (level 2)');
      expect(msg).toContain('Look for a fork!');
      expect(msg).toContain('Reference this');
    });

    it('omits hint context when level is 0', () => {
      const ctx: CoachContext = {
        fen: 'test',
        lastMoveSan: null,
        moveNumber: 0,
        pgn: '',
        openingName: null,
        stockfishAnalysis: null,
        playerMove: null,
        moveClassification: null,
        playerProfile: { rating: 1400, weaknesses: [] },
        hintContext: { level: 0, nudgeText: null },
      };
      const msg = buildChessContextMessage(ctx);
      expect(msg).not.toContain('hint');
    });

    it('omits hint context when null', () => {
      const ctx: CoachContext = {
        fen: 'test',
        lastMoveSan: null,
        moveNumber: 0,
        pgn: '',
        openingName: null,
        stockfishAnalysis: null,
        playerMove: null,
        moveClassification: null,
        playerProfile: { rating: 1400, weaknesses: [] },
        hintContext: null,
      };
      const msg = buildChessContextMessage(ctx);
      expect(msg).not.toContain('hint');
    });

    it('includes hint level but handles null nudgeText', () => {
      const ctx: CoachContext = {
        fen: 'test',
        lastMoveSan: null,
        moveNumber: 0,
        pgn: '',
        openingName: null,
        stockfishAnalysis: null,
        playerMove: null,
        moveClassification: null,
        playerProfile: { rating: 1400, weaknesses: [] },
        hintContext: { level: 1, nudgeText: null },
      };
      const msg = buildChessContextMessage(ctx);
      expect(msg).toContain('hint (level 1)');
      expect(msg).not.toContain('nudge shown');
    });
  });
});
