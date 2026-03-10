import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildUserProfile,
  buildGameRecord,
  buildOpeningRecord,
  buildBadHabit,
  resetFactoryCounter,
} from '../test/factories';
import type { GameRecord, WeaknessProfile } from '../types';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../db/schema', () => ({
  db: {
    games: {
      where: vi.fn(),
    },
  },
}));

vi.mock('./weaknessAnalyzer', () => ({
  getStoredWeaknessProfile: vi.fn(),
}));

vi.mock('./flashcardService', () => ({
  getFlashcardStats: vi.fn(),
}));

vi.mock('./openingService', () => ({
  getWeakestOpenings: vi.fn(),
}));

import { db } from '../db/schema';
import { getStoredWeaknessProfile } from './weaknessAnalyzer';
import { getFlashcardStats } from './flashcardService';
import { getWeakestOpenings } from './openingService';
import {
  getCoachGreeting,
  getTrainingRecommendations,
} from './coachTrainingService';

const mockGetStoredWeaknessProfile = vi.mocked(getStoredWeaknessProfile);
const mockGetFlashcardStats = vi.mocked(getFlashcardStats);
const mockGetWeakestOpenings = vi.mocked(getWeakestOpenings);
// eslint-disable-next-line @typescript-eslint/unbound-method
const mockGamesWhere = vi.mocked(db.games.where);

function mockGamesQuery(games: GameRecord[]): void {
  const chain = {
    reverse: vi.fn().mockReturnThis(),
    sortBy: vi.fn().mockResolvedValue(games),
  };
  mockGamesWhere.mockReturnValue({
    equals: vi.fn().mockReturnValue(chain),
  } as never);
}

