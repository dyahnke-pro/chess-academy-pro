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

    // 2026-05-19: David reported rapid-Next-press triggers 3+ audio
    // elements playing simultaneously. Root cause was
    // `currentAudioElement` only being set AFTER the sourceOpen
    // await — so a stop() during the await found null and let a
    // racing audio through. Verify the generation counter bumps on
    // every stop (so the race-window check inside playAudioFromStream
    // can detect supersession).
    it('bumps stopGeneration on every stop() (race-window detector for rapid-clicks)', () => {
      const before = voiceService.currentStopGeneration;
      voiceService.stop();
      voiceService.stop();
      voiceService.stop();
      const after = voiceService.currentStopGeneration;
      expect(after).toBe(before + 3);
    });

    it('preserves stopGeneration monotonicity across mixed speak/stop sequences', () => {
      const gens = [voiceService.currentStopGeneration];
      // Sequence mimicking a user mashing Next: speak(), stop(),
      // speak(), stop(), speak(), stop().
      // Speak invokes stop() internally, so each pair bumps by 1.
      voiceService.stop();
      gens.push(voiceService.currentStopGeneration);
      voiceService.stop();
      gens.push(voiceService.currentStopGeneration);
      voiceService.stop();
      gens.push(voiceService.currentStopGeneration);
      for (let i = 1; i < gens.length; i++) {
        expect(gens[i]).toBeGreaterThan(gens[i - 1]);
      }
    });
  });

  describe('canStreamProgressivePlaybackFor (UA + capability matrix)', () => {
    // User-agent fixtures captured from real devices. These don't
    // need to be exhaustive — they're representative of each platform
    // family the streaming gate is supposed to admit or exclude.
    const UA = {
      desktopChrome: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      desktopFirefox: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0',
      desktopSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
      androidChrome: 'Mozilla/5.0 (Linux; Android 14; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
      androidFirefox: 'Mozilla/5.0 (Android 14; Mobile; rv:128.0) Gecko/128.0 Firefox/128.0',
      androidSamsung: 'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/24.0 Chrome/115.0.0.0 Mobile Safari/537.36',
      iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
      ipad: 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
      ipadDesktopMode: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
    };
    const yesMpeg = (t: string) => t === 'audio/mpeg';
    const noMpeg = () => false;
    const fakeMMS = (supported: boolean): { new (): MediaSource; isTypeSupported: (t: string) => boolean } => {
      const ctor = function FakeMMS(this: object) { /* noop */ } as unknown as { new (): MediaSource; isTypeSupported: (t: string) => boolean };
      (ctor as unknown as { isTypeSupported: (t: string) => boolean }).isTypeSupported = (t: string) => supported && t === 'audio/mpeg';
      return ctor;
    };

    it('Android Chrome → streams (matches desktop)', async () => {
      const { canStreamProgressivePlaybackFor } = await import('./voiceService');
      expect(canStreamProgressivePlaybackFor(true, yesMpeg, null, UA.androidChrome, false)).toBe(true);
    });

    it('Android Firefox → streams', async () => {
      const { canStreamProgressivePlaybackFor } = await import('./voiceService');
      expect(canStreamProgressivePlaybackFor(true, yesMpeg, null, UA.androidFirefox, false)).toBe(true);
    });

    it('Android Samsung Internet → streams', async () => {
      const { canStreamProgressivePlaybackFor } = await import('./voiceService');
      expect(canStreamProgressivePlaybackFor(true, yesMpeg, null, UA.androidSamsung, false)).toBe(true);
    });

    it('desktop Chrome / Firefox / Safari → streams', async () => {
      const { canStreamProgressivePlaybackFor } = await import('./voiceService');
      expect(canStreamProgressivePlaybackFor(true, yesMpeg, null, UA.desktopChrome, false)).toBe(true);
      expect(canStreamProgressivePlaybackFor(true, yesMpeg, null, UA.desktopFirefox, false)).toBe(true);
      expect(canStreamProgressivePlaybackFor(true, yesMpeg, null, UA.desktopSafari, false)).toBe(true);
    });

    it('iPhone with ManagedMediaSource (iOS 17.1+) → streams via the MMS branch', async () => {
      const { canStreamProgressivePlaybackFor } = await import('./voiceService');
      expect(canStreamProgressivePlaybackFor(true, yesMpeg, fakeMMS(true), UA.iphone, false)).toBe(true);
    });

    it('iPhone without ManagedMediaSource (iOS < 17.1) → falls back to buffered (bare MediaSource is restricted)', async () => {
      const { canStreamProgressivePlaybackFor } = await import('./voiceService');
      expect(canStreamProgressivePlaybackFor(true, yesMpeg, null, UA.iphone, false)).toBe(false);
    });

    it('iPad desktop-mode (UA looks like Mac) + touchend → detected as iOS, falls back', async () => {
      const { canStreamProgressivePlaybackFor } = await import('./voiceService');
      expect(canStreamProgressivePlaybackFor(true, yesMpeg, null, UA.ipadDesktopMode, true)).toBe(false);
    });

    it('any UA without MediaSource at all → falls back', async () => {
      const { canStreamProgressivePlaybackFor } = await import('./voiceService');
      expect(canStreamProgressivePlaybackFor(false, noMpeg, null, UA.desktopChrome, false)).toBe(false);
      expect(canStreamProgressivePlaybackFor(false, noMpeg, null, UA.androidChrome, false)).toBe(false);
    });

    it('MediaSource present but no audio/mpeg support → falls back', async () => {
      const { canStreamProgressivePlaybackFor } = await import('./voiceService');
      expect(canStreamProgressivePlaybackFor(true, noMpeg, null, UA.desktopChrome, false)).toBe(false);
    });
  });

  describe('getManagedMediaSource (iOS Safari 17.1+ detection)', () => {
    it('returns null when window.ManagedMediaSource is undefined (jsdom baseline)', async () => {
      const { getManagedMediaSource } = await import('./voiceService');
      // jsdom does not implement MediaSource or ManagedMediaSource.
      expect(getManagedMediaSource()).toBeNull();
    });

    it('returns the constructor when window.ManagedMediaSource is present', async () => {
      const fakeCtor = function FakeMMS(this: object) { /* noop */ } as unknown as {
        new (): MediaSource;
        isTypeSupported(type: string): boolean;
      };
      (fakeCtor as unknown as { isTypeSupported: (t: string) => boolean }).isTypeSupported = (t: string) => t === 'audio/mpeg';
      (window as unknown as { ManagedMediaSource: typeof fakeCtor }).ManagedMediaSource = fakeCtor;
      try {
        const { getManagedMediaSource } = await import('./voiceService');
        const mms = getManagedMediaSource();
        expect(mms).toBe(fakeCtor);
        expect(mms?.isTypeSupported('audio/mpeg')).toBe(true);
        expect(mms?.isTypeSupported('audio/aac')).toBe(false);
      } finally {
        delete (window as unknown as { ManagedMediaSource?: unknown }).ManagedMediaSource;
      }
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
