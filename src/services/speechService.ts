// Web Speech API TTS wrapper -- works natively on iOS and macOS
// Optimized for natural-sounding speech with best available voices

interface SpeechOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice | null;
}

class SpeechService {
  private synthesis: SpeechSynthesis | null;
  private preferredVoice: SpeechSynthesisVoice | null = null;
  private rate: number = 0.95;
  private enabled: boolean = true;

  constructor() {
    this.synthesis = typeof window !== 'undefined' ? window.speechSynthesis : null;

    if (this.synthesis) {
      const synthesis = this.synthesis;

      const loadVoices = (): void => {
        const voices = synthesis.getVoices();

        // Priority: best natural-sounding English voices first
        const preferred = [
          'Google US English',         // WO spec: primary fallback voice
          'Google UK English Female',  // Chrome -- very natural
          'Samantha',                  // iOS/macOS -- natural
          'Microsoft Aria Online (Natural) - English (United States)',
          'Microsoft Aria Online',
          'Karen',                     // macOS
          'Moira',                     // macOS Irish -- warm tone
          'Daniel',                    // macOS UK
          'Victoria',
          'Alex',
        ];

        for (const name of preferred) {
          const found = voices.find(v => v.name === name);
          if (found) {
            this.preferredVoice = found;
            console.log('[SpeechService] Using voice:', found.name);
            break;
          }
        }

        // Warm up to prevent first-word clipping on iOS/macOS
        if (this.preferredVoice) {
          const warmup = new SpeechSynthesisUtterance('\u00A0');
          warmup.voice = this.preferredVoice;
          warmup.volume = 0;
          synthesis.speak(warmup);
        }
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

    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate ?? this.rate;
    utterance.pitch = options.pitch ?? 0.78;
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

  setRate(rate: number): void {
    this.rate = Math.max(0.5, Math.min(2.0, rate));
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  get speed(): number {
    return this.rate;
  }
}

export const speechService = new SpeechService();
