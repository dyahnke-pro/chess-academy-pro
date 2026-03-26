// AI voice synthesis — all coach speech goes through here
// Fallback chain: ElevenLabs → Voice Packs (pre-rendered) → Web Speech API
// Only this file may call the ElevenLabs API.

import { speechService } from './speechService';
import { voicePackService } from './voicePackService';
import { getSharedAudioContext } from './audioContextManager';
import { db } from '../db/schema';
import type { UserPreferences } from '../types';

const ELEVENLABS_TTS_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

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

    // Tier 2: Voice Pack — pre-rendered clips, no WASM, works on iOS
    if (preferences.kokoroEnabled && voicePackService.isReady()) {
      const success = await this.speakVoicePack(text, this.speed);
      if (success) return;
      console.warn(`[TTS] Missing clip for: "${text.slice(0, 80)}" — falling back to Web Speech`);
    }

    // Tier 3: Web Speech API (with user's selected system voice)
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
    voicePackService.stop();
    speechService.stop();
  }

  isPlaying(): boolean {
    return this.playing || voicePackService.isPlaying();
  }

  private async speakElevenLabs(text: string, apiKey: string, voiceId: string): Promise<boolean> {
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
      await this.playAudioBuffer(arrayBuffer);
      return true;
    } catch (error) {
      console.warn('[VoiceService] ElevenLabs fetch failed:', error);
      return false;
    }
  }

  private async speakVoicePack(text: string, speed: number): Promise<boolean> {
    try {
      return await voicePackService.speak(text, speed);
    } catch (error) {
      console.warn('[VoiceService] Voice pack playback failed:', error);
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
