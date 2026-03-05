// AI voice synthesis via ElevenLabs — all coach speech goes through here
// Falls back to speechService (Web Speech API) if no ElevenLabs key is set
// Only this file may call the ElevenLabs API.

import { speechService } from './speechService';
import { db } from '../db/schema';
import type { CoachPersonality, UserPreferences } from '../types';

const ELEVENLABS_TTS_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

// Web Speech fallback settings per WO spec
const WEB_SPEECH_FALLBACK = { rate: 0.95, pitch: 0.78 };

const VOICE_PREF_KEY: Record<CoachPersonality, keyof UserPreferences> = {
  danya: 'voiceIdDanya',
  kasparov: 'voiceIdKasparov',
  fischer: 'voiceIdFischer',
};

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

  async speak(text: string, personality: CoachPersonality): Promise<void> {
    this.stop();

    const profile = await db.profiles.get('main');
    if (!profile) {
      speechService.speak(text, WEB_SPEECH_FALLBACK);
      return;
    }

    const { preferences } = profile;

    if (!preferences.voiceEnabled) return;

    // Load speed from preferences
    if (preferences.voiceSpeed) {
      this.speed = preferences.voiceSpeed;
    }

    const apiKey = await this.getApiKey(preferences);
    const voiceId = preferences[VOICE_PREF_KEY[personality]] as string;

    if (!apiKey || !voiceId) {
      speechService.speak(text, WEB_SPEECH_FALLBACK);
      return;
    }

    // Detect silent mode on iOS
    if (this.audioContext?.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch {
        speechService.speak(text, WEB_SPEECH_FALLBACK);
        return;
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
        console.warn('[VoiceService] ElevenLabs API error', response.status, '— falling back to Web Speech');
        speechService.speak(text, WEB_SPEECH_FALLBACK);
        return;
      }

      const arrayBuffer = await response.arrayBuffer();
      await this.playAudioBuffer(arrayBuffer);
    } catch (error) {
      console.warn('[VoiceService] ElevenLabs fetch failed, falling back to Web Speech:', error);
      speechService.speak(text, WEB_SPEECH_FALLBACK);
    }
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isSupportedPersonality(personality: CoachPersonality): boolean {
    return true;
  }

  async isSupportedPersonalityAsync(personality: CoachPersonality): Promise<boolean> {
    const profile = await db.profiles.get('main');
    if (!profile) return false;

    const { preferences } = profile;
    const apiKey = preferences.elevenlabsKeyEncrypted;
    const voiceId = preferences[VOICE_PREF_KEY[personality]];

    return apiKey !== null && typeof voiceId === 'string' && voiceId.length > 0;
  }

  private async playAudioBuffer(buffer: ArrayBuffer): Promise<void> {
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
