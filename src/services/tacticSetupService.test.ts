import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateSetupPuzzle } from './tacticSetupService';
import { db } from '../db/schema';
import type { MistakePuzzle, GameRecord } from '../types';

// Mock stockfishEngine
vi.mock('./stockfishEngine', () => ({
  stockfishEngine: {
    initialize: vi.fn().mockResolvedValue(undefined),
    analyzePosition: vi.fn().mockResolvedValue({
      evaluation: 200,
      bestMove: 'g1f3',
      topLines: [{ moves: ['g1f3', 'e7e5'], evaluation: 200 }],
    }),
  },
}));

// Mock missedTacticService
vi.mock('./missedTacticService', () => ({
  detectTacticType: vi.fn().mockReturnValue('fork'),
}));

describe('generateSetupPuzzle', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('generates solutionMoves in UCI format, not SAN', async () => {
    // Create a source game with a known PGN
    const gameId = await db.games.add({
      id: 'test-game-1',
      pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6',
      whitePlayer: 'Player',
      blackPlayer: 'Opponent',
      result: '1-0',
      date: '2026-01-01',
      source: 'manual',
      timeControl: null,
      opening: 'Ruy Lopez',
      annotations: null,
      importedAt: new Date().toISOString(),
    } as GameRecord);

    // After 1. e4 e5 2. Nf3 Nc6: the FEN for the tactic position
    // (position after Nc6, before Bb5)
    const tacticFen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';

    const mistake: MistakePuzzle = {
      id: 'mp-1',
      fen: tacticFen,
      bestMove: 'f1b5',
      bestMoveSan: 'Bb5',
      playerMoveSan: 'Bc4',
      playerColor: 'white',
      classification: 'inaccuracy',
      cpLoss: 120,
      moves: 'f1b5',
      moveNumber: 3,
      gamePhase: 'opening',
      sourceGameId: gameId,
      opponentName: 'Opponent',
      openingName: 'Ruy Lopez',
      gameDate: '2026-01-01',
      narration: {
        intro: '',
        conceptHint: '',
        moveNarrations: [],
        outro: '',
      },
      srsInterval: 0,
      srsEaseFactor: 2.5,
      srsRepetitions: 0,
      srsDueDate: '2026-01-01',
      srsLastReview: null,
    };

    const puzzle = await generateSetupPuzzle(mistake, 1);

    // Should not be null
    expect(puzzle).not.toBeNull();
    if (!puzzle) return;

    // The solutionMoves should be in UCI format (e.g. "g1f3 b8c6")
    // NOT SAN format (e.g. "Nf3 Nc6")
    const moves = puzzle.solutionMoves.split(' ');
    for (const move of moves) {
      // UCI moves are 4-5 chars: from(2) + to(2) + optional promotion(1)
      expect(move.length).toBeGreaterThanOrEqual(4);
      expect(move.length).toBeLessThanOrEqual(5);
      // First two chars should be valid square (a-h, 1-8)
      expect(move[0]).toMatch(/[a-h]/);
      expect(move[1]).toMatch(/[1-8]/);
      // Next two chars should be valid square
      expect(move[2]).toMatch(/[a-h]/);
      expect(move[3]).toMatch(/[1-8]/);
    }
  });
});
