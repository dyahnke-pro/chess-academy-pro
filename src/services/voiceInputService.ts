type ResultHandler = (text: string) => void;
type InterimHandler = (text: string) => void;

export interface StartListeningOptions {
  /** Fired for every partial (non-final) recognition result. Lets UI
   *  show a live transcript as the user speaks. Default: ignored. */
  onInterim?: InterimHandler;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognitionInstance;
}

class VoiceInputService {
  private recognition: SpeechRecognitionInstance | null = null;
  private resultHandler: ResultHandler | null = null;
  private interimHandler: InterimHandler | null = null;
  private listening = false;

  isSupported(): boolean {
    return typeof window !== 'undefined' && (
      'SpeechRecognition' in window ||
      'webkitSpeechRecognition' in window
    );
  }

  startListening(options: StartListeningOptions = {}): boolean {
    if (!this.isSupported()) return false;
    if (this.listening) return true;

    const win = window as unknown as Record<string, unknown>;
    const SpeechRecognitionClass = (
      win.SpeechRecognition ?? win.webkitSpeechRecognition
    ) as SpeechRecognitionConstructor | undefined;

    if (SpeechRecognitionClass == null) return false;

    this.recognition = new SpeechRecognitionClass();
    this.recognition.continuous = false;
    // Interim results are the single biggest UX win — the user sees
    // their words appear as they speak, so the "is this thing even
    // on?" feeling disappears.
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.interimHandler = options.onInterim ?? null;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Walk every result in this event. Interim partials fire
      // continuously during speech; the final arrives once the user
      // pauses long enough. We surface both.
      let interimText = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }
      if (interimText) this.interimHandler?.(interimText);
      if (finalText) this.resultHandler?.(finalText);
    };

    this.recognition.onend = () => {
      this.listening = false;
    };

    this.recognition.onerror = () => {
      this.listening = false;
    };

    try {
      this.recognition.start();
      this.listening = true;
      return true;
    } catch {
      this.listening = false;
      return false;
    }
  }

  stopListening(): void {
    if (this.recognition && this.listening) {
      this.recognition.stop();
      this.listening = false;
    }
  }

  onResult(handler: ResultHandler): void {
    this.resultHandler = handler;
  }

  isListening(): boolean {
    return this.listening;
  }
}

export const voiceInputService = new VoiceInputService();
