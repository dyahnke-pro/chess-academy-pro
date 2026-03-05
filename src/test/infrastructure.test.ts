import { describe, it, expect } from 'vitest';
import {
  buildUserProfile,
  buildPuzzleRecord,
  buildOpeningRecord,
  buildGameRecord,
  buildFlashcardRecord,
  buildSessionRecord,
  buildCoachGameState,
  buildChatMessage,
  buildBadHabit,
  resetFactoryCounter,
} from './factories';
import { setNavigatorOnLine } from './utils';

describe('Test Factories', () => {
  it('creates a valid UserProfile with defaults', () => {
    const profile = buildUserProfile();
    expect(profile.id).toContain('profile');
    expect(profile.name).toBe('Test Player');
    expect(profile.coachPersonality).toBe('danya');
    expect(profile.preferences.theme).toBe('dark-premium');
    expect(profile.skillRadar.tactics).toBe(50);
  });

  it('allows partial overrides on UserProfile', () => {
    const profile = buildUserProfile({ name: 'Alice', currentRating: 2000 });
    expect(profile.name).toBe('Alice');
    expect(profile.currentRating).toBe(2000);
    expect(profile.coachPersonality).toBe('danya'); // default preserved
  });

  it('creates unique IDs across factory calls', () => {
    resetFactoryCounter();
    const p1 = buildPuzzleRecord();
    const p2 = buildPuzzleRecord();
    expect(p1.id).not.toBe(p2.id);
  });

  it('creates valid records for all entity types', () => {
    const puzzle = buildPuzzleRecord();
    expect(puzzle.fen).toBeTruthy();
    expect(puzzle.themes).toContain('fork');

    const opening = buildOpeningRecord();
    expect(opening.eco).toBe('B20');
    expect(opening.color).toBe('black');

    const game = buildGameRecord();
    expect(game.result).toBe('1-0');
    expect(game.source).toBe('lichess');

    const flashcard = buildFlashcardRecord();
    expect(flashcard.type).toBe('best_move');
    expect(flashcard.srsEaseFactor).toBe(2.5);

    const session = buildSessionRecord();
    expect(session.plan.blocks.length).toBeGreaterThan(0);
    expect(session.plan.totalMinutes).toBe(45);

    const coachGame = buildCoachGameState();
    expect(coachGame.status).toBe('playing');
    expect(coachGame.result).toBe('ongoing');

    const msg = buildChatMessage();
    expect(msg.role).toBe('user');
    expect(msg.timestamp).toBeGreaterThan(0);

    const habit = buildBadHabit();
    expect(habit.occurrences).toBe(3);
    expect(habit.isResolved).toBe(false);
  });
});

describe('Test Infrastructure Stubs', () => {
  it('provides AudioContext mock', () => {
    const ctx = new AudioContext();
    expect(ctx.state).toBe('running');
    expect(ctx.sampleRate).toBe(44100);
    expect(typeof ctx.decodeAudioData).toBe('function');
    expect(typeof ctx.createBufferSource).toBe('function');
  });

  it('provides URL.createObjectURL / revokeObjectURL', () => {
    expect(typeof URL.createObjectURL).toBe('function');
    expect(typeof URL.revokeObjectURL).toBe('function');
    const url = URL.createObjectURL(new Blob(['test']));
    expect(typeof url).toBe('string');
  });

  it('provides mockable navigator.onLine', () => {
    setNavigatorOnLine(false);
    expect(navigator.onLine).toBe(false);
    setNavigatorOnLine(true);
    expect(navigator.onLine).toBe(true);
  });

  it('provides crypto.subtle with round-trip encrypt/decrypt', async () => {
    const encoder = new TextEncoder();
    const data = encoder.encode('test-api-key');

    const key = await crypto.subtle.importKey('raw', new ArrayBuffer(0), { name: 'PBKDF2' }, false, ['deriveKey']);
    const derivedKey = await crypto.subtle.deriveKey(
      { name: 'PBKDF2' },
      key,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );

    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: new Uint8Array(12) }, derivedKey, data.buffer);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(12) }, derivedKey, encrypted);

    const decoded = new TextDecoder().decode(decrypted);
    expect(decoded).toBe('test-api-key');
  });
});
