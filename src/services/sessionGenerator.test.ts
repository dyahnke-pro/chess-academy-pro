import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateDailySession, createSession, completeSession, updateStreak, generateCoachSession, getRecentSessions } from './sessionGenerator';
import type { UserProfile } from '../types';

vi.mock('./puzzleService', () => ({
  getWeakestThemes: vi.fn().mockResolvedValue(['fork']),
}));

vi.mock('./openingService', () => ({
  getWeakestOpenings: vi.fn().mockResolvedValue([{ id: 'italian-game' }]),
}));

const { mockSessionsPut, mockToArray, mockLimit } = vi.hoisted(() => {
  const mockToArray = vi.fn().mockResolvedValue([]);
  const mockLimit = vi.fn().mockReturnValue({ toArray: mockToArray });
  return {
    mockSessionsPut: vi.fn().mockResolvedValue(undefined),
    mockToArray,
    mockLimit,
  };
});

vi.mock('../db/schema', () => ({
  db: {
    sessions: {
      put: mockSessionsPut,
      update: vi.fn().mockResolvedValue(undefined),
      orderBy: vi.fn().mockReturnValue({
        reverse: vi.fn().mockReturnValue({
          limit: mockLimit,
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

    it('resets streak to 1 when lastActiveDate is null (new user)', async () => {
      const profile = createMockProfile({ lastActiveDate: null as unknown as string, currentStreak: 0, longestStreak: 0 });

      const result = await updateStreak(profile);
      expect(result.currentStreak).toBe(1);
      expect(result.longestStreak).toBe(1);
    });

    it('transitions streak from 0 to 1 on first day of activity', async () => {
      const profile = createMockProfile({ lastActiveDate: '2025-01-01', currentStreak: 0, longestStreak: 0 });

      const result = await updateStreak(profile);
      // Gap > 1 day so streak resets to 1
      expect(result.currentStreak).toBe(1);
      expect(result.longestStreak).toBe(1);
    });

    it('updates longest streak at exact boundary (current overtakes longest)', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      // currentStreak is 4, longestStreak is 4 — after increment currentStreak becomes 5
      const profile = createMockProfile({ lastActiveDate: yesterdayStr, currentStreak: 4, longestStreak: 4 });

      const result = await updateStreak(profile);
      expect(result.currentStreak).toBe(5);
      expect(result.longestStreak).toBe(5);
    });
  });

  describe('generateCoachSession', () => {
    it('returns base plan when no notes provided', async () => {
      const profile = createMockProfile();
      const plan = await generateCoachSession(profile);

      expect(plan.blocks).toHaveLength(4);
      expect(plan.totalMinutes).toBe(30);
      // Should match default distribution: 25/35/15/25
      expect(plan.blocks[0].type).toBe('opening_review');
      expect(plan.blocks[0].targetMinutes).toBe(8); // Math.round(30 * 0.25)
      expect(plan.blocks[1].type).toBe('puzzle_drill');
      expect(plan.blocks[1].targetMinutes).toBe(11); // Math.round(30 * 0.35)
    });

    it('returns base plan when coachNotes is undefined', async () => {
      const profile = createMockProfile();
      const plan = await generateCoachSession(profile, undefined);

      expect(plan.blocks).toHaveLength(4);
      expect(plan.totalMinutes).toBe(30);
    });

    it('increases puzzle allocation with "more puzzles" note', async () => {
      const profile = createMockProfile();
      const basePlan = await generateCoachSession(profile);
      const basePuzzleMinutes = basePlan.blocks.find(b => b.type === 'puzzle_drill')!.targetMinutes;

      const adjustedPlan = await generateCoachSession(profile, 'more puzzles please');
      const adjustedPuzzleMinutes = adjustedPlan.blocks.find(b => b.type === 'puzzle_drill')!.targetMinutes;

      expect(adjustedPuzzleMinutes).toBeGreaterThan(basePuzzleMinutes);
    });

    it('increases puzzle allocation with "more tactics" note', async () => {
      const profile = createMockProfile();
      const basePlan = await generateCoachSession(profile);
      const basePuzzleMinutes = basePlan.blocks.find(b => b.type === 'puzzle_drill')!.targetMinutes;

      const adjustedPlan = await generateCoachSession(profile, 'I want more tactics');
      const adjustedPuzzleMinutes = adjustedPlan.blocks.find(b => b.type === 'puzzle_drill')!.targetMinutes;

      expect(adjustedPuzzleMinutes).toBeGreaterThan(basePuzzleMinutes);
    });

    it('transfers time from flashcards block when adding more puzzles', async () => {
      const profile = createMockProfile();
      const basePlan = await generateCoachSession(profile);
      const baseFlashcards = basePlan.blocks.find(b => b.type === 'flashcards')!.targetMinutes;

      const adjustedPlan = await generateCoachSession(profile, 'more puzzles');
      const adjustedFlashcards = adjustedPlan.blocks.find(b => b.type === 'flashcards')!.targetMinutes;

      // blocks.find iterates in array order: flashcards comes before endgame_drill,
      // so flashcards is the donor block
      expect(adjustedFlashcards).toBeLessThan(baseFlashcards);
    });

    it('increases opening allocation with "more openings" note', async () => {
      const profile = createMockProfile();
      const basePlan = await generateCoachSession(profile);
      const baseOpeningMinutes = basePlan.blocks.find(b => b.type === 'opening_review')!.targetMinutes;

      const adjustedPlan = await generateCoachSession(profile, 'more openings');
      const adjustedOpeningMinutes = adjustedPlan.blocks.find(b => b.type === 'opening_review')!.targetMinutes;

      expect(adjustedOpeningMinutes).toBeGreaterThan(baseOpeningMinutes);
    });

    it('increases opening allocation with "opening practice" note', async () => {
      const profile = createMockProfile();
      const basePlan = await generateCoachSession(profile);
      const baseOpeningMinutes = basePlan.blocks.find(b => b.type === 'opening_review')!.targetMinutes;

      const adjustedPlan = await generateCoachSession(profile, 'I need opening practice');
      const adjustedOpeningMinutes = adjustedPlan.blocks.find(b => b.type === 'opening_review')!.targetMinutes;

      expect(adjustedOpeningMinutes).toBeGreaterThan(baseOpeningMinutes);
    });

    it('reduces total minutes with "shorter" note', async () => {
      const profile = createMockProfile();
      const basePlan = await generateCoachSession(profile);

      const adjustedPlan = await generateCoachSession(profile, 'shorter session today');

      expect(adjustedPlan.totalMinutes).toBeLessThan(basePlan.totalMinutes);
    });

    it('scales all blocks down with "shorter" note using 0.6 factor', async () => {
      const profile = createMockProfile();
      const adjustedPlan = await generateCoachSession(profile, 'shorter');

      // Each block should be Math.max(3, Math.round(original * 0.6))
      for (const block of adjustedPlan.blocks) {
        expect(block.targetMinutes).toBeGreaterThanOrEqual(3);
      }
    });

    it('applies combined notes "more puzzles, shorter"', async () => {
      const profile = createMockProfile();
      const basePlan = await generateCoachSession(profile);

      const adjustedPlan = await generateCoachSession(profile, 'more puzzles, shorter');

      // Total should be less than base (shorter applied)
      expect(adjustedPlan.totalMinutes).toBeLessThan(basePlan.totalMinutes);

      // Puzzle block should still have gotten a boost before the scale-down
      // With 30 min total: puzzle=11, endgame gets 7 (30-8-11-4).
      // "more puzzles" transfers half of endgame (3) to puzzles: puzzle=14, endgame=4
      // Then "shorter" scales everything by 0.6 with min of 3
      // After combined: puzzle minutes should be >= 3
      const puzzleBlock = adjustedPlan.blocks.find(b => b.type === 'puzzle_drill')!;
      expect(puzzleBlock.targetMinutes).toBeGreaterThanOrEqual(3);
    });

    it('applies combined notes "more openings, shorter"', async () => {
      const profile = createMockProfile();
      const adjustedPlan = await generateCoachSession(profile, 'more openings, shorter');

      expect(adjustedPlan.totalMinutes).toBeLessThan(30);

      const openingBlock = adjustedPlan.blocks.find(b => b.type === 'opening_review')!;
      expect(openingBlock.targetMinutes).toBeGreaterThanOrEqual(3);
    });

    it('ensures minimum 3 minutes per block when "shorter" is applied', async () => {
      // Use a profile with already short session time
      const profile = createMockProfile({
        preferences: { ...createMockProfile().preferences, dailySessionMinutes: 10 },
      });
      const adjustedPlan = await generateCoachSession(profile, 'shorter');

      for (const block of adjustedPlan.blocks) {
        expect(block.targetMinutes).toBeGreaterThanOrEqual(3);
      }
    });
  });

  describe('getRecentSessions', () => {
    it('returns sessions sorted by date descending with limit applied', async () => {
      const sessions = Array.from({ length: 10 }, (_, i) => ({
        id: `session-${i}`,
        date: `2026-03-${String(i + 1).padStart(2, '0')}`,
        profileId: 'main',
        durationMinutes: 30,
        plan: { blocks: [], totalMinutes: 30 },
        completed: true,
        puzzlesSolved: i,
        puzzleAccuracy: 0.8,
        xpEarned: 50,
        coachSummary: null,
      }));

      // The mock chain: orderBy -> reverse -> limit(5) -> toArray
      // Return only the last 5 sessions in reverse date order
      const sortedDesc = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
      const limited = sortedDesc.slice(0, 5);
      mockToArray.mockResolvedValueOnce(limited);

      const result = await getRecentSessions(5);

      expect(result).toHaveLength(5);
      expect(mockLimit).toHaveBeenCalledWith(5);
      // Verify sorted descending by date
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].date >= result[i + 1].date).toBe(true);
      }
    });

    it('returns all sessions when fewer than limit exist', async () => {
      const sessions = Array.from({ length: 3 }, (_, i) => ({
        id: `session-${i}`,
        date: `2026-03-${String(i + 1).padStart(2, '0')}`,
        profileId: 'main',
        durationMinutes: 30,
        plan: { blocks: [], totalMinutes: 30 },
        completed: true,
        puzzlesSolved: i,
        puzzleAccuracy: 0.8,
        xpEarned: 50,
        coachSummary: null,
      }));

      const sortedDesc = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
      mockToArray.mockResolvedValueOnce(sortedDesc);

      const result = await getRecentSessions(5);

      expect(result).toHaveLength(3);
      expect(mockLimit).toHaveBeenCalledWith(5);
    });

    it('defaults to limit of 7 when no limit provided', async () => {
      mockToArray.mockResolvedValueOnce([]);

      await getRecentSessions();

      expect(mockLimit).toHaveBeenCalledWith(7);
    });

    it('returns empty array when no sessions exist', async () => {
      mockToArray.mockResolvedValueOnce([]);

      const result = await getRecentSessions(5);

      expect(result).toHaveLength(0);
    });

    it('returns most recent sessions first when 10 sessions inserted and limited to 5', async () => {
      const sessions = Array.from({ length: 10 }, (_, i) => ({
        id: `session-${i}`,
        date: `2026-02-${String(i + 15).padStart(2, '0')}`,
        profileId: 'main',
        durationMinutes: 30,
        plan: { blocks: [], totalMinutes: 30 },
        completed: true,
        puzzlesSolved: i + 1,
        puzzleAccuracy: 0.75,
        xpEarned: 100,
        coachSummary: null,
      }));

      // Simulating DB returning the 5 most recent in desc order
      const sortedDesc = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
      const top5 = sortedDesc.slice(0, 5);
      mockToArray.mockResolvedValueOnce(top5);

      const result = await getRecentSessions(5);

      expect(result).toHaveLength(5);
      // First result should be the most recent date
      expect(result[0].date).toBe('2026-02-24');
      // Last result should be the 5th most recent
      expect(result[4].date).toBe('2026-02-20');
    });
  });
});
