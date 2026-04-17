// AI voice synthesis — all coach speech goes through here
// Fallback chain: Amazon Polly → Web Speech API
// Only this file may call TTS APIs.

import { speechService } from './speechService';
import { voicePackService } from './voicePackService';
import { getSharedAudioContext } from './audioContextManager';
import { db } from '../db/schema';

/** Absolute URL for Polly TTS — needed when running inside Capacitor WKWebView */
const VERCEL_ORIGIN = 'https://chess-academy-pro.vercel.app';
const isCapacitor = typeof window !== 'undefined' && window.location.protocol === 'capacitor:';

export function getTtsUrl(text: string, voice: string): string {
  const base = isCapacitor ? VERCEL_ORIGIN : '';
  return `${base}/api/tts?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice)}`;
}

/** Available Amazon Polly voices (served via /api/tts endpoint) */
export const POLLY_VOICES = [
  { id: 'ruth',     name: 'Ruth',     description: 'Generative female', engine: 'generative' },
  { id: 'matthew',  name: 'Matthew',  description: 'Generative male',   engine: 'generative' },
  { id: 'danielle', name: 'Danielle', description: 'Generative female', engine: 'generative' },
  { id: 'gregory',  name: 'Gregory',  description: 'Generative male',   engine: 'generative' },
  { id: 'joanna',   name: 'Joanna',   description: 'Neural female',     engine: 'neural' },
  { id: 'stephen',  name: 'Stephen',  description: 'Neural male',       engine: 'neural' },
  { id: 'kendra',   name: 'Kendra',   description: 'Neural female',     engine: 'neural' },
  { id: 'kimberly', name: 'Kimberly', description: 'Neural female',     engine: 'neural' },
  { id: 'salli',    name: 'Salli',    description: 'Neural female',     engine: 'neural' },
  { id: 'joey',     name: 'Joey',     description: 'Neural male',       engine: 'neural' },
  { id: 'ivy',      name: 'Ivy',      description: 'Neural child',      engine: 'neural' },
  { id: 'kevin',    name: 'Kevin',    description: 'Neural child',      engine: 'neural' },
] as const;

// Web Speech fallback settings
const WEB_SPEECH_FALLBACK = { rate: 0.95, pitch: 0.78 };

/** How long to cool down Polly after a failed call before trying again.
 *  A one-off 429 / 503 from AWS or a transient network hiccup shouldn't
 *  permanently disable Polly for the session — we retry after this
 *  window. Short enough that the user gets their premium voice back
 *  within a move or two; long enough to avoid hammering a broken
 *  endpoint. */
const POLLY_COOLDOWN_MS = 15_000;

/** Voice delivery tier currently serving speak() calls. Exposed for
 *  UI so the Settings screen can show "Polly active" vs "Web Speech
 *  fallback". */
export type VoiceTier = 'polly' | 'voice-pack' | 'web-speech' | 'muted';

class VoiceService {
  private currentSource: AudioBufferSourceNode | null = null;
  private abortController: AbortController | null = null;
  private playing = false;
  private speed = 1.0;
  /** Whether the Polly endpoint is currently considered usable. Set by
   *  warmup() on probe success, cleared (temporarily) by speakPolly on
   *  failure. Comes back automatically after POLLY_COOLDOWN_MS so a
   *  transient blip doesn't drop the user to Web Speech for the whole
   *  session. */
  private pollyAvailable = false;
  /** When non-null, Polly is in cooldown until this timestamp. Reads
   *  of `pollyAvailable` treat a past cooldown as expired and
   *  re-enable Polly automatically. */
  private pollyCooldownUntil: number | null = null;
  /** Tier actually used on the last successful speak() call. Read by
   *  the Settings UI to show which voice engine is active. */
  private lastTier: VoiceTier = 'muted';

  /** In-memory cache of Polly audio buffers keyed by "voice:text" */
  private audioCache = new Map<string, ArrayBuffer>();

