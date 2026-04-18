import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCoachMemory,
  addCoachMemoryNote,
  buildCoachMemoryBlock,
  extractAndRememberNotes,
  MAX_NOTES,
  MAX_NOTE_LENGTH,
} from './coachMemoryService';
import { db } from '../db/schema';
import type { UserProfile } from '../types';

const BASELINE_PROFILE: UserProfile = {
  id: 'main',
  name: 'Test',
  currentRating: 1200,
  level: 'beginner',
  badHabits: [],
  skillRadar: { opening: 0, tactics: 0, endgame: 0, calculation: 0, memory: 0 },
  createdAt: new Date().toISOString(),
  preferences: {
    theme: 'dark',
    boardColor: 'neon',
    pieceSet: 'alpha',
    showEvalBar: true,
    showEngineLines: false,
    soundEnabled: true,
    voiceEnabled: true,
    dailySessionMinutes: 30,
    aiProvider: 'deepseek',
    apiKeyEncrypted: null,
    apiKeyIv: null,
    anthropicApiKeyEncrypted: null,
    anthropicApiKeyIv: null,
    preferredModel: { commentary: '', analysis: '', reports: '' },
    monthlyBudgetCap: null,
    estimatedSpend: 0,
    elevenlabsKeyEncrypted: null,
    elevenlabsKeyIv: null,
    elevenlabsVoiceId: null,
    pollyEnabled: false,
    pollyVoice: 'ruth',
    voiceSpeed: 1,
    kokoroEnabled: false,
    kokoroVoiceId: '',
    systemVoiceURI: null,
    highlightLastMove: true,
    showLegalMoves: true,
    showCoordinates: true,
    pieceAnimationSpeed: 'normal',
    boardOrientation: true,
    moveQualityFlash: true,
    showHints: true,
    moveMethod: 'both',
    moveConfirmation: false,
    autoPromoteQueen: true,
    masterAllOff: false,
  },
} as unknown as UserProfile;

describe('coachMemoryService', () => {
  beforeEach(async () => {
    await db.profiles.clear();
    await db.profiles.put({ ...BASELINE_PROFILE });
  });

  it('returns an empty list before any notes are written', async () => {
    const notes = await getCoachMemory();
    expect(notes).toEqual([]);
  });

  it('appends notes to the profile', async () => {
    await addCoachMemoryNote('Student struggles with endgames');
    await addCoachMemoryNote('Prefers aggressive openings');
    const notes = await getCoachMemory();
    expect(notes).toEqual([
      'Student struggles with endgames',
      'Prefers aggressive openings',
    ]);
  });

  it('skips exact duplicate notes (case-insensitive)', async () => {
    await addCoachMemoryNote('Struggles with back-rank tactics');
    await addCoachMemoryNote('STRUGGLES WITH BACK-RANK TACTICS');
    const notes = await getCoachMemory();
    expect(notes).toHaveLength(1);
  });

  it('trims notes to MAX_NOTE_LENGTH characters', async () => {
    const longNote = 'a'.repeat(MAX_NOTE_LENGTH + 50);
    await addCoachMemoryNote(longNote);
    const notes = await getCoachMemory();
    expect(notes[0].length).toBe(MAX_NOTE_LENGTH);
  });

  it('drops oldest notes when the list exceeds MAX_NOTES', async () => {
    for (let i = 0; i < MAX_NOTES + 5; i++) {
      await addCoachMemoryNote(`note ${i}`);
    }
    const notes = await getCoachMemory();
    expect(notes).toHaveLength(MAX_NOTES);
    expect(notes[0]).toBe('note 5');
    expect(notes[notes.length - 1]).toBe(`note ${MAX_NOTES + 4}`);
  });

  it('no-ops when the profile does not exist', async () => {
    await db.profiles.clear();
    // Should not throw.
    await addCoachMemoryNote('ignored');
    const notes = await getCoachMemory();
    expect(notes).toEqual([]);
  });

  it('buildCoachMemoryBlock returns empty string when no notes', async () => {
    expect(await buildCoachMemoryBlock()).toBe('');
  });

  it('buildCoachMemoryBlock formats notes as a bulleted block', async () => {
    await addCoachMemoryNote('Rating ~1200 for 3 months');
    await addCoachMemoryNote('Working on Sicilian Najdorf');
    const block = await buildCoachMemoryBlock();
    expect(block).toContain("Coach's memory");
    expect(block).toContain('- Rating ~1200 for 3 months');
    expect(block).toContain('- Working on Sicilian Najdorf');
  });

  describe('extractAndRememberNotes', () => {
    it('strips a single [[REMEMBER:]] tag and returns cleaned text', () => {
      const cleaned = extractAndRememberNotes(
        "Good move! [[REMEMBER: Student is improving with the Italian Game.]] Let's keep it up.",
      );
      expect(cleaned).not.toContain('REMEMBER');
      expect(cleaned).not.toContain('[[');
      expect(cleaned).toBe("Good move! Let's keep it up.");
    });

    it('strips multiple tags from one message', () => {
      const cleaned = extractAndRememberNotes(
        'Nice. [[REMEMBER: Good calculation.]] Also [[REMEMBER: Time pressure is a factor.]] Keep going.',
      );
      expect(cleaned).toBe('Nice. Also Keep going.');
    });

    it('returns text unchanged when no tags are present', () => {
      const input = 'Your knight looks strong on c6.';
      expect(extractAndRememberNotes(input)).toBe(input);
    });
  });
});
