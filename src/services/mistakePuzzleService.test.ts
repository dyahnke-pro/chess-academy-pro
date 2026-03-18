import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../db/schema';
import {
  generateMistakePuzzlesFromGame,
  generateMistakePuzzlesForBatch,
  getMistakePuzzlesDue,
  getMistakePuzzlesByGame,
  getMistakePuzzlesByClassification,
  getAllMistakePuzzles,
  gradeMistakePuzzle,
  deleteMistakePuzzle,
  getMistakePuzzleStats,
  movesForDifficulty,
  MIN_CONTINUATION_LENGTH,
} from './mistakePuzzleService';
import { buildGameRecord, buildMistakePuzzle, resetFactoryCounter } from '../test/factories';
import type { MoveAnnotation } from '../types';

// Mock stockfishEngine for analysis
vi.mock('./stockfishEngine', () => ({
  stockfishEngine: {
    analyzePosition: vi.fn().mockResolvedValue({
      bestMove: 'e2e4',
      evaluation: 50,
      isMate: false,
      mateIn: null,
      depth: 18,
      topLines: [{
        rank: 1,
        evaluation: 50,
        moves: ['e2e4', 'd7d5', 'e4d5', 'd8d5', 'b1c3'],
        mate: null,
      }],
      nodesPerSecond: 0,
    }),
    initialize: vi.fn().mockResolvedValue(undefined),
  },
}));

// ─── Test Data ──────────────────────────────────────────────────────────────

function buildAnnotations(): MoveAnnotation[] {
  return [
    // Move 1: White e4 — good
    { moveNumber: 1, color: 'white', san: 'e4', evaluation: 0.3, bestMove: 'e2e4', classification: 'good', comment: null },
    // Move 1: Black e5 — good
    { moveNumber: 1, color: 'black', san: 'e5', evaluation: 0.2, bestMove: 'e7e5', classification: 'good', comment: null },
    // Move 2: White Nf3 — good
    { moveNumber: 2, color: 'white', san: 'Nf3', evaluation: 0.4, bestMove: 'g1f3', classification: 'good', comment: null },
    // Move 2: Black Nc6 — good
    { moveNumber: 2, color: 'black', san: 'Nc6', evaluation: 0.3, bestMove: 'b8c6', classification: 'good', comment: null },
    // Move 3: White Ng5?? — blunder (drops from 0.4 to -3.5, cpLoss = 390)
    { moveNumber: 3, color: 'white', san: 'Ng5', evaluation: -3.5, bestMove: 'f1b5', classification: 'blunder', comment: null },
    // Move 3: Black d5 — good
    { moveNumber: 3, color: 'black', san: 'd5', evaluation: -3.3, bestMove: 'd7d5', classification: 'good', comment: null },
    // Move 4: White d3? — mistake (from -3.3 to -4.8, cpLoss = 150)
    { moveNumber: 4, color: 'white', san: 'd3', evaluation: -4.8, bestMove: 'e4d5', classification: 'mistake', comment: null },
  ];
}

