// AI voice synthesis — all coach speech goes through here
// Fallback chain: Amazon Polly → Web Speech API
// Only this file may call TTS APIs.

import { speechService } from './speechService';
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

class VoiceService {
  private currentSource: AudioBufferSourceNode | null = null;
  private abortController: AbortController | null = null;
  private playing = false;
  private speed = 1.0;

  // Cached preferences to avoid DB read on every speak() call
  private cachedPrefs: {
    voiceEnabled: boolean;
    pollyEnabled: boolean;
    pollyVoice: string;
    systemVoiceURI: string | null;
    voiceSpeed: number;
  } | null = null;
  private prefsCacheTime = 0;
  private static CACHE_TTL = 30_000; // 30s

  setSpeed(rate: number): void {
    this.speed = Math.max(0.5, Math.min(2.0, rate));
  }

  getSpeed(): number {
    return this.speed;
  }

  /** Pre-load voice preferences and warm up audio. Call early (e.g. on page mount).
   *  When Polly is enabled, fires a silent prefetch to warm the TLS connection
   *  and serverless function so the first real speak() has no cold-start lag. */
  async warmup(): Promise<void> {
    const prefs = await this.loadPrefs();
    // Prime the AudioContext so first decode isn't cold
    getSharedAudioContext();

    // Prefetch a tiny Polly clip to warm the network path + serverless function
    if (prefs?.pollyEnabled && prefs.voiceEnabled) {
      try {
        const url = getTtsUrl(' ', prefs.pollyVoice);
        void fetch(url).then(async (res) => {
          if (res.ok) {
            // Decode the audio buffer to also prime the AudioContext decoder
            const buf = await res.arrayBuffer();
            const ctx = getSharedAudioContext();
            try { await ctx.decodeAudioData(buf); } catch { /* empty clip may fail decode — ok */ }
          }
        });
      } catch {
        // Best-effort — don't block startup
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
    this.stop();

    const prefs = await this.loadPrefs();
    if (!prefs) {
      this.speakFallback(text);
      return;
    }

    if (!prefs.voiceEnabled) return;

    this.speed = prefs.voiceSpeed;

    // Tier 1: Amazon Polly (server-side, no API key needed in browser)
    if (prefs.pollyEnabled) {
      const success = await this.speakPolly(text, prefs.pollyVoice);
      if (success) return;
    }

    // Tier 2: Web Speech API (with user's selected system voice)
    if (prefs.systemVoiceURI) {
      speechService.setVoice(prefs.systemVoiceURI);
    }
    this.speakFallback(text);
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
    speechService.stop();
  }

  isPlaying(): boolean {
    return this.playing;
  }

  private async speakPolly(text: string, voice: string): Promise<boolean> {
    try {
      this.abortController = new AbortController();
      const url = getTtsUrl(text, voice);
      const response = await fetch(url, { signal: this.abortController.signal });
      if (!response.ok) {
        console.warn('[VoiceService] Polly API error:', response.status);
        return false;
      }
      const arrayBuffer = await response.arrayBuffer();
      this.abortController = null;
      await this.playAudioBuffer(arrayBuffer);
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return false;
      }
      console.warn('[VoiceService] Polly TTS failed:', error);
      this.playing = false;
      this.currentSource = null;
      return false;
    }
  }

  private speakFallback(text: string): void {
    speechService.speak(text, WEB_SPEECH_FALLBACK);
  }

  private async playAudioBuffer(buffer: ArrayBuffer): Promise<void> {
    const ctx = getSharedAudioContext();

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const audioBuffer = await ctx.decodeAudioData(buffer);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    this.currentSource = source;
    this.playing = true;

    return new Promise<void>((resolve) => {
      source.onended = () => {
        this.playing = false;
        this.currentSource = null;
        resolve();
      };
      source.start();
    });
  }
}

// Singleton
export const voiceService = new VoiceService();
