// AI voice synthesis — all coach speech goes through here
// Fallback chain: ElevenLabs → Kokoro (open-source) → Web Speech API
// Only this file may call the ElevenLabs API.

import { speechService } from './speechService';
import { kokoroService } from './kokoroService';
import { db } from '../db/schema';
import type { UserPreferences } from '../types';

const ELEVENLABS_TTS_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const KOKORO_SAMPLE_RATE = 24000;

// Web Speech fallback settings
const WEB_SPEECH_FALLBACK = { rate: 0.95, pitch: 0.78 };

/** Simple hash for cache keys */
function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return String(hash);
}

class VoiceService {
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private playing = false;
  private speed = 1.0;

  setSpeed(rate: number): void {
    this.speed = Math.max(0.5, Math.min(2.0, rate));
  }

  getSpeed(): number {
    return this.speed;
  }

  /**
   * Speak with cached Kokoro audio. No Web Speech fallback.
   * - If audio is cached in IndexedDB → play instantly
   * - If Kokoro is loaded but not cached → generate, cache, play (slow first time)
   * - If Kokoro not loaded and no cache → silent
   * Used by openings components.
   */
  speakNow(text: string): void {
    void this.speakCached(text);
  }

  /**
   * Full async speak with all tiers — queries DB for preferences.
   * Used by coach components that need ElevenLabs support.
   */
  async speak(text: string): Promise<void> {
    this.stop();

    const profile = await db.profiles.get('main');
    if (!profile) {
      this.speakFallback(text);
      return;
    }

    const { preferences } = profile;

    if (!preferences.voiceEnabled) return;

    // Load speed from preferences
    if (preferences.voiceSpeed) {
      this.speed = preferences.voiceSpeed;
    }

    // Tier 1: ElevenLabs (if configured)
    const apiKey = await this.getApiKey(preferences);
    const voiceId = preferences.elevenlabsVoiceId as string | undefined;

    if (apiKey && voiceId) {
      const success = await this.speakElevenLabs(text, apiKey, voiceId);
      if (success) return;
    }

    // Tier 2: Kokoro (if enabled and model loaded)
    if (preferences.kokoroEnabled && kokoroService.isReady()) {
      const success = await this.speakKokoro(text, preferences.kokoroVoiceId, this.speed);
      if (success) return;
    }

    // Tier 3: Web Speech API
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
    kokoroService.stop();
    speechService.stop();
  }

  isPlaying(): boolean {
    return this.playing || kokoroService.isPlaying();
  }

  private async speakCached(text: string): Promise<void> {
    this.stopPlayback();

    const textHash = hashText(text);

    // Check IndexedDB cache first
    try {
      const cached = await db.audioCache.get(textHash);
      if (cached) {
        await this.playRawAudio(cached.audio);
        return;
      }
    } catch {
      // Cache miss or DB error — continue to generate
    }

    // Generate with Kokoro if loaded
    if (kokoroService.isReady()) {
      try {
        const voiceId = await this.getKokoroVoiceId();
        const result = await kokoroService.generate(text, voiceId, this.speed);
        const audioBuffer = result.audio.buffer as ArrayBuffer;

        // Cache for future use
        void db.audioCache.put({
          textHash,
          audio: audioBuffer,
          voiceId,
          timestamp: Date.now(),
        }).catch(() => { /* cache write failure is non-fatal */ });

        await this.playRawAudio(audioBuffer);
      } catch (error) {
        console.warn('[VoiceService] Kokoro generate+cache failed:', error);
      }
    }
    // No fallback — stay silent if no cache and no Kokoro
  }

  /** Stop only audio playback (no speechService cancel — avoids iOS double-cancel bug) */
  private stopPlayback(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch {
        // Already stopped
      }
      this.currentSource = null;
    }
    this.playing = false;
    kokoroService.stop();
  }

  private async getKokoroVoiceId(): Promise<string> {
    try {
      const profile = await db.profiles.get('main');
      return profile?.preferences.kokoroVoiceId ?? 'af_heart';
    } catch {
      return 'af_heart';
    }
  }

  private async playRawAudio(buffer: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const float32 = new Float32Array(buffer);
    const audioBuffer = this.audioContext.createBuffer(1, float32.length, KOKORO_SAMPLE_RATE);
    audioBuffer.getChannelData(0).set(float32);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

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

  private async speakElevenLabs(text: string, apiKey: string, voiceId: string): Promise<boolean> {
    if (this.audioContext?.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch {
        return false;
      }
    }

    try {
      const response = await fetch(`${ELEVENLABS_TTS_URL}/${voiceId}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: this.speed },
        }),
      });

      if (!response.ok) {
        console.warn('[VoiceService] ElevenLabs API error', response.status, '— falling back');
        return false;
      }

      const arrayBuffer = await response.arrayBuffer();
      await this.playEncodedAudio(arrayBuffer);
      return true;
    } catch (error) {
      console.warn('[VoiceService] ElevenLabs fetch failed:', error);
      return false;
    }
  }

  private async speakKokoro(text: string, voiceId: string, speed: number): Promise<boolean> {
    try {
      await kokoroService.speak(text, voiceId, speed);
      return true;
    } catch (error) {
      console.warn('[VoiceService] Kokoro TTS failed:', error);
      return false;
    }
  }

  private speakFallback(text: string): void {
    speechService.speak(text, WEB_SPEECH_FALLBACK);
  }

  private async playEncodedAudio(buffer: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    const audioBuffer = await this.audioContext.decodeAudioData(buffer);
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

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

  private async getApiKey(preferences: UserPreferences): Promise<string | null> {
    if (!preferences.elevenlabsKeyEncrypted || !preferences.elevenlabsKeyIv) {
      return null;
    }

    try {
      const { decryptApiKey } = await import('./cryptoService');
      return await decryptApiKey(preferences.elevenlabsKeyEncrypted, preferences.elevenlabsKeyIv);
    } catch {
      return null;
    }
  }
}

// Singleton
export const voiceService = new VoiceService();