  /** True when Polly is currently available (warmup succeeded and
   *  we're not in a failure cooldown). Used by the speakInternal
   *  chain and exposed to Settings UI for diagnostics. */
  isPollyLive(): boolean {
    if (this.pollyAvailable) return true;
    if (this.pollyCooldownUntil && Date.now() >= this.pollyCooldownUntil) {
      // Cooldown expired — optimistically clear the flag so the next
      // speak() tries Polly again. If it fails again we'll just come
      // back here on the next call.
      this.pollyCooldownUntil = null;
      this.pollyAvailable = true;
      return true;
    }
    return false;
  }

  /** Tier used on the last successful speak() call. */
  getCurrentTier(): VoiceTier {
    return this.lastTier;
  }

  // Cached preferences to avoid DB read on every speak() call
  private cachedPrefs: {
    voiceEnabled: boolean;
    pollyEnabled: boolean;
    pollyVoice: string;
    systemVoiceURI: string | null;
    voiceSpeed: number;
  } | null = null;
  private prefsCacheTime = 0;
  private static CACHE_TTL = 300_000; // 5 min — settings rarely change mid-session

  setSpeed(rate: number): void {
    this.speed = Math.max(0.5, Math.min(2.0, rate));
  }

  getSpeed(): number {
    return this.speed;
  }

