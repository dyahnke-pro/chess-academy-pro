import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import {
  seedPuzzles,
  isPuzzleSeeded,
  calculateRatingDelta,
  updatePuzzleRating,
  getThemeSkills,
  getWeakestThemes,
  getPuzzleById,
  getPuzzlesByTheme,
  getPuzzlesInRatingBand,
  getDuePuzzles,
  getDailyPuzzles,
  recordAttempt,
  getPuzzlesForMode,
  getPuzzleStats,
  THEME_MAP,
  PUZZLE_MODES,
} from './puzzleService';
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

describe('puzzleService', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  describe('seedPuzzles', () => {
    it('seeds puzzles from the JSON data file', async () => {
      await seedPuzzles();
      const count = await db.puzzles.count();
      expect(count).toBeGreaterThan(0);
    });

    it('marks the database as seeded', async () => {
      await seedPuzzles();
      const seeded = await isPuzzleSeeded();
      expect(seeded).toBe(true);
    });

    it('is idempotent — second call does not duplicate', async () => {
      await seedPuzzles();
      const count1 = await db.puzzles.count();
      await seedPuzzles();
      const count2 = await db.puzzles.count();
      expect(count2).toBe(count1);
    });

    it('seeds puzzles with all required fields', async () => {
      await seedPuzzles();
      const puzzle = await db.puzzles.toCollection().first();
      expect(puzzle).toBeDefined();
      if (!puzzle) return;
      expect(puzzle.fen).toBeTruthy();
      expect(puzzle.moves).toBeTruthy();
      expect(puzzle.rating).toBeGreaterThan(0);
      expect(puzzle.themes.length).toBeGreaterThan(0);
      expect(puzzle.srsEaseFactor).toBe(2.5);
    });

    it('seeds puzzles covering multiple tactical themes', async () => {
      await seedPuzzles();
      const all = await db.puzzles.toArray();
      const allThemes = new Set(all.flatMap((p) => p.themes));
      expect(allThemes.has('fork')).toBe(true);
      expect(allThemes.has('endgame')).toBe(true);
    });
  });

  describe('calculateRatingDelta', () => {
    it('returns positive delta when user solves a puzzle at their rating', () => {
      const delta = calculateRatingDelta(1200, 1200, true);
      expect(delta).toBe(16);
    });

    it('returns negative delta when user fails a puzzle at their rating', () => {
      const delta = calculateRatingDelta(1200, 1200, false);
      expect(delta).toBe(-16);
    });

    it('returns larger positive delta for solving a harder puzzle', () => {
      const delta = calculateRatingDelta(1200, 1600, true);
      expect(delta).toBeGreaterThan(16);
    });

    it('returns smaller negative delta for failing a harder puzzle', () => {
      const delta = calculateRatingDelta(1200, 1600, false);
      expect(Math.abs(delta)).toBeLessThan(16);
    });

    it('returns smaller positive delta for solving an easier puzzle', () => {
      const delta = calculateRatingDelta(1200, 800, true);
      expect(delta).toBeLessThan(16);
    });
  });

  describe('updatePuzzleRating', () => {
    it('increases rating on correct solve', () => {
      const newRating = updatePuzzleRating(1200, 1200, true);
      expect(newRating).toBeGreaterThan(1200);
    });

    it('decreases rating on incorrect solve', () => {
      const newRating = updatePuzzleRating(1200, 1200, false);
      expect(newRating).toBeLessThan(1200);
    });
  });

  describe('getThemeSkills', () => {
    it('returns empty array when no puzzles attempted', async () => {
      const skills = await getThemeSkills();
      expect(skills).toEqual([]);
    });

    it('returns theme accuracies sorted by weakest first', async () => {
      await db.puzzles.bulkPut([
        makePuzzle({ id: 'p1', themes: ['fork'], attempts: 10, successes: 9 }),
        makePuzzle({ id: 'p2', themes: ['pin'], attempts: 10, successes: 3 }),
      ]);
      const skills = await getThemeSkills();
      expect(skills.length).toBe(2);
      expect(skills[0].theme).toBe('pin');
      expect(skills[0].accuracy).toBeCloseTo(0.3);
      expect(skills[1].theme).toBe('fork');
      expect(skills[1].accuracy).toBeCloseTo(0.9);
    });
  });

  describe('getWeakestThemes', () => {
    it('returns unattempted themes first', async () => {
      await db.puzzles.bulkPut([
        makePuzzle({ id: 'p1', themes: ['fork'], attempts: 10, successes: 9 }),
      ]);
      const weakest = await getWeakestThemes(3);
      expect(weakest.length).toBe(3);
      expect(weakest).not.toContain('fork');
    });
  });

  describe('getPuzzleById', () => {
    it('returns a puzzle by its ID', async () => {
      const puzzle = makePuzzle({ id: 'test-puzzle-1' });
      await db.puzzles.put(puzzle);
      const result = await getPuzzleById('test-puzzle-1');
      expect(result).toBeDefined();
      if (!result) return;
      expect(result.id).toBe('test-puzzle-1');
    });

    it('returns undefined for non-existent puzzle', async () => {
      const result = await getPuzzleById('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('getPuzzlesByTheme', () => {
    it('returns puzzles matching a theme', async () => {
      await db.puzzles.bulkPut([
        makePuzzle({ id: 'p1', themes: ['fork'] }),
        makePuzzle({ id: 'p2', themes: ['pin'] }),
        makePuzzle({ id: 'p3', themes: ['fork', 'middlegame'] }),
      ]);
      const forks = await getPuzzlesByTheme('fork');
      expect(forks.length).toBe(2);
    });
  });

  describe('getPuzzlesInRatingBand', () => {
    it('returns puzzles within the rating band', async () => {
      await db.puzzles.bulkPut([
        makePuzzle({ id: 'p1', rating: 1100 }),
        makePuzzle({ id: 'p2', rating: 1200 }),
        makePuzzle({ id: 'p3', rating: 1500 }),
        makePuzzle({ id: 'p4', rating: 800 }),
      ]);
      const band = await getPuzzlesInRatingBand(1200, 200);
      expect(band.length).toBe(2);
    });
  });

  describe('getDuePuzzles', () => {
    it('returns puzzles due today or earlier', async () => {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      await db.puzzles.bulkPut([
        makePuzzle({ id: 'due', srsDueDate: today }),
        makePuzzle({ id: 'not-due', srsDueDate: tomorrowStr }),
      ]);

      const due = await getDuePuzzles();
      expect(due.length).toBe(1);
      expect(due[0].id).toBe('due');
    });
  });

  describe('getDailyPuzzles', () => {
    it('returns puzzles up to the requested count', async () => {
      await seedPuzzles();
      const daily = await getDailyPuzzles(1200, 5);
      expect(daily.length).toBeLessThanOrEqual(5);
      expect(daily.length).toBeGreaterThan(0);
    });

    it('returns unique puzzles (no duplicates)', async () => {
      await seedPuzzles();
      const daily = await getDailyPuzzles(1200, 10);
      const ids = daily.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('recordAttempt', () => {
    it('updates puzzle stats after a correct attempt', async () => {
      const puzzle = makePuzzle({ id: 'record-test', rating: 1200, attempts: 0, successes: 0 });
      await db.puzzles.put(puzzle);

      const result = await recordAttempt('record-test', true, 1200, 'good');
      expect(result).not.toBeNull();
      if (!result) return;
      expect(result.correct).toBe(true);
      expect(result.newUserRating).toBeGreaterThan(1200);
      expect(result.ratingDelta).toBeGreaterThan(0);

      const updated = await db.puzzles.get('record-test');
      expect(updated).toBeDefined();
      if (!updated) return;
      expect(updated.attempts).toBe(1);
      expect(updated.successes).toBe(1);
      expect(updated.srsLastReview).not.toBeNull();
    });

    it('updates puzzle stats after an incorrect attempt', async () => {
      const puzzle = makePuzzle({ id: 'record-fail', rating: 1200, attempts: 0, successes: 0 });
      await db.puzzles.put(puzzle);

      const result = await recordAttempt('record-fail', false, 1200, 'again');
      expect(result).not.toBeNull();
      if (!result) return;
      expect(result.correct).toBe(false);
      expect(result.newUserRating).toBeLessThan(1200);

      const updated = await db.puzzles.get('record-fail');
      expect(updated).toBeDefined();
      if (!updated) return;
      expect(updated.attempts).toBe(1);
      expect(updated.successes).toBe(0);
    });

    it('returns null for non-existent puzzle', async () => {
      const result = await recordAttempt('non-existent', true, 1200, 'good');
      expect(result).toBeNull();
    });

    it('updates SRS fields correctly for easy grade', async () => {
      const puzzle = makePuzzle({
        id: 'srs-easy',
        srsRepetitions: 2,
        srsInterval: 6,
        srsEaseFactor: 2.5,
      });
      await db.puzzles.put(puzzle);

      await recordAttempt('srs-easy', true, 1200, 'easy');
      const updated = await db.puzzles.get('srs-easy');
      expect(updated).toBeDefined();
      if (!updated) return;
      expect(updated.srsRepetitions).toBe(3);
      expect(updated.srsInterval).toBeGreaterThan(6);
    });

    it('resets SRS on "again" grade', async () => {
      const puzzle = makePuzzle({
        id: 'srs-again',
        srsRepetitions: 5,
        srsInterval: 30,
        srsEaseFactor: 2.5,
      });
      await db.puzzles.put(puzzle);

      await recordAttempt('srs-again', false, 1200, 'again');
      const updated = await db.puzzles.get('srs-again');
      expect(updated).toBeDefined();
      if (!updated) return;
      expect(updated.srsRepetitions).toBe(0);
      expect(updated.srsInterval).toBe(1);
    });
  });

  describe('getPuzzlesForMode', () => {
    beforeEach(async () => {
      await seedPuzzles();
    });

    it('returns puzzles for standard mode', async () => {
      const puzzles = await getPuzzlesForMode('standard', 1200, 5);
      expect(puzzles.length).toBeGreaterThan(0);
    });

    it('returns exactly one puzzle for daily_challenge mode', async () => {
      const puzzles = await getPuzzlesForMode('daily_challenge', 1200);
      expect(puzzles.length).toBe(1);
    });

    it('returns same puzzle for daily_challenge on the same day', async () => {
      const puzzles1 = await getPuzzlesForMode('daily_challenge', 1200);
      const puzzles2 = await getPuzzlesForMode('daily_challenge', 1200);
      expect(puzzles1[0].id).toBe(puzzles2[0].id);
    });

    it('returns endgame puzzles for endgame mode', async () => {
      const puzzles = await getPuzzlesForMode('endgame', 1200, 20);
      for (const p of puzzles) {
        const hasEndgameTheme = p.themes.some((t) =>
          ['endgame', 'rookEndgame', 'pawnEndgame', 'bishopEndgame', 'knightEndgame', 'queenEndgame'].includes(t),
        );
        expect(hasEndgameTheme).toBe(true);
      }
    });

    it('returns opening trap puzzles for opening_traps mode', async () => {
      const puzzles = await getPuzzlesForMode('opening_traps', 1200, 20);
      for (const p of puzzles) {
        const hasOpeningTag = p.themes.includes('openingTrap') || p.openingTags !== null;
        expect(hasOpeningTag).toBe(true);
      }
    });
  });

  describe('getPuzzleStats', () => {
    it('returns zeroed stats when no puzzles exist', async () => {
      const stats = await getPuzzleStats();
      expect(stats.totalAttempted).toBe(0);
      expect(stats.totalCorrect).toBe(0);
      expect(stats.overallAccuracy).toBe(0);
    });

    it('returns correct stats after seeding and attempts', async () => {
      await db.puzzles.bulkPut([
        makePuzzle({ id: 'stat1', attempts: 5, successes: 4, rating: 1200 }),
        makePuzzle({ id: 'stat2', attempts: 3, successes: 1, rating: 1400 }),
        makePuzzle({ id: 'stat3', attempts: 0, successes: 0, rating: 1000 }),
      ]);

      const stats = await getPuzzleStats();
      expect(stats.totalAttempted).toBe(2);
      expect(stats.totalCorrect).toBe(5);
      expect(stats.overallAccuracy).toBeCloseTo(5 / 8);
      expect(stats.averageRating).toBe(1300);
      expect(stats.totalPuzzles).toBe(3);
    });
  });

  describe('THEME_MAP', () => {
    it('covers all 10 required tactical categories', () => {
      const categories = Object.keys(THEME_MAP);
      expect(categories).toContain('Forks');
      expect(categories).toContain('Pins & Skewers');
      expect(categories).toContain('Discovered Attacks');
      expect(categories).toContain('Back Rank Mates');
      expect(categories).toContain('Sacrifices');
      expect(categories).toContain('Deflection & Decoy');
      expect(categories).toContain('Zugzwang');
      expect(categories).toContain('Endgame Technique');
      expect(categories).toContain('Opening Traps');
      expect(categories).toContain('Mating Nets');
    });
  });

  describe('PUZZLE_MODES', () => {
    it('defines all 5 required puzzle modes', () => {
      const modes = PUZZLE_MODES.map((m) => m.mode);
      expect(modes).toContain('standard');
      expect(modes).toContain('timed_blitz');
      expect(modes).toContain('daily_challenge');
      expect(modes).toContain('opening_traps');
      expect(modes).toContain('endgame');
    });

    it('timed_blitz has 30 second time limit', () => {
      const blitz = PUZZLE_MODES.find((m) => m.mode === 'timed_blitz');
      expect(blitz).toBeDefined();
      if (!blitz) return;
      expect(blitz.timeLimit).toBe(30);
    });
  });
});
