import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../db/schema';
import { buildUserProfile } from '../test/factories';
import { speechService } from './speechService';
import { kokoroService } from './kokoroService';

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

    // Spy on kokoroService methods
    vi.spyOn(kokoroService, 'isReady').mockReturnValue(false);
    vi.spyOn(kokoroService, 'speak').mockResolvedValue(undefined);
    vi.spyOn(kokoroService, 'stop').mockImplementation(() => undefined);
    vi.spyOn(kokoroService, 'isPlaying').mockReturnValue(false);

    // Re-import to get the singleton (it persists state between tests)
    const mod = await import('./voiceService');
    voiceService = mod.voiceService;
  });

  describe('fallback to speechService', () => {
    it('falls back when no profile exists', async () => {
      // No profile in DB at all
      await voiceService.speak('Hello world');

      // eslint-disable-next-line @typescript-eslint/unbound-method
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
      // speechService.speak should NOT be called because it returns before fallback
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(speechService.speak).not.toHaveBeenCalled();
    });

    it('falls back when no ElevenLabs API key is set and Kokoro not ready', async () => {
      const profile = buildUserProfile({
        id: 'main',
        preferences: {
          voiceEnabled: true,
          elevenlabsKeyEncrypted: null,
          elevenlabsKeyIv: null,
          kokoroEnabled: false,
        },
      });
      await db.profiles.put(profile);

      await voiceService.speak('Fallback test');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(speechService.speak).toHaveBeenCalledWith(
        'Fallback test',
        expect.objectContaining({ rate: 0.95, pitch: 0.78 }),
      );
    });

    it('falls back when ElevenLabs API returns error and Kokoro not ready', async () => {
      const profile = buildUserProfile({
        id: 'main',
        preferences: {
          voiceEnabled: true,
          elevenlabsKeyEncrypted: 'fakekey',
          elevenlabsKeyIv: 'fakeiv',
          kokoroEnabled: false,
        },
      });
      await db.profiles.put(profile);

      // Mock decryptApiKey to return a key
      vi.mock('./cryptoService', () => ({
        decryptApiKey: vi.fn().mockResolvedValue('test-api-key'),
      }));

      // Mock fetch to return an error from ElevenLabs
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 401,
      } as Response);

      await voiceService.speak('Error fallback');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(speechService.speak).toHaveBeenCalledWith(
        'Error fallback',
        expect.objectContaining({ rate: 0.95, pitch: 0.78 }),
      );
    });

    it('falls back when fetch throws a network error', async () => {
      const profile = buildUserProfile({
        id: 'main',
        preferences: {
          voiceEnabled: true,
          elevenlabsKeyEncrypted: 'fakekey',
          elevenlabsKeyIv: 'fakeiv',
          kokoroEnabled: false,
        },
      });
      await db.profiles.put(profile);

      vi.mock('./cryptoService', () => ({
        decryptApiKey: vi.fn().mockResolvedValue('test-api-key'),
      }));

      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network offline'));

      await voiceService.speak('Network fail');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(speechService.speak).toHaveBeenCalledWith(
        'Network fail',
        expect.objectContaining({ rate: 0.95, pitch: 0.78 }),
      );
    });
  });

  describe('Kokoro fallback tier', () => {
    it('uses Kokoro when enabled and ready, no ElevenLabs key', async () => {
      vi.spyOn(kokoroService, 'isReady').mockReturnValue(true);

      const profile = buildUserProfile({
        id: 'main',
        preferences: {
          voiceEnabled: true,
          elevenlabsKeyEncrypted: null,
          elevenlabsKeyIv: null,
          kokoroEnabled: true,
          kokoroVoiceId: 'bm_daniel',
        },
      });
      await db.profiles.put(profile);

      await voiceService.speak('Kokoro test');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(kokoroService.speak).toHaveBeenCalledWith('Kokoro test', 'bm_daniel', expect.any(Number));
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(speechService.speak).not.toHaveBeenCalled();
    });

    it('skips Kokoro when not ready', async () => {
      vi.spyOn(kokoroService, 'isReady').mockReturnValue(false);

      const profile = buildUserProfile({
        id: 'main',
        preferences: {
          voiceEnabled: true,
          elevenlabsKeyEncrypted: null,
          elevenlabsKeyIv: null,
          kokoroEnabled: true,
        },
      });
      await db.profiles.put(profile);

      await voiceService.speak('Skip kokoro');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(kokoroService.speak).not.toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(speechService.speak).toHaveBeenCalled();
    });

    it('skips Kokoro when disabled in preferences', async () => {
      vi.spyOn(kokoroService, 'isReady').mockReturnValue(true);

      const profile = buildUserProfile({
        id: 'main',
        preferences: {
          voiceEnabled: true,
          elevenlabsKeyEncrypted: null,
          elevenlabsKeyIv: null,
          kokoroEnabled: false,
        },
      });
      await db.profiles.put(profile);

      await voiceService.speak('Kokoro disabled');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(kokoroService.speak).not.toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(speechService.speak).toHaveBeenCalled();
    });

    it('falls back to Web Speech when Kokoro throws', async () => {
      vi.spyOn(kokoroService, 'isReady').mockReturnValue(true);
      vi.spyOn(kokoroService, 'speak').mockRejectedValue(new Error('Kokoro error'));

      const profile = buildUserProfile({
        id: 'main',
        preferences: {
          voiceEnabled: true,
          elevenlabsKeyEncrypted: null,
          elevenlabsKeyIv: null,
          kokoroEnabled: true,
        },
      });
      await db.profiles.put(profile);

      await voiceService.speak('Kokoro fail');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(speechService.speak).toHaveBeenCalledWith(
        'Kokoro fail',
        expect.objectContaining({ rate: 0.95, pitch: 0.78 }),
      );
    });
  });

  describe('speakNow (cache-based)', () => {
    it('calls speakNow without throwing', () => {
      expect(() => voiceService.speakNow('Cache test')).not.toThrow();
    });

    it('does not call Web Speech directly', () => {
      voiceService.speakNow('No fallback test');

      // speakNow uses IndexedDB cache only — no Web Speech fallback
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(speechService.speak).not.toHaveBeenCalled();
    });

    it('does not call Kokoro directly', () => {
      vi.spyOn(kokoroService, 'isReady').mockReturnValue(true);

      voiceService.speakNow('No kokoro test');

      // speakNow plays from cache — does not call Kokoro generate
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(kokoroService.speak).not.toHaveBeenCalled();
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

    it('calls speechService.stop and kokoroService.stop on stop', () => {
      voiceService.stop();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(speechService.stop).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(kokoroService.stop).toHaveBeenCalled();
    });

    it('can be called multiple times safely', () => {
      voiceService.stop();
      voiceService.stop();
      voiceService.stop();
      expect(voiceService.isPlaying()).toBe(false);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(speechService.stop).toHaveBeenCalledTimes(3);
    });
  });
});
