import { describe, it, expect } from 'vitest';
import {
  SYSTEM_PROMPTS,
  GAME_NARRATION_ADDITIONS,
  POSITION_ANALYSIS_ADDITIONS,
  SESSION_PLAN_ADDITIONS,
  buildChessContextMessage,
} from './coachPrompts';
import type { CoachContext, CoachPersonality, StockfishAnalysis } from '../types';

const PERSONALITIES: CoachPersonality[] = ['danya', 'kasparov', 'fischer'];

describe('coachPrompts', () => {
  describe('SYSTEM_PROMPTS', () => {
    it('has prompts for all 3 personalities', () => {
      for (const p of PERSONALITIES) {
        expect(SYSTEM_PROMPTS[p]).toBeTruthy();
        expect(SYSTEM_PROMPTS[p].length).toBeGreaterThan(100);
      }
    });

    it('danya prompt mentions warm/encouraging', () => {
      expect(SYSTEM_PROMPTS.danya.toLowerCase()).toContain('warm');
      expect(SYSTEM_PROMPTS.danya.toLowerCase()).toContain('encouraging');
    });

    it('kasparov prompt mentions demanding/intense', () => {
      expect(SYSTEM_PROMPTS.kasparov.toLowerCase()).toContain('demanding');
    });

    it('fischer prompt mentions precise/perfectionist', () => {
      expect(SYSTEM_PROMPTS.fischer.toLowerCase()).toContain('precise');
    });
  });

  describe('GAME_NARRATION_ADDITIONS', () => {
    it('has narration additions for all 3 personalities', () => {
      for (const p of PERSONALITIES) {
        expect(GAME_NARRATION_ADDITIONS[p]).toBeTruthy();
        expect(GAME_NARRATION_ADDITIONS[p].length).toBeGreaterThan(50);
      }
    });

    it('danya allows takebacks freely', () => {
      expect(GAME_NARRATION_ADDITIONS.danya.toLowerCase()).toContain('allow takebacks freely');
    });

    it('kasparov allows one takeback', () => {
      expect(GAME_NARRATION_ADDITIONS.kasparov.toLowerCase()).toContain('one takeback');
    });

    it('fischer forbids takebacks', () => {
      expect(GAME_NARRATION_ADDITIONS.fischer.toLowerCase()).toContain('no takebacks');
    });
  });

  describe('POSITION_ANALYSIS_ADDITIONS', () => {
    it('has analysis additions for all 3 personalities', () => {
      for (const p of PERSONALITIES) {
        expect(POSITION_ANALYSIS_ADDITIONS[p]).toBeTruthy();
        expect(POSITION_ANALYSIS_ADDITIONS[p].length).toBeGreaterThan(30);
      }
    });
  });

  describe('SESSION_PLAN_ADDITIONS', () => {
    it('has session plan additions for all 3 personalities', () => {
      for (const p of PERSONALITIES) {
        expect(SESSION_PLAN_ADDITIONS[p]).toBeTruthy();
        expect(SESSION_PLAN_ADDITIONS[p].length).toBeGreaterThan(30);
      }
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
        playerProfile: { rating: 1400, style: 'tactical', weaknesses: [] },
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
        playerProfile: { rating: 1400, style: 'tactical', weaknesses: [] },
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
        playerProfile: { rating: 1400, style: 'tactical', weaknesses: [] },
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
        playerProfile: { rating: 1400, style: 'tactical', weaknesses: [] },
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
        playerProfile: { rating: 1400, style: 'tactical', weaknesses: [] },
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
        playerProfile: { rating: 1400, style: 'tactical', weaknesses: [] },
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
        playerProfile: { rating: 1400, style: 'tactical', weaknesses: [] },
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
        playerProfile: { rating: 1500, style: 'aggressive', weaknesses: ['Weak at endgames'] },
      };
      const msg = buildChessContextMessage(ctx);
      expect(msg).toContain('1500 ELO');
      expect(msg).toContain('aggressive');
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
        playerProfile: { rating: 1400, style: 'tactical', weaknesses: [] },
      };
      const msg = buildChessContextMessage(ctx);
      expect(msg).not.toContain('Current weakness');
    });
  });
});
