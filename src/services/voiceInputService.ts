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

/** Silence-timeout after the last interim result before we force-
 *  finalize the accumulated transcript. Web Speech API on iOS/Safari
 *  sometimes fires `onend` WITHOUT emitting a final result — on
 *  mobile the user ends up holding the button indefinitely. 1.4s is
 *  long enough to let a thinker pause mid-sentence but short enough
 *  to feel responsive. */
const SILENCE_TIMEOUT_MS = 1400;

class VoiceInputService {
  private recognition: SpeechRecognitionInstance | null = null;
  private resultHandler: ResultHandler | null = null;
  private interimHandler: InterimHandler | null = null;
  private listening = false;
  /** The most recent interim transcript we've seen. Used to back-fill
   *  a final result when the browser ends recognition without firing
   *  one (iOS quirk + silence-timeout fallback). */
  private latestInterim = '';
  /** Whether we already dispatched a final for this session — prevents
   *  double-firing when `onend` races with a real final result. */
  private finalDispatched = false;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;

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
    this.latestInterim = '';
    this.finalDispatched = false;

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
      if (interimText) {
        this.latestInterim = interimText;
        this.interimHandler?.(interimText);
        // Reset the silence countdown every time we hear a partial.
        this.resetSilenceTimer();
      }
      if (finalText) {
        this.dispatchFinal(finalText);
      }
    };

    // onend can fire WITHOUT a preceding final result — most commonly
    // on iOS Safari when the recognition times out from silence. If
    // we have interim text we never finalized, dispatch it now so the
    // user's words don't vanish.
    this.recognition.onend = () => {
      this.clearSilenceTimer();
      this.listening = false;
      if (!this.finalDispatched && this.latestInterim.trim()) {
        this.dispatchFinal(this.latestInterim);
      }
    };

    this.recognition.onerror = () => {
      this.clearSilenceTimer();
      this.listening = false;
    };

    try {
      this.recognition.start();
      this.listening = true;
      // Prime the silence timer — if the user stays silent after
      // tapping the mic, we'll time out and stop cleanly.
      this.resetSilenceTimer();
      return true;
    } catch {
      this.listening = false;
      return false;
    }
  }

  stopListening(): void {
    this.clearSilenceTimer();
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

  private dispatchFinal(text: string): void {
    if (this.finalDispatched) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    this.finalDispatched = true;
    this.clearSilenceTimer();
    this.resultHandler?.(trimmed);
  }

  private resetSilenceTimer(): void {
    this.clearSilenceTimer();
    this.silenceTimer = setTimeout(() => {
      // We've been silent long enough — assume the user finished
      // their utterance. If we already have interim text, treat it
      // as final (the browser may still fire its own final after
      // recognition.stop(), but finalDispatched guards us).
      if (!this.finalDispatched && this.latestInterim.trim()) {
        this.dispatchFinal(this.latestInterim);
      }
      if (this.recognition && this.listening) {
        try {
          this.recognition.stop();
        } catch {
          /* already stopped — ignore */
        }
      }
    }, SILENCE_TIMEOUT_MS);
  }

  private clearSilenceTimer(): void {
    if (this.silenceTimer !== null) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }
}

export const voiceInputService = new VoiceInputService();
