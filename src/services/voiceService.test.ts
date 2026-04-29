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
    // Web Speech is currently kill-switched (WEB_SPEECH_FALLBACK_ENABLED
    // = false in voiceService.ts) because the sentence-streaming
    // pattern was firing Polly AND Web Speech on the same content,
    // producing overlapping coach voices. Until the dual-engine
    // queueing is repaired, `speakFallback` is a no-op — it does NOT
    // call speechService.speak. These tests verify:
    //   1. The code path reaches the fallback tier (via getCurrentTier
    //      === 'web-speech'), so the tier resolution still works.
    //   2. setVoice IS still called when systemVoiceURI is set (it
    //      runs before the kill-switched speak).
    //   3. speechService.speak is NOT called — if a future PR removes
    //      the kill-switch without first fixing the dual-engine bug,
    //      these assertions will trip and force the author to re-read
    //      the comment in voiceService.ts.

    it('reaches web-speech tier when no profile exists', async () => {
      // No profile in DB at all
      await voiceService.speak('Hello world');

      // Path reached the web-speech tier (the no-prefs branch sets
      // lastTier to 'web-speech' before calling speakFallback).
      expect(voiceService.getCurrentTier()).toBe('web-speech');
      // Kill-switch in effect: speech was NOT actually emitted.
      expect(speechService.speak).not.toHaveBeenCalled();
    });

    it('returns muted when voiceEnabled is false', async () => {
      const profile = buildUserProfile({
        id: 'main',
        preferences: { voiceEnabled: false },
      });
      await db.profiles.put(profile);

      await voiceService.speak('Test speech');

      // When voiceEnabled is false, the service returns early without speaking
      expect(speechService.speak).not.toHaveBeenCalled();
    });

    it('reaches web-speech tier when Polly is disabled', async () => {
      const profile = buildUserProfile({
        id: 'main',
        preferences: {
          voiceEnabled: true,
          pollyEnabled: false,
        },
      });
      await db.profiles.put(profile);

      await voiceService.speak('Fallback test');

      expect(voiceService.getCurrentTier()).toBe('web-speech');
      expect(speechService.speak).not.toHaveBeenCalled();
    });

    it('reaches web-speech tier when Polly API returns error', async () => {
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

      // Polly failed → cooldown → fall through to web-speech tier.
      expect(voiceService.getCurrentTier()).toBe('web-speech');
      expect(speechService.speak).not.toHaveBeenCalled();
    });

    it('reaches web-speech tier when fetch throws a network error', async () => {
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

      expect(voiceService.getCurrentTier()).toBe('web-speech');
      expect(speechService.speak).not.toHaveBeenCalled();
    });

    it('still applies system voice URI when set in preferences', async () => {
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

      // setVoice IS called even with the speak kill-switch on — it
      // runs before speakFallback. When the kill-switch is removed,
      // the configured voice is already primed.
      expect(speechService.setVoice).toHaveBeenCalledWith('Microsoft Aria Online (Natural)');
      expect(voiceService.getCurrentTier()).toBe('web-speech');
      expect(speechService.speak).not.toHaveBeenCalled();
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

  describe('tier reporting', () => {
    it('exposes isPollyLive() for the Settings indicator', () => {
      // Starts false by default (warmup hasn't probed yet in a fresh
      // test environment).
      expect(voiceService.isPollyLive()).toBe(false);
    });

    it('getCurrentTier() reports web-speech after a fallback speak', async () => {
      const profile = buildUserProfile({ id: 'main' });
      profile.preferences.voiceEnabled = true;
      profile.preferences.pollyEnabled = false;
      await db.profiles.put(profile);

      await voiceService.speak('Hello');
      expect(voiceService.getCurrentTier()).toBe('web-speech');
    });

    it('getCurrentTier() reports "muted" when voice is disabled', async () => {
      const profile = buildUserProfile({ id: 'main' });
      profile.preferences.voiceEnabled = false;
      await db.profiles.put(profile);

      await voiceService.speak('Hello');
      expect(voiceService.getCurrentTier()).toBe('muted');
    });
  });
});
