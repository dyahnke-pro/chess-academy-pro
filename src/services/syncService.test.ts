import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { importUserData } from './syncService';
import type { UserProfile } from '../types';

function createProfile(): UserProfile {
  return {
    id: 'main',
    name: 'SyncTest',
    isKidMode: false,
    currentRating: 1400,
    puzzleRating: 1400,
    xp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    streakFreezes: 0,
    lastActiveDate: '2026-03-04',
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
      apiKeyEncrypted: null,
      apiKeyIv: null,
      preferredModel: { commentary: 'haiku', analysis: 'sonnet', reports: 'opus' },
      monthlyBudgetCap: null,
      estimatedSpend: 0,
      elevenlabsKeyEncrypted: null,
      elevenlabsKeyIv: null,
      elevenlabsVoiceId: null,
      voiceSpeed: 1.0,
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
  };
}

describe('syncService', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  describe('importUserData', () => {
    it('imports profiles from JSON', async () => {
      const profile = createProfile();
      const json = JSON.stringify({ profiles: [profile] });

      await importUserData(json);

      const imported = await db.profiles.get('main');
      expect(imported).toBeDefined();
      expect(imported?.name).toBe('SyncTest');
    });

    it('imports sessions from JSON', async () => {
      const json = JSON.stringify({
        sessions: [{
          id: 's1',
          date: '2026-03-04',
          profileId: 'main',
          durationMinutes: 30,
          plan: { blocks: [], totalMinutes: 30 },
          completed: true,
          puzzlesSolved: 5,
          puzzleAccuracy: 80,
          xpEarned: 50,
          coachSummary: null,
        }],
      });

      await importUserData(json);

      const sessions = await db.sessions.toArray();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe('s1');
    });

    it('merges data by id (put, not add)', async () => {
      const profile = createProfile();
      await db.profiles.put(profile);

      const updated = { ...profile, name: 'Updated' };
      const json = JSON.stringify({ profiles: [updated] });

      await importUserData(json);

      const result = await db.profiles.get('main');
      expect(result?.name).toBe('Updated');
    });

    it('handles empty JSON gracefully', async () => {
      await importUserData('{}');
      const profiles = await db.profiles.toArray();
      expect(profiles).toHaveLength(0);
    });

    it('imports flashcards', async () => {
      const json = JSON.stringify({
        flashcards: [{
          id: 'fc1',
          openingId: 'op1',
          type: 'best_move',
          questionFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          questionText: 'What is the best move?',
          answerMove: 'e4',
          answerText: 'e4 is the best move',
          srsInterval: 1,
          srsEaseFactor: 2.5,
          srsRepetitions: 0,
          srsDueDate: '2026-03-04',
          srsLastReview: null,
        }],
      });

      await importUserData(json);

      const cards = await db.flashcards.toArray();
      expect(cards).toHaveLength(1);
    });
  });
});
