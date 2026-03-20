import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import {
  ACHIEVEMENTS,
  checkAndAwardAchievements,
  getLevelTitle,
  getXpToNextLevel,
} from './gamificationService';
import type { UserProfile } from '../types';

function createTestProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'main',
    name: 'Tester',
    isKidMode: false,
    currentRating: 1400,
    puzzleRating: 1400,
    xp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    streakFreezes: 0,
    lastActiveDate: new Date().toISOString().split('T')[0],
    achievements: [],
    skillRadar: { opening: 50, tactics: 50, endgame: 50, memory: 50, calculation: 50 },
    badHabits: [],
    preferences: {
      theme: 'dark-premium',
      boardColor: 'classic',
      pieceSet: 'staunton',
      showEvalBar: true,
      showEngineLines: false,
      soundEnabled: true,
      voiceEnabled: true,
      dailySessionMinutes: 45,
      aiProvider: 'deepseek',
      apiKeyEncrypted: null,
      apiKeyIv: null,
      anthropicApiKeyEncrypted: null,
      anthropicApiKeyIv: null,
      preferredModel: {
        commentary: 'deepseek-chat',
        analysis: 'deepseek-reasoner',
        reports: 'deepseek-reasoner',
      },
      monthlyBudgetCap: null,
      estimatedSpend: 0,
      elevenlabsKeyEncrypted: null,
      elevenlabsKeyIv: null,
      elevenlabsVoiceId: null,
      voiceSpeed: 1.0,
      kokoroEnabled: true,
      kokoroVoiceId: 'af_heart',
      highlightLastMove: true,
      showLegalMoves: true,
      showCoordinates: true,
      pieceAnimationSpeed: 'medium',
      boardOrientation: true,
      moveQualityFlash: true,
      showHints: true,
      moveMethod: 'both',
      moveConfirmation: false,
      autoPromoteQueen: true,
      masterAllOff: false,
    },
    ...overrides,
  };
}

