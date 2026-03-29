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
  private playing = false;
  private speed = 1.0;

  setSpeed(rate: number): void {
    this.speed = Math.max(0.5, Math.min(2.0, rate));
  }

  getSpeed(): number {
    return this.speed;
  }

  async speak(text: string): Promise<void> {
    this.stop();

    const profile = await db.profiles.get('main');
    if (!profile) {
      this.speakFallback(text);
      return;
    }

    const { preferences } = profile;

    if (!preferences.voiceEnabled) return;

    if (preferences.voiceSpeed) {
      this.speed = preferences.voiceSpeed;
    }

    // Tier 1: Amazon Polly (server-side, no API key needed in browser)
    if (preferences.pollyEnabled) {
      const success = await this.speakPolly(text, preferences.pollyVoice || 'ruth');
      if (success) return;
    }

    // Tier 2: Web Speech API (with user's selected system voice)
    if (preferences.systemVoiceURI) {
      speechService.setVoice(preferences.systemVoiceURI);
    }
    this.speakFallback(text);
  }

  stop(): void {
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
      const url = getTtsUrl(text, voice);
      const response = await fetch(url);
      if (!response.ok) {
        console.warn('[VoiceService] Polly API error:', response.status);
        return false;
      }
      const arrayBuffer = await response.arrayBuffer();
      await this.playAudioBuffer(arrayBuffer);
      return true;
    } catch (error) {
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
