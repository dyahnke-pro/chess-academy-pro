// Web Speech API TTS wrapper — works natively on iOS and macOS

interface SpeechOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice | null;
}

class SpeechService {
  private synthesis: SpeechSynthesis | null;
  private enabled: boolean = true;
  private preferredVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    this.synthesis = typeof window !== 'undefined' ? window.speechSynthesis : null;

    if (this.synthesis) {
      // Capture in local const so TypeScript can track non-nullability in the closure
      const synthesis = this.synthesis;

      // Load voices (async on Chrome/iOS)
      const loadVoices = (): void => {
        const voices = synthesis.getVoices();
        this.preferredVoice = this.pickBestVoice(voices);
      };

      if (synthesis.getVoices().length > 0) {
        loadVoices();
      } else {
        synthesis.addEventListener('voiceschanged', loadVoices, { once: true });
      }
    }
  }

  speak(text: string, options: SpeechOptions = {}): void {
    if (!this.synthesis || !this.enabled) return;

    // Cancel any in-progress speech
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate ?? 1.0;
    utterance.pitch = options.pitch ?? 1.0;
    utterance.volume = options.volume ?? 1.0;
    utterance.voice = options.voice ?? this.preferredVoice;

    this.synthesis.speak(utterance);
  }

  stop(): void {
    this.synthesis?.cancel();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.stop();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  isSupported(): boolean {
    return this.synthesis !== null;
  }

  getVoices(): SpeechSynthesisVoice[] {
    return this.synthesis?.getVoices() ?? [];
  }

  private pickBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    if (voices.length === 0) return null;

    // Prefer English voices — Samantha on iOS, Google US English on Chrome
    const preferred = [
      'Samantha', // iOS
      'Google US English',
      'Microsoft Aria Online',
      'Karen', // macOS
      'Daniel', // macOS UK
    ];

    for (const name of preferred) {
      const voice = voices.find((v) => v.name.includes(name));
      if (voice) return voice;
    }

    // Fallback: first English voice
    return voices.find((v) => v.lang.startsWith('en')) ?? voices[0];
  }
}

// Singleton
export const speechService = new SpeechService();
