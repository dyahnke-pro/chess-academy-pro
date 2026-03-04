import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateDailySession, createSession, completeSession, updateStreak } from './sessionGenerator';
import type { UserProfile } from '../types';

vi.mock('./puzzleService', () => ({
  getWeakestThemes: vi.fn().mockResolvedValue(['fork']),
}));

vi.mock('./openingService', () => ({
  getWeakestOpenings: vi.fn().mockResolvedValue([{ id: 'italian-game' }]),
}));

const { mockSessionsPut } = vi.hoisted(() => ({
  mockSessionsPut: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../db/schema', () => ({
  db: {
    sessions: {
      put: mockSessionsPut,
      update: vi.fn().mockResolvedValue(undefined),
      orderBy: vi.fn().mockReturnValue({
        reverse: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    },
    profiles: {
      update: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

function createMockProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'main',
    name: 'Test User',
    currentRating: 1200,
    peakRating: 1200,
    puzzleRating: 1200,
    level: 5,
    xp: 500,
    currentStreak: 3,
    longestStreak: 7,
    lastActiveDate: '2026-03-03',
    coachPersonality: 'danya',
    preferences: {
      dailySessionMinutes: 30,
      theme: 'dark',
      soundEnabled: true,
      pieceSet: 'standard',
      boardTheme: 'green',
      apiKeyEncrypted: '',
      monthlyBudgetCap: null,
      estimatedSpend: 0,
      kidMode: false,
    },
    skillRadar: {
      tactics: 60,
      openings: 50,
      endgames: 40,
      strategy: 55,
      calculation: 45,
    },
    badHabits: [],
    ...overrides,
  } as UserProfile;
}

describe('sessionGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateDailySession', () => {
    it('creates a session plan with correct block distribution', async () => {
      const profile = createMockProfile();
      const plan = await generateDailySession(profile);

      expect(plan.blocks).toHaveLength(4);
      expect(plan.totalMinutes).toBe(30);
      expect(plan.blocks[0].type).toBe('opening_review');
      expect(plan.blocks[1].type).toBe('puzzle_drill');
      expect(plan.blocks[2].type).toBe('flashcards');
      expect(plan.blocks[3].type).toBe('endgame_drill');
    });

    it('uses 25/35/15/25 time split', async () => {
      const profile = createMockProfile({ preferences: { ...createMockProfile().preferences, dailySessionMinutes: 40 } });
      const plan = await generateDailySession(profile);

      expect(plan.blocks[0].targetMinutes).toBe(10); // 25% of 40
      expect(plan.blocks[1].targetMinutes).toBe(14); // 35% of 40
      expect(plan.blocks[2].targetMinutes).toBe(6);  // 15% of 40
      expect(plan.blocks[3].targetMinutes).toBe(10); // remainder
    });

    it('assigns weakest opening to opening review block', async () => {
      const profile = createMockProfile();
      const plan = await generateDailySession(profile);

      expect(plan.blocks[0].openingId).toBe('italian-game');
    });

    it('assigns weakest theme to puzzle drill block', async () => {
      const profile = createMockProfile();
      const plan = await generateDailySession(profile);

      expect(plan.blocks[1].puzzleTheme).toBe('fork');
    });
  });

  describe('createSession', () => {
    it('creates and persists a session record', async () => {
      const profile = createMockProfile();
      const session = await createSession(profile);

      expect(session.profileId).toBe('main');
      expect(session.completed).toBe(false);
      expect(session.puzzlesSolved).toBe(0);
      expect(session.xpEarned).toBe(0);
      expect(mockSessionsPut).toHaveBeenCalled();
    });
  });

  describe('completeSession', () => {
    it('calculates XP correctly with accuracy bonus', async () => {
      const xp = await completeSession('session-1', {
        puzzlesSolved: 5,
        puzzleAccuracy: 0.85,
        durationMinutes: 25,
      });

      // base 50 + 5*10=50 + accuracy bonus 25 (>=80%) = 125
      expect(xp).toBe(125);
    });

    it('calculates XP with medium accuracy bonus', async () => {
      const xp = await completeSession('session-1', {
        puzzlesSolved: 3,
        puzzleAccuracy: 0.65,
        durationMinutes: 20,
      });

      // base 50 + 3*10=30 + accuracy bonus 10 (>=60%) = 90
      expect(xp).toBe(90);
    });

    it('calculates XP with no accuracy bonus', async () => {
      const xp = await completeSession('session-1', {
        puzzlesSolved: 2,
        puzzleAccuracy: 0.4,
        durationMinutes: 15,
      });

      // base 50 + 2*10=20 + 0 = 70
      expect(xp).toBe(70);
    });
  });

  describe('updateStreak', () => {
    it('returns same streak when already active today', async () => {
      const today = new Date().toISOString().split('T')[0];
      const profile = createMockProfile({ lastActiveDate: today, currentStreak: 5, longestStreak: 10 });

      const result = await updateStreak(profile);
      expect(result.currentStreak).toBe(5);
      expect(result.longestStreak).toBe(10);
    });

    it('increments streak when last active yesterday', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const profile = createMockProfile({ lastActiveDate: yesterdayStr, currentStreak: 5, longestStreak: 10 });

      const result = await updateStreak(profile);
      expect(result.currentStreak).toBe(6);
      expect(result.longestStreak).toBe(10);
    });

    it('resets streak when gap is more than one day', async () => {
      const profile = createMockProfile({ lastActiveDate: '2026-02-01', currentStreak: 5, longestStreak: 10 });

      const result = await updateStreak(profile);
      expect(result.currentStreak).toBe(1);
    });

    it('updates longest streak when current exceeds it', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const profile = createMockProfile({ lastActiveDate: yesterdayStr, currentStreak: 10, longestStreak: 10 });

      const result = await updateStreak(profile);
      expect(result.currentStreak).toBe(11);
      expect(result.longestStreak).toBe(11);
    });
  });
});