function defaultMocks(): void {
  // Reset mock implementations (not just call history)
  mockGamesQuery([]);
  mockGetStoredWeaknessProfile.mockResolvedValue(null);
  mockGetFlashcardStats.mockResolvedValue({ total: 0, due: 0, byOpening: {} });
  mockGetWeakestOpenings.mockResolvedValue([]);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('coachTrainingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFactoryCounter();
    defaultMocks();
  });

  // ── getCoachGreeting ────────────────────────────────────────────────────

  describe('getCoachGreeting', () => {
    it('includes the player name', () => {
      const profile = buildUserProfile({ name: 'Alice' });
      const greeting = getCoachGreeting(profile);
      expect(greeting).toContain('Alice');
    });

    it('returns "on fire" message for streak >= 7', () => {
      const profile = buildUserProfile({ currentStreak: 10 });
      const greeting = getCoachGreeting(profile);
      expect(greeting).toContain('on fire');
      expect(greeting).toContain('10-day streak');
    });

    it('returns "Nice streak" message for streak 3–6', () => {
      const profile = buildUserProfile({ currentStreak: 5 });
      const greeting = getCoachGreeting(profile);
      expect(greeting).toContain('Nice streak');
      expect(greeting).toContain('5 days');
    });

    it('returns default message when no streak', () => {
      const profile = buildUserProfile({ currentStreak: 0 });
      const greeting = getCoachGreeting(profile);
      expect(greeting).toContain("Let's sharpen your game");
    });

    it('returns default message for streak of 2', () => {
      const profile = buildUserProfile({ currentStreak: 2 });
      const greeting = getCoachGreeting(profile);
      expect(greeting).toContain("Let's sharpen your game");
      expect(greeting).not.toContain('Nice streak');
    });

    it('includes time-of-day greeting in the morning', () => {
      vi.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
      const profile = buildUserProfile();
      const greeting = getCoachGreeting(profile);
      expect(greeting).toContain('Good morning');
      vi.restoreAllMocks();
      defaultMocks();
    });

    it('includes time-of-day greeting in the afternoon', () => {
      vi.spyOn(Date.prototype, 'getHours').mockReturnValue(14);
      const profile = buildUserProfile();
      const greeting = getCoachGreeting(profile);
      expect(greeting).toContain('Good afternoon');
      vi.restoreAllMocks();
      defaultMocks();
    });

    it('includes time-of-day greeting in the evening', () => {
      vi.spyOn(Date.prototype, 'getHours').mockReturnValue(20);
      const profile = buildUserProfile();
      const greeting = getCoachGreeting(profile);
      expect(greeting).toContain('Good evening');
      vi.restoreAllMocks();
      defaultMocks();
    });
  });

  // ── getTrainingRecommendations ──────────────────────────────────────────

  describe('getTrainingRecommendations', () => {
    it('returns empty array when no data available', async () => {
      const profile = buildUserProfile();
      const recs = await getTrainingRecommendations(profile);
      expect(recs).toEqual([]);
    });

    it('recommends guided lesson from analyzed coach game', async () => {
      const game = buildGameRecord({
        source: 'coach',
        coachAnalysis: 'You blundered on move 12.',
      });
      mockGamesQuery([game]);

      const profile = buildUserProfile();
      const recs = await getTrainingRecommendations(profile);
      const guided = recs.find((r) => r.type === 'guided_lesson');
      expect(guided).toBeDefined();
      expect(guided?.priority).toBe(1);
      expect(guided?.data.gameId).toBe(game.id);
    });

    it('skips coach games without coachAnalysis', async () => {
      const game = buildGameRecord({
        source: 'coach',
        coachAnalysis: null,
      });
      mockGamesQuery([game]);

      const profile = buildUserProfile();
      const recs = await getTrainingRecommendations(profile);
      const guided = recs.find((r) => r.type === 'guided_lesson');
      expect(guided).toBeUndefined();
    });

    it('recommends weakness drills from weakness profile', async () => {
      const weakness: WeaknessProfile = {
        computedAt: new Date().toISOString(),
        items: [
          {
            category: 'tactics',
            label: 'Fork Blindness',
            metric: '40% accuracy',
            severity: 80,
            detail: 'You miss forks frequently.',
          },
        ],
        strengths: [],
        overallAssessment: 'Needs work on tactics.',
      };
      mockGetStoredWeaknessProfile.mockResolvedValue(weakness);

      const profile = buildUserProfile();
      const recs = await getTrainingRecommendations(profile);
      const drill = recs.find((r) => r.id === 'weakness-tactics');
      expect(drill).toBeDefined();
      expect(drill?.type).toBe('tactic_drill');
      expect(drill?.priority).toBe(2);
    });

    it('adds second weakness when severity > 60', async () => {
      const weakness: WeaknessProfile = {
        computedAt: new Date().toISOString(),
        items: [
          {
            category: 'tactics',
            label: 'Fork Blindness',
            metric: '40%',
            severity: 80,
            detail: 'Forks.',
          },
          {
            category: 'endgame',
            label: 'Endgame Weakness',
            metric: '35%',
            severity: 70,
            detail: 'Endgames.',
          },
        ],
        strengths: [],
        overallAssessment: 'Work needed.',
      };
      mockGetStoredWeaknessProfile.mockResolvedValue(weakness);

      const profile = buildUserProfile();
      const recs = await getTrainingRecommendations(profile);
      const endgameRec = recs.find((r) => r.id === 'weakness-endgame');
      expect(endgameRec).toBeDefined();
      expect(endgameRec?.type).toBe('endgame_practice');
      expect(endgameRec?.priority).toBe(4);
    });

    it('does not add second weakness when severity <= 60', async () => {
      const weakness: WeaknessProfile = {
        computedAt: new Date().toISOString(),
        items: [
          {
            category: 'tactics',
            label: 'Fork Blindness',
            metric: '40%',
            severity: 80,
            detail: 'Forks.',
          },
          {
            category: 'endgame',
            label: 'Endgame Weakness',
            metric: '55%',
            severity: 60,
            detail: 'Endgames are fine.',
          },
        ],
        strengths: [],
        overallAssessment: 'Work needed.',
      };
      mockGetStoredWeaknessProfile.mockResolvedValue(weakness);

      const profile = buildUserProfile();
      const recs = await getTrainingRecommendations(profile);
      const endgameRec = recs.find((r) => r.id === 'weakness-endgame');
      expect(endgameRec).toBeUndefined();
    });

    it('recommends flashcard review when due > 5', async () => {
      mockGetFlashcardStats.mockResolvedValue({
        total: 20,
        due: 8,
        byOpening: {},
      });

      const profile = buildUserProfile();
      const recs = await getTrainingRecommendations(profile);
      const flashcard = recs.find((r) => r.type === 'flashcard_review');
      expect(flashcard).toBeDefined();
      expect(flashcard?.priority).toBe(3);
      expect(flashcard?.description).toContain('8');
    });

    it('does not recommend flashcards when due <= 5', async () => {
      mockGetFlashcardStats.mockResolvedValue({
        total: 20,
        due: 5,
        byOpening: {},
      });

      const profile = buildUserProfile();
      const recs = await getTrainingRecommendations(profile);
      const flashcard = recs.find((r) => r.type === 'flashcard_review');
      expect(flashcard).toBeUndefined();
    });

    it('recommends bad habit drill when no weakness recs exist', async () => {
      const habit = buildBadHabit({
        description: 'Leaves pieces hanging',
        isResolved: false,
      });
      const profile = buildUserProfile({ badHabits: [habit] });
      const recs = await getTrainingRecommendations(profile);
      const habitRec = recs.find((r) => r.id === 'bad-habit-drill');
      expect(habitRec).toBeDefined();
      expect(habitRec?.type).toBe('tactic_drill');
      expect(habitRec?.description).toContain('Leaves pieces hanging');
    });

    it('does not recommend bad habit drill when weakness recs exist', async () => {
      const weakness: WeaknessProfile = {
        computedAt: new Date().toISOString(),
        items: [
          {
            category: 'tactics',
            label: 'Forks',
            metric: '40%',
            severity: 80,
            detail: 'Forks.',
          },
        ],
        strengths: [],
        overallAssessment: 'Work needed.',
      };
      mockGetStoredWeaknessProfile.mockResolvedValue(weakness);

      const habit = buildBadHabit({ isResolved: false });
      const profile = buildUserProfile({ badHabits: [habit] });
      const recs = await getTrainingRecommendations(profile);
      const habitRec = recs.find((r) => r.id === 'bad-habit-drill');
      expect(habitRec).toBeUndefined();
    });

    it('skips resolved bad habits', async () => {
      const habit = buildBadHabit({ isResolved: true });
      const profile = buildUserProfile({ badHabits: [habit] });
      const recs = await getTrainingRecommendations(profile);
      const habitRec = recs.find((r) => r.id === 'bad-habit-drill');
      expect(habitRec).toBeUndefined();
    });

    it('recommends weakest opening review', async () => {
      const opening = buildOpeningRecord({
        id: 'italian-game',
        name: 'Italian Game',
      });
      mockGetWeakestOpenings.mockResolvedValue([opening]);

      const profile = buildUserProfile();
      const recs = await getTrainingRecommendations(profile);
      const openingRec = recs.find((r) => r.type === 'opening_review');
      expect(openingRec).toBeDefined();
      expect(openingRec?.data.openingId).toBe('italian-game');
      expect(openingRec?.title).toContain('Italian Game');
    });

    it('does not add opening review when one already exists from weakness', async () => {
      const weakness: WeaknessProfile = {
        computedAt: new Date().toISOString(),
        items: [
          {
            category: 'openings',
            label: 'Opening Prep',
            metric: '30%',
            severity: 85,
            detail: 'Weak openings.',
          },
        ],
        strengths: [],
        overallAssessment: 'Openings need work.',
      };
      mockGetStoredWeaknessProfile.mockResolvedValue(weakness);

      const opening = buildOpeningRecord({
        id: 'italian-game',
        name: 'Italian Game',
      });
      mockGetWeakestOpenings.mockResolvedValue([opening]);

      const profile = buildUserProfile();
      const recs = await getTrainingRecommendations(profile);
      const openingRecs = recs.filter((r) => r.type === 'opening_review');
      expect(openingRecs).toHaveLength(1);
      expect(openingRecs[0].id).toBe('weakness-openings');
    });

    it('limits results to 3 recommendations', async () => {
      const game = buildGameRecord({
        source: 'coach',
        coachAnalysis: 'Analysis here.',
      });
      mockGamesQuery([game]);

      const weakness: WeaknessProfile = {
        computedAt: new Date().toISOString(),
        items: [
          {
            category: 'tactics',
            label: 'Forks',
            metric: '40%',
            severity: 80,
            detail: 'Forks.',
          },
          {
            category: 'endgame',
            label: 'Endgames',
            metric: '30%',
            severity: 75,
            detail: 'Endgames.',
          },
        ],
        strengths: [],
        overallAssessment: 'Multiple weaknesses.',
      };
      mockGetStoredWeaknessProfile.mockResolvedValue(weakness);

      mockGetFlashcardStats.mockResolvedValue({
        total: 30,
        due: 15,
        byOpening: {},
      });

      const opening = buildOpeningRecord();
      mockGetWeakestOpenings.mockResolvedValue([opening]);

      const profile = buildUserProfile();
      const recs = await getTrainingRecommendations(profile);
      expect(recs).toHaveLength(3);
    });

    it('sorts recommendations by priority', async () => {
      const game = buildGameRecord({
        source: 'coach',
        coachAnalysis: 'Analysis.',
      });
      mockGamesQuery([game]);

      const weakness: WeaknessProfile = {
        computedAt: new Date().toISOString(),
        items: [
          {
            category: 'tactics',
            label: 'Forks',
            metric: '40%',
            severity: 80,
            detail: 'Forks.',
          },
        ],
        strengths: [],
        overallAssessment: 'OK.',
      };
      mockGetStoredWeaknessProfile.mockResolvedValue(weakness);

      mockGetFlashcardStats.mockResolvedValue({
        total: 20,
        due: 10,
        byOpening: {},
      });

      const profile = buildUserProfile();
      const recs = await getTrainingRecommendations(profile);
      expect(recs[0].priority).toBeLessThanOrEqual(recs[1].priority);
      expect(recs[1].priority).toBeLessThanOrEqual(recs[2].priority);
    });

    it('maps openings category to opening_review', async () => {
      const weakness: WeaknessProfile = {
        computedAt: new Date().toISOString(),
        items: [
          {
            category: 'openings',
            label: 'Opening Prep',
            metric: '30%',
            severity: 85,
            detail: 'Openings.',
          },
        ],
        strengths: [],
        overallAssessment: 'Openings.',
      };
      mockGetStoredWeaknessProfile.mockResolvedValue(weakness);

      const profile = buildUserProfile();
      const recs = await getTrainingRecommendations(profile);
      const openingRec = recs.find((r) => r.id === 'weakness-openings');
      expect(openingRec?.type).toBe('opening_review');
    });

    it('maps positional category to tactic_drill', async () => {
      const weakness: WeaknessProfile = {
        computedAt: new Date().toISOString(),
        items: [
          {
            category: 'positional',
            label: 'Positional Play',
            metric: '40%',
            severity: 75,
            detail: 'Positional.',
          },
        ],
        strengths: [],
        overallAssessment: 'Positional.',
      };
      mockGetStoredWeaknessProfile.mockResolvedValue(weakness);

      const profile = buildUserProfile();
      const recs = await getTrainingRecommendations(profile);
      const posRec = recs.find((r) => r.id === 'weakness-positional');
      expect(posRec?.type).toBe('tactic_drill');
    });

    it('maps endgame category to endgame_practice', async () => {
      const weakness: WeaknessProfile = {
        computedAt: new Date().toISOString(),
        items: [
          {
            category: 'endgame',
            label: 'Endgames',
            metric: '35%',
            severity: 70,
            detail: 'Endgames.',
          },
        ],
        strengths: [],
        overallAssessment: 'Endgames.',
      };
      mockGetStoredWeaknessProfile.mockResolvedValue(weakness);

      const profile = buildUserProfile();
      const recs = await getTrainingRecommendations(profile);
      const endgameRec = recs.find((r) => r.id === 'weakness-endgame');
      expect(endgameRec?.type).toBe('endgame_practice');
    });

    it('handles flashcard service failure gracefully', async () => {
      mockGetFlashcardStats.mockRejectedValue(new Error('DB error'));

      const profile = buildUserProfile();
      const recs = await getTrainingRecommendations(profile);
      const flashcard = recs.find((r) => r.type === 'flashcard_review');
      expect(flashcard).toBeUndefined();
    });

    it('handles opening service failure gracefully', async () => {
      mockGetWeakestOpenings.mockRejectedValue(new Error('DB error'));

      const profile = buildUserProfile();
      const recs = await getTrainingRecommendations(profile);
      const openingRec = recs.find((r) => r.type === 'opening_review');
      expect(openingRec).toBeUndefined();
    });

    it('handles games query failure gracefully', async () => {
      mockGamesWhere.mockReturnValue({
        equals: vi.fn().mockReturnValue({
          reverse: vi.fn().mockReturnThis(),
          sortBy: vi.fn().mockRejectedValue(new Error('DB error')),
        }),
      } as never);

      const profile = buildUserProfile();
      const recs = await getTrainingRecommendations(profile);
      const guided = recs.find((r) => r.type === 'guided_lesson');
      expect(guided).toBeUndefined();
    });
  });
});
