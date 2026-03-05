type ResultHandler = (text: string) => void;

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
  private listening = false;

  isSupported(): boolean {
    return typeof window !== 'undefined' && (
      'SpeechRecognition' in window ||
      'webkitSpeechRecognition' in window
    );
  }

  startListening(): boolean {
    if (!this.isSupported() || this.listening) return false;

    const win = window as unknown as Record<string, unknown>;
    const SpeechRecognitionClass = (
      win.SpeechRecognition ?? win.webkitSpeechRecognition
    ) as SpeechRecognitionConstructor | undefined;

    if (SpeechRecognitionClass == null) return false;

    this.recognition = new SpeechRecognitionClass();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results[event.results.length - 1];
      if (last.isFinal) {
        this.resultHandler?.(last[0].transcript);
      }
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
