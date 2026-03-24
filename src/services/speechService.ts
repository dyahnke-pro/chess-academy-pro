// Web Speech API TTS wrapper -- works natively on iOS and macOS
// Optimized for natural-sounding speech with best available voices

interface SpeechOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice | null;
  onBoundary?: (charIndex: number, charLength: number) => void;
  onEnd?: () => void;
}

export interface SystemVoice {
  name: string;
  lang: string;
  voiceURI: string;
  isNatural: boolean;
}

class SpeechService {
  private synthesis: SpeechSynthesis | null;
  private preferredVoice: SpeechSynthesisVoice | null = null;
  private selectedVoiceURI: string | null = null;
  private rate: number = 0.95;
  private enabled: boolean = true;
  private availableVoices: SpeechSynthesisVoice[] = [];
  private voiceChangeListeners: Array<() => void> = [];

  constructor() {
    this.synthesis = typeof window !== 'undefined' ? window.speechSynthesis : null;

    if (this.synthesis) {
      const synthesis = this.synthesis;

      const loadVoices = (): void => {
        const voices = synthesis.getVoices();
        // Filter to English voices only
        this.availableVoices = voices.filter(v =>
          v.lang.startsWith('en')
        );

        // If user has a selected voice, use it
        if (this.selectedVoiceURI) {
          const selected = voices.find(v => v.voiceURI === this.selectedVoiceURI);
          if (selected) {
            this.preferredVoice = selected;
            console.log('[SpeechService] Using selected voice:', selected.name);
          }
        }

        // Otherwise fall back to priority list
        if (!this.preferredVoice) {
          const preferred = [
            'Google US English',
            'Google UK English Female',
            'Samantha',
            'Microsoft Aria Online (Natural) - English (United States)',
            'Microsoft Aria Online',
            'Karen',
            'Moira',
            'Daniel',
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
        }

        // Warm up to prevent first-word clipping on iOS/macOS
        if (this.preferredVoice) {
          const warmup = new SpeechSynthesisUtterance('\u00A0');
          warmup.voice = this.preferredVoice;
          warmup.volume = 0;
          synthesis.speak(warmup);
        }

        // Notify listeners that voices are loaded
        this.voiceChangeListeners.forEach(fn => fn());
      };

      if (synthesis.getVoices().length > 0) {
        loadVoices();
      } else {
        synthesis.addEventListener('voiceschanged', loadVoices, { once: true });
      }
    }
  }

  /** Get all available English system voices */
  getAvailableVoices(): SystemVoice[] {
    return this.availableVoices.map(v => ({
      name: v.name,
      lang: v.lang,
      voiceURI: v.voiceURI,
      isNatural: v.name.includes('Natural') || v.name.includes('Online'),
    }));
  }

  /** Set the preferred system voice by voiceURI */
  setVoice(voiceURI: string | null): void {
    this.selectedVoiceURI = voiceURI;
    if (voiceURI) {
      const found = this.availableVoices.find(v => v.voiceURI === voiceURI);
      if (found) {
        this.preferredVoice = found;
        console.log('[SpeechService] Voice changed to:', found.name);
      }
    } else {
      this.preferredVoice = null;
    }
  }

  /** Get currently selected voice URI */
  getSelectedVoiceURI(): string | null {
    return this.preferredVoice?.voiceURI ?? null;
  }

  /** Register a listener for when voices become available */
  onVoicesChanged(fn: () => void): () => void {
    this.voiceChangeListeners.push(fn);
    return () => {
      this.voiceChangeListeners = this.voiceChangeListeners.filter(l => l !== fn);
    };
  }

  speak(text: string, options: SpeechOptions = {}): void {
    if (!this.synthesis || !this.enabled) return;

    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate ?? this.rate;
    utterance.pitch = options.pitch ?? 0.78;
    utterance.volume = options.volume ?? 1.0;
    utterance.voice = options.voice ?? this.preferredVoice;

    if (options.onBoundary) {
      const handler = options.onBoundary;
      utterance.addEventListener('boundary', (event: SpeechSynthesisEvent) => {
        handler(event.charIndex, event.charLength ?? 0);
      });
    }

    if (options.onEnd) {
      const endHandler = options.onEnd;
      utterance.addEventListener('end', () => endHandler());
    }

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