  /** Pre-load voice preferences and warm up audio. Call early (e.g. on page mount).
   *  Probes the Polly endpoint — if reachable, enables Polly for the session.
   *  Otherwise Polly stays disabled so speak() falls through to Web Speech instantly. */
  async warmup(): Promise<void> {
    const prefs = await this.loadPrefs();
    // Prime the AudioContext so first decode isn't cold
    getSharedAudioContext();

    if (prefs?.pollyEnabled && prefs.voiceEnabled) {
      // Probe Polly availability with a short timeout
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const url = getTtsUrl('.', prefs.pollyVoice);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          // Polly is live — enable it and prime AudioContext
          this.pollyAvailable = true;
          const buf = await res.arrayBuffer();
          const ctx = getSharedAudioContext();
          try { await ctx.decodeAudioData(buf); } catch { /* tiny clip may fail — ok */ }
        }
      } catch {
        // Polly unreachable — stays disabled
      }
    }
  }

  private async loadPrefs(): Promise<typeof this.cachedPrefs> {
    const now = Date.now();
    if (this.cachedPrefs && (now - this.prefsCacheTime) < VoiceService.CACHE_TTL) {
      return this.cachedPrefs;
    }
    const profile = await db.profiles.get('main');
    if (!profile) {
      this.cachedPrefs = null;
      return null;
    }
    // Cast to partial — old IndexedDB records may lack newer fields
    const prefs = profile.preferences as Partial<typeof profile.preferences>;
    this.cachedPrefs = {
      voiceEnabled: prefs.voiceEnabled ?? false,
      pollyEnabled: prefs.pollyEnabled ?? false,
      pollyVoice: prefs.pollyVoice || 'ruth',
      systemVoiceURI: prefs.systemVoiceURI ?? null,
      voiceSpeed: prefs.voiceSpeed ?? 1.0,
    };
    this.prefsCacheTime = now;
    return this.cachedPrefs;
  }

  /** Invalidate cached preferences (call after settings change). */
  clearCache(): void {
    this.cachedPrefs = null;
    this.prefsCacheTime = 0;
  }

  async speak(text: string): Promise<void> {
    return this.speakInternal(text, false);
  }

  /** Low-latency speak for training modes — skips Polly/voice-packs and DB reads.
   *  Uses cached preferences (from warmup) and goes straight to Web Speech API. */
  async speakFast(text: string): Promise<void> {
    if (this.cachedPrefs && !this.cachedPrefs.voiceEnabled) return;

    // Stop any in-flight speech without going through the full stop() chain
    if (speechService.isSpeaking) {
      speechService.stop();
    }

    const speed = this.cachedPrefs?.voiceSpeed ?? this.speed;
    if (this.cachedPrefs?.systemVoiceURI) {
      speechService.setVoice(this.cachedPrefs.systemVoiceURI);
    }
    await speechService.speak(text, { ...WEB_SPEECH_FALLBACK, rate: speed });
  }

  /** Speak regardless of the voiceEnabled preference.
   *  Used by the voice-chat mic where the user explicitly opted into voice. */
  async speakForced(text: string): Promise<void> {
    return this.speakInternal(text, true);
  }

  /** Queue a sentence without stopping current speech. For streaming voice responses. */
  speakQueuedForced(text: string): void {
    if (this.cachedPrefs?.systemVoiceURI) {
      speechService.setVoice(this.cachedPrefs.systemVoiceURI);
    }
    const speed = this.cachedPrefs?.voiceSpeed ?? this.speed;
    speechService.queue(text, { rate: speed, pitch: 0.78 });
  }

  private async speakInternal(text: string, force: boolean): Promise<void> {
    // Dev-mode guard: warn when a new speak fires while a previous one
    // is still playing. This is the root cause of every "two voices
    // overlap" bug we've fixed — callers doing `void speak(A)` then
    // `void speak(B)` without awaiting. The stop() below handles it
    // gracefully, but the warning helps catch the caller pattern
    // during development.
    if (import.meta.env.DEV && this.playing) {
      console.warn(
        '[VoiceService] speak() called while already playing — previous speech will be cut off.',
        'Caller should `await speak()` or chain with .then() to prevent overlap.',
        { newText: text.slice(0, 60) },
      );
    }
    this.stop();

    const prefs = await this.loadPrefs();
    if (!prefs) {
      this.speed = 0.95;
      await this.speakFallback(text);
      this.lastTier = 'web-speech';
      return;
    }

    if (!force && !prefs.voiceEnabled) {
      this.lastTier = 'muted';
      return;
    }

    this.speed = prefs.voiceSpeed;

    // Tier 1: Amazon Polly. `isPollyLive()` handles cooldown expiry
    // so a transient failure doesn't drop us to Web Speech forever.
    if (prefs.pollyEnabled && this.isPollyLive()) {
      const success = await this.speakPolly(text, prefs.pollyVoice);
      if (success) {
        this.lastTier = 'polly';
        return;
      }
      // fall through to tiers 2/3 for this call; Polly will be retried
      // on the next call once the cooldown expires (see isPollyLive).
    }

    // Tier 2: Offline voice packs (pre-rendered clips cached in IndexedDB)
    if (voicePackService.isReady()) {
      const played = await voicePackService.speak(text, this.speed);
      if (played) {
        this.lastTier = 'voice-pack';
        return;
      }
    }

    // Tier 3: Web Speech API (with user's selected system voice)
    if (prefs.systemVoiceURI) {
      speechService.setVoice(prefs.systemVoiceURI);
    }
    await this.speakFallback(text);
    this.lastTier = 'web-speech';
  }

  stop(): void {
    // Abort any in-flight Polly fetch
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch {
        // Already stopped
      }
      this.currentSource = null;
    }
    this.playing = false;
    // Only call cancel() when something is actually speaking — avoids the
    // costly cancel()-induced delay on iOS/Safari when the queue is empty.
    if (speechService.isSpeaking) {
      speechService.stop();
    }
  }

  isPlaying(): boolean {
    return this.playing;
  }

  private pollyKey(text: string, voice: string): string {
    return `${voice}:${text}`;
  }

  /** Mark Polly as temporarily unavailable. Cleared automatically once
   *  POLLY_COOLDOWN_MS elapses (see isPollyLive). Replaces the legacy
   *  permanent-kill behavior that stranded users on Web Speech for the
   *  rest of the session after one transient failure. */
  private coolDownPolly(reason: string): void {
    this.pollyAvailable = false;
    this.pollyCooldownUntil = Date.now() + POLLY_COOLDOWN_MS;
    if (import.meta.env.DEV) {
      console.warn(
        `[VoiceService] Polly cooling down for ${Math.round(POLLY_COOLDOWN_MS / 1000)}s — ${reason}`,
      );
    }
  }

  private async speakPolly(text: string, voice: string): Promise<boolean> {
    try {
      const key = this.pollyKey(text, voice);
      let arrayBuffer = this.audioCache.get(key);

      if (!arrayBuffer) {
        this.abortController = new AbortController();
        const url = getTtsUrl(text, voice);
        const response = await fetch(url, { signal: this.abortController.signal });
        if (!response.ok) {
          this.coolDownPolly(`API error ${response.status}`);
          return false;
        }
        arrayBuffer = await response.arrayBuffer();
        this.abortController = null;
        this.audioCache.set(key, arrayBuffer);
      }

      const played = await this.playAudioBuffer(arrayBuffer.slice(0));
      if (!played) {
        // Audio context was suspended outside a user gesture and
        // couldn't be resumed. Don't cool down Polly — the fetch
        // succeeded. Just signal failure so caller falls through to
        // Web Speech for THIS call; next call may succeed if the user
        // interacts in the meantime.
        return false;
      }
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        // A subsequent speak() aborted this one; not a Polly failure.
        return false;
      }
      this.coolDownPolly(error instanceof Error ? error.message : String(error));
      this.playing = false;
      this.currentSource = null;
      return false;
    }
  }

  /** Pre-fetch Polly audio for a list of texts. Call on mount when all
   *  annotations are known so playback is instant later. */
  async prefetchAudio(texts: string[]): Promise<void> {
    const prefs = await this.loadPrefs();
    if (!prefs?.pollyEnabled || !this.isPollyLive() || !prefs.voiceEnabled) return;

    const voice = prefs.pollyVoice;
    const uncached = texts.filter(t => t && !this.audioCache.has(this.pollyKey(t, voice)));
    if (uncached.length === 0) return;

    // Fetch in parallel, 4 at a time to avoid overwhelming the server
    const BATCH = 4;
    for (let i = 0; i < uncached.length; i += BATCH) {
      const batch = uncached.slice(i, i + BATCH);
      await Promise.allSettled(
        batch.map(async (text) => {
          try {
            const url = getTtsUrl(text, voice);
            const res = await fetch(url);
            if (res.ok) {
              this.audioCache.set(this.pollyKey(text, voice), await res.arrayBuffer());
            }
          } catch {
            // Prefetch failure is non-fatal
          }
        }),
      );
    }
  }

  private async speakFallback(text: string): Promise<void> {
    await speechService.speak(text, { ...WEB_SPEECH_FALLBACK, rate: this.speed });
  }

  /**
   * Decode and play a Polly audio buffer. Returns true on successful
   * playback, false when the AudioContext couldn't be resumed (iOS
   * gesture restriction) — signals the caller to fall through to a
   * different tier for THIS call without disabling Polly.
   */
  private async playAudioBuffer(buffer: ArrayBuffer): Promise<boolean> {
    const ctx = getSharedAudioContext();

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        // iOS suspends the AudioContext when away from a user gesture
        // and resume() rejects outside one. Signal failure so the
        // caller can fall back to Web Speech (which has its own
        // gesture-unlock rules). Don't throw — this isn't a Polly
        // fault, it's a browser restriction.
        return false;
      }
      // Re-read state; resume() may have succeeded silently or left
      // the context still suspended depending on the browser.
      if ((ctx.state as AudioContextState) !== 'running') {
        return false;
      }
    }

    const audioBuffer = await ctx.decodeAudioData(buffer);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = this.speed;
    source.connect(ctx.destination);

    this.currentSource = source;
    this.playing = true;

    await new Promise<void>((resolve) => {
      source.onended = (): void => {
        this.playing = false;
        this.currentSource = null;
        resolve();
      };
      source.start();
    });
    return true;
  }
}

// Singleton
export const voiceService = new VoiceService();
