import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './schema';
import { getOrCreateMainProfile } from '../services/dbService';
import type { UserProfile } from '../types';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('Profiles CRUD', () => {
  it('creates a main profile with defaults', async () => {
    const profile = await getOrCreateMainProfile();
    expect(profile.id).toBe('main');
    expect(profile.isKidMode).toBe(false);
    expect(profile.coachPersonality).toBe('danya');
    expect(profile.xp).toBe(0);
    expect(profile.level).toBe(1);
    expect(profile.currentStreak).toBe(0);
  });

  it('returns the existing profile on second call', async () => {
    const first = await getOrCreateMainProfile();
    const second = await getOrCreateMainProfile();
    expect(first.id).toBe(second.id);
    // Ensure only one record exists
    const count = await db.profiles.count();
    expect(count).toBe(1);
  });

  it('updates profile fields', async () => {
    await getOrCreateMainProfile();
    await db.profiles.update('main', { xp: 500, level: 3, currentStreak: 7 });

    const updated = await db.profiles.get('main');
    expect(updated?.xp).toBe(500);
    expect(updated?.level).toBe(3);
    expect(updated?.currentStreak).toBe(7);
  });

  it('updates puzzleRating correctly', async () => {
    await getOrCreateMainProfile();
    await db.profiles.update('main', { puzzleRating: 1650 });

    const updated = await db.profiles.get('main');
    expect(updated?.puzzleRating).toBe(1650);
  });

  it('persists preferences', async () => {
    const profile = await getOrCreateMainProfile();
    const updatedPrefs = {
      ...profile.preferences,
      soundEnabled: false,
      pieceSet: '3d',
    };
    await db.profiles.update('main', { preferences: updatedPrefs });

    const updated = await db.profiles.get('main');
    expect(updated?.preferences.soundEnabled).toBe(false);
    expect(updated?.preferences.pieceSet).toBe('3d');
  });

  it('persists skill radar updates', async () => {
    await getOrCreateMainProfile();
    const newRadar = { opening: 70, tactics: 65, endgame: 55, memory: 80, calculation: 60 };
    await db.profiles.update('main', { skillRadar: newRadar });

    const updated = await db.profiles.get('main');
    expect(updated?.skillRadar.opening).toBe(70);
    expect(updated?.skillRadar.memory).toBe(80);
  });

  it('updates bad habits array', async () => {
    await getOrCreateMainProfile();
    const habit = {
      id: 'habit-1',
      description: 'Moving the same piece twice',
      occurrences: 3,
      lastSeen: new Date().toISOString().split('T')[0],
      isResolved: false,
    };
    await db.profiles.update('main', { badHabits: [habit] });

    const updated = await db.profiles.get('main');
    expect(updated?.badHabits).toHaveLength(1);
    expect(updated?.badHabits[0].description).toBe('Moving the same piece twice');
  });

  it('creates a kid profile', async () => {
    const kidProfile: UserProfile = {
      id: 'kid',
      name: 'Kid Player',
      isKidMode: true,
      coachPersonality: 'danya',
      currentRating: 600,
      puzzleRating: 600,
      xp: 0,
      level: 1,
      currentStreak: 0,
      longestStreak: 0,
      streakFreezes: 1,
      lastActiveDate: new Date().toISOString().split('T')[0],
      achievements: [],
      unlockedCoaches: ['danya'],
      skillRadar: { opening: 0, tactics: 0, endgame: 0, memory: 0, calculation: 0 },
      badHabits: [],
      preferences: {
        theme: 'classic-wood',
        boardColor: 'pink',
        pieceSet: 'cartoon',
        showEvalBar: false,
        showEngineLines: false,
        soundEnabled: true,
        voiceEnabled: true,
        dailySessionMinutes: 15,
        apiKeyEncrypted: null,
        apiKeyIv: null,
        preferredModel: {
          commentary: 'claude-haiku-4-5-20251001',
          analysis: 'claude-sonnet-4-5-20250514',
          reports: 'claude-opus-4-5-20250514',
        },
        monthlyBudgetCap: null,
        estimatedSpend: 0,
        elevenlabsKeyEncrypted: null,
        elevenlabsKeyIv: null,
        voiceIdDanya: 'pNInz6obpgDQGcFmaJgB',
        voiceIdKasparov: 'VR6AewLTigWG4xSOukaG',
        voiceIdFischer: 'TxGEqnHWrfWFTfGW9XjX',
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

    await db.profiles.add(kidProfile);
    const retrieved = await db.profiles.get('kid');
    expect(retrieved?.isKidMode).toBe(true);
    expect(retrieved?.preferences.pieceSet).toBe('cartoon');
  });

  it('updates streak correctly', async () => {
    await getOrCreateMainProfile();
    await db.profiles.update('main', { currentStreak: 5, longestStreak: 10 });

    const updated = await db.profiles.get('main');
    expect(updated?.currentStreak).toBe(5);
    expect(updated?.longestStreak).toBe(10);
  });
});
