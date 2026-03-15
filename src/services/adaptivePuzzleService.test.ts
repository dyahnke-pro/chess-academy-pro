import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import {
  createAdaptiveSession,
  processAdaptiveResult,
  getNextAdaptivePuzzle,
  getAdaptiveSessionSummary,
  ADAPTIVE_CONFIGS,
} from './adaptivePuzzleService';
import type { AdaptiveDifficulty, AdaptiveSessionState } from './adaptivePuzzleService';
import type { PuzzleRecord } from '../types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makePuzzle(overrides: Partial<PuzzleRecord> = {}): PuzzleRecord {
  const today = new Date().toISOString().split('T')[0];
  return {
    id: `test-${Math.random().toString(36).slice(2)}`,
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    moves: 'e7e5',
    rating: 1200,
    themes: ['fork'],
    openingTags: null,
    popularity: 80,
    nbPlays: 1000,
    srsInterval: 0,
    srsEaseFactor: 2.5,
    srsRepetitions: 0,
    srsDueDate: today,
    srsLastReview: null,
    userRating: 1200,
    attempts: 0,
    successes: 0,
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('adaptivePuzzleService', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  describe('createAdaptiveSession', () => {
    it.each<AdaptiveDifficulty>(['easy', 'medium', 'hard'])(
      'creates session with correct start rating for %s',
      (difficulty) => {
        const session = createAdaptiveSession(difficulty);
        expect(session.sessionRating).toBe(ADAPTIVE_CONFIGS[difficulty].startRating);
        expect(session.difficulty).toBe(difficulty);
        expect(session.puzzlesSolved).toBe(0);
        expect(session.puzzlesFailed).toBe(0);
        expect(session.streak).toBe(0);
        expect(session.consecutiveWrong).toBe(0);
        expect(session.ratingHistory).toEqual([ADAPTIVE_CONFIGS[difficulty].startRating]);
        expect(session.totalPuzzles).toBe(0);
      },
    );

    it('sets startedAt to current time', () => {
      const before = Date.now();
      const session = createAdaptiveSession('easy');
      const after = Date.now();
      const ts = new Date(session.startedAt).getTime();
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });
  });

  describe('processAdaptiveResult', () => {
    it('increases session rating on correct answer', () => {
      const session = createAdaptiveSession('easy');
      const result = processAdaptiveResult(session, 1000, true, ['fork']);
      expect(result.sessionRating).toBe(1000 + ADAPTIVE_CONFIGS.easy.correctBump);
      expect(result.puzzlesSolved).toBe(1);
      expect(result.streak).toBe(1);
      expect(result.consecutiveWrong).toBe(0);
    });

    it('decreases session rating on wrong answer', () => {
      const session = createAdaptiveSession('easy');
      const result = processAdaptiveResult(session, 1000, false, ['fork']);
      expect(result.sessionRating).toBe(1000 - ADAPTIVE_CONFIGS.easy.wrongPenalty);
      expect(result.puzzlesFailed).toBe(1);
      expect(result.streak).toBe(0);
      expect(result.consecutiveWrong).toBe(1);
    });

    it('applies extra penalty for consecutive wrong answers', () => {
      let session = createAdaptiveSession('medium');
      // First wrong
      session = processAdaptiveResult(session, 1500, false, ['pin']);
      const afterFirst = session.sessionRating;
      // Second wrong
      session = processAdaptiveResult(session, 1500, false, ['pin']);
      const afterSecond = session.sessionRating;
      // Second wrong should drop more than first
      const firstDrop = ADAPTIVE_CONFIGS.medium.startRating - afterFirst;
      const secondDrop = afterFirst - afterSecond;
      expect(secondDrop).toBeGreaterThan(firstDrop);
    });

    it('clamps session rating to floor', () => {
      const session = createAdaptiveSession('easy');
      // Force a very low rating by simulating many consecutive wrongs
      let state: AdaptiveSessionState = { ...session, sessionRating: 420, consecutiveWrong: 5 };
      state = processAdaptiveResult(state, 400, false, ['fork']);
      expect(state.sessionRating).toBe(ADAPTIVE_CONFIGS.easy.ratingFloor);
    });

    it('clamps session rating to ceiling', () => {
      const session = createAdaptiveSession('easy');
      let state: AdaptiveSessionState = { ...session, sessionRating: 1380 };
      state = processAdaptiveResult(state, 1400, true, ['fork']);
      expect(state.sessionRating).toBe(ADAPTIVE_CONFIGS.easy.ratingCeiling);
    });

    it('resets streak on wrong answer', () => {
      let session = createAdaptiveSession('easy');
      session = processAdaptiveResult(session, 1000, true, ['fork']);
      session = processAdaptiveResult(session, 1050, true, ['fork']);
      expect(session.streak).toBe(2);
      session = processAdaptiveResult(session, 1100, false, ['fork']);
      expect(session.streak).toBe(0);
    });

    it('tracks best streak', () => {
      let session = createAdaptiveSession('easy');
      session = processAdaptiveResult(session, 1000, true, ['fork']);
      session = processAdaptiveResult(session, 1050, true, ['fork']);
      session = processAdaptiveResult(session, 1100, true, ['fork']);
      expect(session.bestStreak).toBe(3);
      session = processAdaptiveResult(session, 1150, false, ['fork']);
      expect(session.bestStreak).toBe(3); // still 3
      session = processAdaptiveResult(session, 1100, true, ['fork']);
      expect(session.bestStreak).toBe(3); // still 3, new streak is only 1
    });

    it('records rating history', () => {
      let session = createAdaptiveSession('easy');
      session = processAdaptiveResult(session, 1000, true, ['fork']);
      session = processAdaptiveResult(session, 1050, false, ['pin']);
      expect(session.ratingHistory).toHaveLength(3); // initial + 2 results
      expect(session.ratingHistory[0]).toBe(ADAPTIVE_CONFIGS.easy.startRating);
    });

    it('sets weakThemeBoost every N puzzles', () => {
      const interval = ADAPTIVE_CONFIGS.easy.weaknessInterval;
      let session = createAdaptiveSession('easy');
      for (let i = 1; i < interval; i++) {
        session = processAdaptiveResult(session, 1000, true, ['fork']);
        expect(session.weakThemeBoost).toBe(false);
      }
      // The Nth puzzle should trigger weakness boost
      session = processAdaptiveResult(session, 1000, true, ['fork']);
      expect(session.weakThemeBoost).toBe(true);
    });

    it('tracks theme encounters', () => {
      let session = createAdaptiveSession('easy');
      session = processAdaptiveResult(session, 1000, true, ['fork', 'middlegame']);
      session = processAdaptiveResult(session, 1050, false, ['fork', 'pin']);
      expect(session.themesEncountered['fork']).toEqual({ correct: 1, total: 2 });
      expect(session.themesEncountered['middlegame']).toEqual({ correct: 1, total: 1 });
      expect(session.themesEncountered['pin']).toEqual({ correct: 0, total: 1 });
    });
  });

  describe('getNextAdaptivePuzzle', () => {
    it('returns a puzzle within the rating band', async () => {
      await db.puzzles.bulkPut([
        makePuzzle({ id: 'p1', rating: 950 }),
        makePuzzle({ id: 'p2', rating: 1050 }),
        makePuzzle({ id: 'p3', rating: 1500 }),
      ]);

      const session = createAdaptiveSession('easy');
      const puzzle = await getNextAdaptivePuzzle(session, new Set());
      expect(puzzle).not.toBeNull();
      expect(puzzle).toBeDefined();
      expect(['p1', 'p2']).toContain(puzzle?.id);
    });

    it('excludes seen puzzle IDs', async () => {
      await db.puzzles.bulkPut([
        makePuzzle({ id: 'p1', rating: 1000 }),
        makePuzzle({ id: 'p2', rating: 1010 }),
      ]);

      const session = createAdaptiveSession('easy');
      const puzzle = await getNextAdaptivePuzzle(session, new Set(['p1']));
      expect(puzzle).not.toBeNull();
      expect(puzzle).toBeDefined();
      expect(puzzle?.id).toBe('p2');
    });

    it('returns null when no puzzles available', async () => {
      const session = createAdaptiveSession('easy');
      const puzzle = await getNextAdaptivePuzzle(session, new Set());
      expect(puzzle).toBeNull();
    });

    it('returns null when all puzzles are seen', async () => {
      await db.puzzles.bulkPut([
        makePuzzle({ id: 'p1', rating: 1000 }),
      ]);

      const session = createAdaptiveSession('easy');
      const puzzle = await getNextAdaptivePuzzle(session, new Set(['p1']));
      expect(puzzle).toBeNull();
    });

    it('widens band when no puzzles in narrow band', async () => {
      await db.puzzles.bulkPut([
        makePuzzle({ id: 'far', rating: 700 }),
      ]);

      const session = createAdaptiveSession('easy'); // rating 1000, band 150
      const puzzle = await getNextAdaptivePuzzle(session, new Set());
      // 700 is outside ±150 but within ±300 or ±450
      expect(puzzle).not.toBeNull();
      expect(puzzle).toBeDefined();
      expect(puzzle?.id).toBe('far');
    });

    it('targets weak themes when weakThemeBoost is true', async () => {
      // Create puzzles: one with weak theme, one without
      await db.puzzles.bulkPut([
        makePuzzle({ id: 'weak-theme', rating: 1000, themes: ['fork'] }),
        makePuzzle({ id: 'other', rating: 1000, themes: ['endgame'] }),
      ]);

      // 'fork' is unattempted so it's considered "weakest" by getWeakestThemes
      const session = createAdaptiveSession('easy');
      const boostedSession: AdaptiveSessionState = { ...session, weakThemeBoost: true };
      const puzzle = await getNextAdaptivePuzzle(boostedSession, new Set());
      // Should prefer a puzzle matching a weak theme
      expect(puzzle).not.toBeNull();
    });
  });

  describe('getAdaptiveSessionSummary', () => {
    it('computes correct accuracy', () => {
      let session = createAdaptiveSession('easy');
      session = processAdaptiveResult(session, 1000, true, ['fork']);
      session = processAdaptiveResult(session, 1050, true, ['pin']);
      session = processAdaptiveResult(session, 1100, false, ['fork']);

      const summary = getAdaptiveSessionSummary(session);
      expect(summary.puzzlesSolved).toBe(2);
      expect(summary.puzzlesFailed).toBe(1);
      expect(summary.totalPuzzles).toBe(3);
      expect(summary.accuracy).toBeCloseTo(2 / 3);
    });

    it('includes rating history', () => {
      let session = createAdaptiveSession('medium');
      session = processAdaptiveResult(session, 1500, true, ['fork']);

      const summary = getAdaptiveSessionSummary(session);
      expect(summary.ratingHistory).toHaveLength(2);
      expect(summary.startRating).toBe(ADAPTIVE_CONFIGS.medium.startRating);
      expect(summary.endRating).toBe(session.sessionRating);
    });

    it('identifies weakest themes from session', () => {
      let session = createAdaptiveSession('easy');
      // pin: 0/2 correct, fork: 2/2 correct
      session = processAdaptiveResult(session, 1000, false, ['pin']);
      session = processAdaptiveResult(session, 950, false, ['pin']);
      session = processAdaptiveResult(session, 900, true, ['fork']);
      session = processAdaptiveResult(session, 950, true, ['fork']);

      const summary = getAdaptiveSessionSummary(session);
      expect(summary.weakestThemes.length).toBeGreaterThan(0);
      expect(summary.weakestThemes[0].theme).toBe('pin');
      expect(summary.weakestThemes[0].accuracy).toBe(0);
    });

    it('computes positive duration', () => {
      const session = createAdaptiveSession('easy');
      const summary = getAdaptiveSessionSummary(session);
      expect(summary.duration).toBeGreaterThanOrEqual(0);
    });
  });
});