const TEST_PGN = '1.e4 e5 2.Nf3 Nc6 3.Ng5 d5 4.d3';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('mistakePuzzleService', () => {
  beforeEach(async () => {
    resetFactoryCounter();
    await db.delete();
    await db.open();
  });

  describe('movesForDifficulty', () => {
    it('returns 1 move for easy', () => {
      const moves = ['e2e4', 'd7d5', 'e4d5', 'd8d5', 'b1c3'];
      expect(movesForDifficulty(moves, 'easy')).toEqual(['e2e4']);
    });

    it('returns 3 moves for medium', () => {
      const moves = ['e2e4', 'd7d5', 'e4d5', 'd8d5', 'b1c3'];
      expect(movesForDifficulty(moves, 'medium')).toEqual(['e2e4', 'd7d5', 'e4d5']);
    });

    it('returns 5+ moves for hard', () => {
      const moves = ['e2e4', 'd7d5', 'e4d5', 'd8d5', 'b1c3', 'd5c6', 'f1c4'];
      expect(movesForDifficulty(moves, 'hard')).toEqual(moves);
    });

    it('returns at least 5 moves for hard if available', () => {
      const moves = ['e2e4', 'd7d5', 'e4d5', 'd8d5', 'b1c3'];
      expect(movesForDifficulty(moves, 'hard')).toEqual(moves);
    });

    it('returns empty array for empty input', () => {
      expect(movesForDifficulty([], 'easy')).toEqual([]);
    });

    it('returns available moves if fewer than requested', () => {
      const moves = ['e2e4'];
      expect(movesForDifficulty(moves, 'medium')).toEqual(['e2e4']);
    });
  });

  describe('MIN_CONTINUATION_LENGTH', () => {
    it('has correct minimums', () => {
      expect(MIN_CONTINUATION_LENGTH.easy).toBe(1);
      expect(MIN_CONTINUATION_LENGTH.medium).toBe(3);
      expect(MIN_CONTINUATION_LENGTH.hard).toBe(5);
    });
  });

  describe('generateMistakePuzzlesFromGame', () => {
    it('generates puzzles from coach game with annotated mistakes', async () => {
      const game = buildGameRecord({
        id: 'coach-game-1',
        pgn: TEST_PGN,
        white: 'TestPlayer',
        black: 'Stockfish Bot',
        source: 'coach',
        annotations: buildAnnotations(),
      });
      await db.games.add(game);

      const count = await generateMistakePuzzlesFromGame('coach-game-1');

      expect(count).toBe(2); // Ng5 blunder + d3 mistake

      const puzzles = await db.mistakePuzzles.toArray();
      expect(puzzles).toHaveLength(2);

      // First puzzle: Ng5 blunder (move 3)
      const blunder = puzzles.find((p) => p.classification === 'blunder');
      expect(blunder).toBeDefined();
      expect(blunder!.moveNumber).toBe(3);
      expect(blunder!.bestMove).toBe('f1b5');
      expect(blunder!.sourceGameId).toBe('coach-game-1');
      expect(blunder!.sourceMode).toBe('coach');
      expect(blunder!.playerColor).toBe('white');
      expect(blunder!.status).toBe('unsolved');
      expect(blunder!.promptText).toBe('Oops — this was a serious mistake. Find the best move.');

      // Second puzzle: d3 mistake (move 4)
      const mistake = puzzles.find((p) => p.classification === 'mistake');
      expect(mistake).toBeDefined();
      expect(mistake!.moveNumber).toBe(4);
      expect(mistake!.bestMove).toBe('e4d5');
    });

    it('stores continuationMoves from Stockfish PV line', async () => {
      const game = buildGameRecord({
        id: 'coach-pv',
        pgn: TEST_PGN,
        white: 'TestPlayer',
        black: 'Stockfish Bot',
        source: 'coach',
        annotations: buildAnnotations(),
      });
      await db.games.add(game);

      await generateMistakePuzzlesFromGame('coach-pv');

      const puzzles = await db.mistakePuzzles.toArray();
      // Each puzzle should have continuationMoves from the Stockfish PV
      for (const puzzle of puzzles) {
        expect(puzzle.continuationMoves).toBeDefined();
        expect(Array.isArray(puzzle.continuationMoves)).toBe(true);
        expect(puzzle.continuationMoves.length).toBeGreaterThan(0);
        // First move should be the bestMove
        expect(puzzle.continuationMoves[0]).toBe(puzzle.bestMove);
      }
    });

    it('is idempotent — no duplicates on second call', async () => {
      const game = buildGameRecord({
        id: 'coach-game-2',
        pgn: TEST_PGN,
        white: 'TestPlayer',
        black: 'Stockfish Bot',
        source: 'coach',
        annotations: buildAnnotations(),
      });
      await db.games.add(game);

      await generateMistakePuzzlesFromGame('coach-game-2');
      const secondCount = await generateMistakePuzzlesFromGame('coach-game-2');

      expect(secondCount).toBe(0);
      const puzzles = await db.mistakePuzzles.toArray();
      expect(puzzles).toHaveLength(2);
    });

    it('only extracts player moves (not opponent moves)', async () => {
      // Player is black, annotations have white blunders — should be ignored
      const game = buildGameRecord({
        id: 'coach-game-3',
        pgn: TEST_PGN,
        white: 'Stockfish Bot',
        black: 'TestPlayer',
        source: 'coach',
        annotations: buildAnnotations(), // Only white has mistakes
      });
      await db.games.add(game);

      const count = await generateMistakePuzzlesFromGame('coach-game-3');
      expect(count).toBe(0);
    });

    it('skips games with no annotations', async () => {
      const game = buildGameRecord({
        id: 'no-ann',
        pgn: TEST_PGN,
        source: 'coach',
        white: 'Player',
        black: 'Stockfish Bot',
        annotations: null,
      });
      await db.games.add(game);

      const count = await generateMistakePuzzlesFromGame('no-ann');
      expect(count).toBe(0);
    });

    it('skips non-qualifying game sources (master, import)', async () => {
      const game = buildGameRecord({
        id: 'master-game',
        pgn: TEST_PGN,
        source: 'master',
        annotations: buildAnnotations(),
      });
      await db.games.add(game);

      const count = await generateMistakePuzzlesFromGame('master-game');
      expect(count).toBe(0);
    });

    it('returns 0 for non-existent game', async () => {
      const count = await generateMistakePuzzlesFromGame('nonexistent');
      expect(count).toBe(0);
    });

    it('generates puzzles from imported lichess game with username', async () => {
      const annotations: MoveAnnotation[] = [
        { moveNumber: 1, color: 'white', san: 'e4', evaluation: 0.3, bestMove: null, classification: 'good', comment: null },
        { moveNumber: 1, color: 'black', san: 'e5', evaluation: 0.2, bestMove: null, classification: 'good', comment: null },
        { moveNumber: 2, color: 'white', san: 'Qh5', evaluation: -1.5, bestMove: null, classification: 'blunder', comment: null },
      ];
      const game = buildGameRecord({
        id: 'lichess-abc123',
        pgn: '1.e4 e5 2.Qh5',
        white: 'testuser',
        black: 'opponent',
        source: 'lichess',
        annotations,
      });
      await db.games.add(game);

      const count = await generateMistakePuzzlesFromGame('lichess-abc123', 'testuser');

      expect(count).toBe(1);
      const puzzles = await db.mistakePuzzles.toArray();
      expect(puzzles[0].sourceMode).toBe('lichess');
      expect(puzzles[0].playerColor).toBe('white');
      // bestMove comes from mocked stockfishEngine
      expect(puzzles[0].bestMove).toBe('e2e4');
      // continuationMoves from PV line
      expect(puzzles[0].continuationMoves).toEqual(['e2e4', 'd7d5', 'e4d5', 'd8d5', 'b1c3']);
    });

    it('generates puzzles from chess.com imports', async () => {
      const annotations: MoveAnnotation[] = [
        { moveNumber: 1, color: 'white', san: 'e4', evaluation: 0.3, bestMove: null, classification: 'good', comment: null },
        { moveNumber: 1, color: 'black', san: 'f6', evaluation: 1.8, bestMove: null, classification: 'mistake', comment: null },
      ];
      const game = buildGameRecord({
        id: 'chesscom-xyz',
        pgn: '1.e4 f6',
        white: 'opponent',
        black: 'myuser',
        source: 'chesscom',
        annotations,
      });
      await db.games.add(game);

      const count = await generateMistakePuzzlesFromGame('chesscom-xyz', 'myuser');

      expect(count).toBe(1);
      const puzzles = await db.mistakePuzzles.toArray();
      expect(puzzles[0].sourceMode).toBe('chesscom');
      expect(puzzles[0].playerColor).toBe('black');
      expect(puzzles[0].classification).toBe('mistake');
    });
  });

  describe('generateMistakePuzzlesForBatch', () => {
    it('processes multiple games sequentially', async () => {
      const game1 = buildGameRecord({
        id: 'batch-1',
        pgn: TEST_PGN,
        white: 'TestPlayer',
        black: 'Stockfish Bot',
        source: 'coach',
        annotations: buildAnnotations(),
      });
      const game2 = buildGameRecord({
        id: 'batch-2',
        pgn: TEST_PGN,
        white: 'TestPlayer',
        black: 'Stockfish Bot',
        source: 'coach',
        annotations: buildAnnotations(),
      });
      await db.games.bulkAdd([game1, game2]);

      const total = await generateMistakePuzzlesForBatch(
        ['batch-1', 'batch-2'],
        'TestPlayer',
      );

      expect(total).toBe(4); // 2 per game
      const puzzles = await db.mistakePuzzles.toArray();
      expect(puzzles).toHaveLength(4);
    });
  });

  describe('getMistakePuzzlesDue', () => {
    it('returns puzzles due today or earlier', async () => {
      const today = new Date().toISOString().split('T')[0];
      const future = '2099-01-01';

      await db.mistakePuzzles.bulkAdd([
        buildMistakePuzzle({ id: 'due-1', srsDueDate: today }),
        buildMistakePuzzle({ id: 'due-2', srsDueDate: '2020-01-01' }),
        buildMistakePuzzle({ id: 'not-due', srsDueDate: future }),
      ]);

      const due = await getMistakePuzzlesDue();
      expect(due).toHaveLength(2);
      expect(due.map((p) => p.id).sort()).toEqual(['due-1', 'due-2']);
    });

    it('respects limit parameter', async () => {
      const today = new Date().toISOString().split('T')[0];
      await db.mistakePuzzles.bulkAdd([
        buildMistakePuzzle({ id: 'a', srsDueDate: today }),
        buildMistakePuzzle({ id: 'b', srsDueDate: today }),
        buildMistakePuzzle({ id: 'c', srsDueDate: today }),
      ]);

      const due = await getMistakePuzzlesDue(2);
      expect(due).toHaveLength(2);
    });
  });

  describe('getMistakePuzzlesByGame', () => {
    it('filters by sourceGameId', async () => {
      await db.mistakePuzzles.bulkAdd([
        buildMistakePuzzle({ id: 'p1', sourceGameId: 'game-A' }),
        buildMistakePuzzle({ id: 'p2', sourceGameId: 'game-A' }),
        buildMistakePuzzle({ id: 'p3', sourceGameId: 'game-B' }),
      ]);

      const puzzles = await getMistakePuzzlesByGame('game-A');
      expect(puzzles).toHaveLength(2);
      expect(puzzles.every((p) => p.sourceGameId === 'game-A')).toBe(true);
    });
  });

  describe('getMistakePuzzlesByClassification', () => {
    it('filters by classification', async () => {
      await db.mistakePuzzles.bulkAdd([
        buildMistakePuzzle({ id: 'p1', classification: 'blunder' }),
        buildMistakePuzzle({ id: 'p2', classification: 'mistake' }),
        buildMistakePuzzle({ id: 'p3', classification: 'blunder' }),
      ]);

      const blunders = await getMistakePuzzlesByClassification('blunder');
      expect(blunders).toHaveLength(2);
    });
  });

  describe('gradeMistakePuzzle', () => {
    it('updates SRS fields on correct answer', async () => {
      const puzzle = buildMistakePuzzle({ id: 'grade-1' });
      await db.mistakePuzzles.add(puzzle);

      await gradeMistakePuzzle('grade-1', 'good', true);

      const updated = await db.mistakePuzzles.get('grade-1');
      expect(updated!.srsRepetitions).toBe(1);
      expect(updated!.srsInterval).toBe(1);
      expect(updated!.attempts).toBe(1);
      expect(updated!.successes).toBe(1);
      expect(updated!.status).toBe('solved');
    });

    it('resets repetitions on incorrect answer', async () => {
      const puzzle = buildMistakePuzzle({
        id: 'grade-2',
        srsRepetitions: 2,
        srsInterval: 6,
        status: 'solved',
        successes: 2,
      });
      await db.mistakePuzzles.add(puzzle);

      await gradeMistakePuzzle('grade-2', 'again', false);

      const updated = await db.mistakePuzzles.get('grade-2');
      expect(updated!.srsRepetitions).toBe(0);
      expect(updated!.srsInterval).toBe(1);
      expect(updated!.attempts).toBe(1);
      expect(updated!.successes).toBe(2); // unchanged
      expect(updated!.status).toBe('solved'); // stays solved since successes > 0
    });

    it('transitions to mastered after 3 correct repetitions', async () => {
      const puzzle = buildMistakePuzzle({
        id: 'grade-3',
        srsRepetitions: 2,
        srsInterval: 6,
        srsEaseFactor: 2.5,
        status: 'solved',
        successes: 2,
      });
      await db.mistakePuzzles.add(puzzle);

      await gradeMistakePuzzle('grade-3', 'good', true);

      const updated = await db.mistakePuzzles.get('grade-3');
      expect(updated!.srsRepetitions).toBe(3);
      expect(updated!.status).toBe('mastered');
    });

    it('does nothing for non-existent puzzle', async () => {
      await gradeMistakePuzzle('nonexistent', 'good', true);
      // Should not throw
    });
  });

  describe('deleteMistakePuzzle', () => {
    it('removes puzzle from database', async () => {
      await db.mistakePuzzles.add(buildMistakePuzzle({ id: 'del-1' }));

      await deleteMistakePuzzle('del-1');

      const result = await db.mistakePuzzles.get('del-1');
      expect(result).toBeUndefined();
    });
  });

  describe('getMistakePuzzleStats', () => {
    it('returns correct counts', async () => {
      const today = new Date().toISOString().split('T')[0];
      await db.mistakePuzzles.bulkAdd([
        buildMistakePuzzle({ id: 's1', status: 'unsolved', classification: 'blunder', srsDueDate: today }),
        buildMistakePuzzle({ id: 's2', status: 'solved', classification: 'mistake', srsDueDate: '2099-01-01' }),
        buildMistakePuzzle({ id: 's3', status: 'mastered', classification: 'inaccuracy', srsDueDate: today }),
        buildMistakePuzzle({ id: 's4', status: 'unsolved', classification: 'blunder', srsDueDate: today }),
      ]);

      const stats = await getMistakePuzzleStats();

      expect(stats.total).toBe(4);
      expect(stats.unsolved).toBe(2);
      expect(stats.solved).toBe(1);
      expect(stats.mastered).toBe(1);
      expect(stats.byClassification.blunder).toBe(2);
      expect(stats.byClassification.mistake).toBe(1);
      expect(stats.byClassification.inaccuracy).toBe(1);
      expect(stats.dueCount).toBe(3);
    });

    it('returns zeros when empty', async () => {
      const stats = await getMistakePuzzleStats();
      expect(stats.total).toBe(0);
      expect(stats.dueCount).toBe(0);
    });
  });

  describe('getAllMistakePuzzles', () => {
    it('returns all puzzles', async () => {
      await db.mistakePuzzles.bulkAdd([
        buildMistakePuzzle({ id: 'all-1' }),
        buildMistakePuzzle({ id: 'all-2' }),
      ]);

      const all = await getAllMistakePuzzles();
      expect(all).toHaveLength(2);
    });
  });
});