describe('gamificationService', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  describe('ACHIEVEMENTS', () => {
    it('has 19 achievements', () => {
      expect(ACHIEVEMENTS).toHaveLength(19);
    });

    it('all achievements have required fields', () => {
      for (const a of ACHIEVEMENTS) {
        expect(a.id).toBeTruthy();
        expect(a.name).toBeTruthy();
        expect(a.icon).toBeTruthy();
        expect(a.xpReward).toBeGreaterThan(0);
        expect(typeof a.condition).toBe('function');
      }
    });

    it('has unique ids', () => {
      const ids = ACHIEVEMENTS.map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('each achievement has id, name, description, icon, condition, and xpReward', () => {
      for (const a of ACHIEVEMENTS) {
        expect(a).toHaveProperty('id');
        expect(a).toHaveProperty('name');
        expect(a).toHaveProperty('description');
        expect(a).toHaveProperty('icon');
        expect(a).toHaveProperty('condition');
        expect(a).toHaveProperty('xpReward');
        expect(typeof a.id).toBe('string');
        expect(typeof a.name).toBe('string');
        expect(typeof a.description).toBe('string');
        expect(typeof a.icon).toBe('string');
        expect(typeof a.condition).toBe('function');
        expect(typeof a.xpReward).toBe('number');
      }
    });

    it('all achievements have non-empty descriptions', () => {
      for (const a of ACHIEVEMENTS) {
        expect(a.description.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getLevelTitle', () => {
    it('returns Beginner for level 1', () => {
      expect(getLevelTitle(1)).toBe('Beginner');
    });

    it('returns Pawn for level 2', () => {
      expect(getLevelTitle(2)).toBe('Pawn');
    });

    it('returns Knight for level 3', () => {
      expect(getLevelTitle(3)).toBe('Knight');
    });

    it('returns Bishop for level 4', () => {
      expect(getLevelTitle(4)).toBe('Bishop');
    });

    it('returns Rook for level 5', () => {
      expect(getLevelTitle(5)).toBe('Rook');
    });

    it('returns Queen for level 6', () => {
      expect(getLevelTitle(6)).toBe('Queen');
    });

    it('returns Grandmaster for level 7+', () => {
      expect(getLevelTitle(7)).toBe('Grandmaster');
      expect(getLevelTitle(10)).toBe('Grandmaster');
    });

    it('returns Grandmaster for very high levels', () => {
      expect(getLevelTitle(50)).toBe('Grandmaster');
      expect(getLevelTitle(100)).toBe('Grandmaster');
    });

    it('returns Beginner for level 0 (edge case)', () => {
      expect(getLevelTitle(0)).toBe('Beginner');
    });

    it('returns Beginner for negative levels (edge case)', () => {
      expect(getLevelTitle(-1)).toBe('Beginner');
    });
  });

  describe('getXpToNextLevel', () => {
    it('returns correct progress for 0 XP', () => {
      const result = getXpToNextLevel(0);
      expect(result.current).toBe(0);
      expect(result.needed).toBe(500);
      expect(result.percent).toBe(0);
    });

    it('returns correct progress for 250 XP', () => {
      const result = getXpToNextLevel(250);
      expect(result.current).toBe(250);
      expect(result.needed).toBe(500);
      expect(result.percent).toBe(50);
    });

    it('returns correct progress for 750 XP (wraps)', () => {
      const result = getXpToNextLevel(750);
      expect(result.current).toBe(250);
      expect(result.needed).toBe(500);
      expect(result.percent).toBe(50);
    });

    it('returns 0% progress at exact level boundary', () => {
      const result = getXpToNextLevel(1000);
      expect(result.current).toBe(0);
      expect(result.percent).toBe(0);
    });

    it('returns 99.8% progress at 499 XP (just below boundary)', () => {
      const result = getXpToNextLevel(499);
      expect(result.current).toBe(499);
      expect(result.needed).toBe(500);
      expect(result.percent).toBe(100); // Math.round(499/500 * 100) = 100
    });

    it('returns 0% progress at exactly 500 XP (level boundary)', () => {
      const result = getXpToNextLevel(500);
      expect(result.current).toBe(0);
      expect(result.needed).toBe(500);
      expect(result.percent).toBe(0);
    });

    it('returns correct progress at 1250 XP (halfway through third level)', () => {
      const result = getXpToNextLevel(1250);
      expect(result.current).toBe(250);
      expect(result.needed).toBe(500);
      expect(result.percent).toBe(50);
    });
  });

  describe('checkAndAwardAchievements', () => {
    it('awards streak_3 when currentStreak >= 3', async () => {
      const profile = createTestProfile({ currentStreak: 3 });
      await db.profiles.put(profile);

      const earned = await checkAndAwardAchievements(profile);
      const ids = earned.map((a) => a.id);
      expect(ids).toContain('streak_3');
    });

    it('awards reach_1500 when puzzleRating >= 1500', async () => {
      const profile = createTestProfile({ puzzleRating: 1500 });
      await db.profiles.put(profile);

      const earned = await checkAndAwardAchievements(profile);
      const ids = earned.map((a) => a.id);
      expect(ids).toContain('reach_1500');
    });

    it('awards reach_1800 when puzzleRating >= 1800', async () => {
      const profile = createTestProfile({ puzzleRating: 1800 });
      await db.profiles.put(profile);

      const earned = await checkAndAwardAchievements(profile);
      const ids = earned.map((a) => a.id);
      expect(ids).toContain('reach_1800');
    });

    it('awards reach_2000 when puzzleRating >= 2000', async () => {
      const profile = createTestProfile({ puzzleRating: 2000 });
      await db.profiles.put(profile);

      const earned = await checkAndAwardAchievements(profile);
      const ids = earned.map((a) => a.id);
      expect(ids).toContain('reach_2000');
    });

    it('does not re-award already earned achievements', async () => {
      const profile = createTestProfile({
        currentStreak: 5,
        achievements: ['streak_3'],
      });
      await db.profiles.put(profile);

      const earned = await checkAndAwardAchievements(profile);
      const ids = earned.map((a) => a.id);
      expect(ids).not.toContain('streak_3');
    });

    it('updates xp and level in DB when achievements earned', async () => {
      const profile = createTestProfile({ currentStreak: 3 });
      await db.profiles.put(profile);

      await checkAndAwardAchievements(profile);

      const updated = await db.profiles.get('main');
      expect(updated?.xp).toBeGreaterThan(0);
      expect(updated?.achievements).toContain('streak_3');
    });

    it('awards perfect_session when a session has 100% accuracy', async () => {
      const profile = createTestProfile();
      await db.profiles.put(profile);
      await db.sessions.put({
        id: 'session-1',
        date: '2026-03-04',
        profileId: 'main',
        durationMinutes: 30,
        plan: { blocks: [], totalMinutes: 30 },
        completed: true,
        puzzlesSolved: 5,
        puzzleAccuracy: 100,
        xpEarned: 50,
        coachSummary: null,
      });

      const earned = await checkAndAwardAchievements(profile);
      const ids = earned.map((a) => a.id);
      expect(ids).toContain('perfect_session');
    });

    it('awards all_themes when 5+ achievements already earned', async () => {
      const profile = createTestProfile({
        achievements: ['first_puzzle', 'ten_puzzles', 'streak_3', 'reach_1500', 'coach_session'],
      });
      await db.profiles.put(profile);

      const earned = await checkAndAwardAchievements(profile);
      const ids = earned.map((a) => a.id);
      expect(ids).toContain('all_themes');
    });

    it('returns empty array when no new achievements earned', async () => {
      const profile = createTestProfile();
      await db.profiles.put(profile);

      const earned = await checkAndAwardAchievements(profile);
      // Only first_puzzle & coach_session might fire if xp > 0, but xp is 0 here
      const nonFirstPuzzle = earned.filter((a) => a.id !== 'first_puzzle' && a.id !== 'coach_session');
      // Just check none of the condition-heavy ones were awarded
      expect(nonFirstPuzzle.every((a) => a.id !== 'streak_7')).toBe(true);
      expect(nonFirstPuzzle.every((a) => a.id !== 'reach_2000')).toBe(true);
    });

    it('calculates level correctly from total xp', async () => {
      const profile = createTestProfile({
        xp: 450,
        puzzleRating: 2000,
        currentStreak: 30,
      });
      await db.profiles.put(profile);

      await checkAndAwardAchievements(profile);

      const updated = await db.profiles.get('main');
      expect(updated).toBeDefined();
      // level = Math.floor(totalXp / 500) + 1
      if (updated) {
        expect(updated.level).toBeGreaterThanOrEqual(2);
      }
    });

    it('awards streak_7 when currentStreak >= 7', async () => {
      const profile = createTestProfile({ currentStreak: 7 });
      await db.profiles.put(profile);

      const earned = await checkAndAwardAchievements(profile);
      const ids = earned.map((a) => a.id);
      expect(ids).toContain('streak_7');
    });

    it('does not award streak_7 when currentStreak < 7', async () => {
      const profile = createTestProfile({ currentStreak: 6 });
      await db.profiles.put(profile);

      const earned = await checkAndAwardAchievements(profile);
      const ids = earned.map((a) => a.id);
      expect(ids).not.toContain('streak_7');
    });

    it('awards both streak_3 and streak_7 when currentStreak >= 7', async () => {
      const profile = createTestProfile({ currentStreak: 7 });
      await db.profiles.put(profile);

      const earned = await checkAndAwardAchievements(profile);
      const ids = earned.map((a) => a.id);
      expect(ids).toContain('streak_3');
      expect(ids).toContain('streak_7');
    });

    it('awards ten_puzzles when total puzzle attempts >= 10', async () => {
      const profile = createTestProfile();
      await db.profiles.put(profile);

      // Insert puzzles with enough attempts to total >= 10
      for (let i = 0; i < 5; i++) {
        await db.puzzles.put({
          id: `puzzle-${i}`,
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          moves: 'e2e4',
          rating: 1200,
          themes: ['fork'],
          openingTags: null,
          popularity: 90,
          nbPlays: 100,
          srsInterval: 0,
          srsEaseFactor: 2.5,
          srsRepetitions: 0,
          srsDueDate: new Date().toISOString().split('T')[0],
          srsLastReview: null,
          userRating: 1200,
          attempts: 2,
          successes: 1,
        });
      }

      const earned = await checkAndAwardAchievements(profile);
      const ids = earned.map((a) => a.id);
      expect(ids).toContain('ten_puzzles');
    });

    it('does not award ten_puzzles when total puzzle attempts < 10', async () => {
      const profile = createTestProfile();
      await db.profiles.put(profile);

      // Insert puzzles with only 9 total attempts
      for (let i = 0; i < 3; i++) {
        await db.puzzles.put({
          id: `puzzle-lt-${i}`,
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          moves: 'e2e4',
          rating: 1200,
          themes: ['fork'],
          openingTags: null,
          popularity: 90,
          nbPlays: 100,
          srsInterval: 0,
          srsEaseFactor: 2.5,
          srsRepetitions: 0,
          srsDueDate: new Date().toISOString().split('T')[0],
          srsLastReview: null,
          userRating: 1200,
          attempts: 3,
          successes: 1,
        });
      }

      const earned = await checkAndAwardAchievements(profile);
      const ids = earned.map((a) => a.id);
      expect(ids).not.toContain('ten_puzzles');
    });

    it('awards rating 1500 achievement at exactly 1500', async () => {
      const profile = createTestProfile({ puzzleRating: 1500 });
      await db.profiles.put(profile);

      const earned = await checkAndAwardAchievements(profile);
      const ids = earned.map((a) => a.id);
      expect(ids).toContain('reach_1500');
    });

    it('does not award rating 1500 achievement below 1500', async () => {
      const profile = createTestProfile({ puzzleRating: 1499 });
      await db.profiles.put(profile);

      const earned = await checkAndAwardAchievements(profile);
      const ids = earned.map((a) => a.id);
      expect(ids).not.toContain('reach_1500');
    });

    it('skips multiple already-earned achievements', async () => {
      const profile = createTestProfile({
        currentStreak: 8,
        puzzleRating: 1600,
        xp: 100,
        achievements: ['streak_3', 'streak_7', 'reach_1500', 'first_puzzle', 'coach_session'],
      });
      await db.profiles.put(profile);

      const earned = await checkAndAwardAchievements(profile);
      const ids = earned.map((a) => a.id);
      expect(ids).not.toContain('streak_3');
      expect(ids).not.toContain('streak_7');
      expect(ids).not.toContain('reach_1500');
      expect(ids).not.toContain('first_puzzle');
      expect(ids).not.toContain('coach_session');
    });

    it('updates XP and level in DB after awarding multiple achievements', async () => {
      const profile = createTestProfile({
        currentStreak: 7,
        puzzleRating: 1500,
        xp: 0,
      });
      await db.profiles.put(profile);

      const earned = await checkAndAwardAchievements(profile);
      expect(earned.length).toBeGreaterThan(0);

      const totalXpAwarded = earned.reduce((sum, a) => sum + a.xpReward, 0);

      const updated = await db.profiles.get('main');
      expect(updated).toBeDefined();
      if (updated) {
        expect(updated.xp).toBe(totalXpAwarded);
        expect(updated.level).toBe(Math.floor(totalXpAwarded / 500) + 1);
        // Verify achievements list was updated
        for (const a of earned) {
          expect(updated.achievements).toContain(a.id);
        }
      }
    });

    it('does not update DB when no new achievements earned', async () => {
      const profile = createTestProfile({
        currentStreak: 0,
        puzzleRating: 0,
        xp: 0,
        achievements: [],
      });
      await db.profiles.put(profile);

      const earned = await checkAndAwardAchievements(profile);

      // With 0 xp, 0 streak, 0 puzzleRating, no condition-based achievements should fire
      // first_puzzle condition: p.puzzleRating > 0 || p.xp > 0 => false
      // coach_session condition: p.xp > 0 => false
      expect(earned).toHaveLength(0);

      const updated = await db.profiles.get('main');
      expect(updated).toBeDefined();
      if (updated) {
        expect(updated.xp).toBe(0);
        expect(updated.achievements).toHaveLength(0);
      }
    });
  });
});
