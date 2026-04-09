import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../db/schema';
import { buildUserProfile } from '../test/factories';
import { speechService } from './speechService';

// We need a fresh instance for each test since voiceService is a singleton.
// Re-import the module to get the singleton.
let voiceService: typeof import('./voiceService').voiceService;

describe('voiceService', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    vi.restoreAllMocks();

    // Spy on speechService methods before each test
    vi.spyOn(speechService, 'speak').mockImplementation(() => undefined);
    vi.spyOn(speechService, 'stop').mockImplementation(() => undefined);
    vi.spyOn(speechService, 'setVoice').mockImplementation(() => undefined);

    // Re-import to get the singleton (it persists state between tests)
    const mod = await import('./voiceService');
    voiceService = mod.voiceService;
    voiceService.clearCache();
  });

  describe('fallback to speechService', () => {
    it('falls back when no profile exists', async () => {
      // No profile in DB at all
      await voiceService.speak('Hello world');

      expect(speechService.speak).toHaveBeenCalledWith(
        'Hello world',
        expect.objectContaining({ rate: 0.95, pitch: 0.78 }),
      );
    });

    it('falls back when voiceEnabled is false', async () => {
      const profile = buildUserProfile({
        id: 'main',
        preferences: { voiceEnabled: false },
      });
      await db.profiles.put(profile);

      await voiceService.speak('Test speech');

      // When voiceEnabled is false, the service returns early without speaking
      expect(speechService.speak).not.toHaveBeenCalled();
    });

    it('falls back when Polly is disabled', async () => {
      const profile = buildUserProfile({
        id: 'main',
        preferences: {
          voiceEnabled: true,
          pollyEnabled: false,
        },
      });
      await db.profiles.put(profile);

      await voiceService.speak('Fallback test');

      expect(speechService.speak).toHaveBeenCalledWith(
        'Fallback test',
        expect.objectContaining({ rate: 1.0, pitch: 0.78 }),
      );
    });

    it('falls back when Polly API returns error', async () => {
      const profile = buildUserProfile({
        id: 'main',
        preferences: {
          voiceEnabled: true,
          pollyEnabled: true,
        },
      });
      await db.profiles.put(profile);

      // Mock fetch to return an error from Polly
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      await voiceService.speak('Error fallback');

      expect(speechService.speak).toHaveBeenCalledWith(
        'Error fallback',
        expect.objectContaining({ rate: 1.0, pitch: 0.78 }),
      );
    });

    it('falls back when fetch throws a network error', async () => {
      const profile = buildUserProfile({
        id: 'main',
        preferences: {
          voiceEnabled: true,
          pollyEnabled: true,
        },
      });
      await db.profiles.put(profile);

      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network offline'));

      await voiceService.speak('Network fail');

      expect(speechService.speak).toHaveBeenCalledWith(
        'Network fail',
        expect.objectContaining({ rate: 1.0, pitch: 0.78 }),
      );
    });

    it('uses system voice URI when set in preferences', async () => {
      const profile = buildUserProfile({
        id: 'main',
        preferences: {
          voiceEnabled: true,
          pollyEnabled: false,
          systemVoiceURI: 'Microsoft Aria Online (Natural)',
        },
      });
      await db.profiles.put(profile);

      await voiceService.speak('Custom voice');

      expect(speechService.setVoice).toHaveBeenCalledWith('Microsoft Aria Online (Natural)');
      expect(speechService.speak).toHaveBeenCalled();
    });
  });

  describe('setSpeed', () => {
    it('sets speed within valid range', () => {
      voiceService.setSpeed(1.5);
      expect(voiceService.getSpeed()).toBe(1.5);
    });

    it('clamps speed to minimum of 0.5', () => {
      voiceService.setSpeed(0.1);
      expect(voiceService.getSpeed()).toBe(0.5);
    });

    it('clamps speed to maximum of 2.0', () => {
      voiceService.setSpeed(3.0);
      expect(voiceService.getSpeed()).toBe(2.0);
    });

    it('clamps negative speed to 0.5', () => {
      voiceService.setSpeed(-1);
      expect(voiceService.getSpeed()).toBe(0.5);
    });

    it('accepts boundary value 0.5', () => {
      voiceService.setSpeed(0.5);
      expect(voiceService.getSpeed()).toBe(0.5);
    });

    it('accepts boundary value 2.0', () => {
      voiceService.setSpeed(2.0);
      expect(voiceService.getSpeed()).toBe(2.0);
    });
  });

  describe('stop cleanup', () => {
    it('stops and resets playing state', () => {
      voiceService.stop();
      expect(voiceService.isPlaying()).toBe(false);
    });

    it('skips speechService.stop when nothing is speaking', () => {
      vi.spyOn(speechService, 'isSpeaking', 'get').mockReturnValue(false);
      voiceService.stop();
      expect(speechService.stop).not.toHaveBeenCalled();
    });

    it('calls speechService.stop when speech is active', () => {
      vi.spyOn(speechService, 'isSpeaking', 'get').mockReturnValue(true);
      voiceService.stop();
      expect(speechService.stop).toHaveBeenCalled();
    });

    it('can be called multiple times safely', () => {
      voiceService.stop();
      voiceService.stop();
      voiceService.stop();
      expect(voiceService.isPlaying()).toBe(false);
    });
  });
});
