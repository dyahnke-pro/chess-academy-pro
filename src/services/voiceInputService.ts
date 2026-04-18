type ResultHandler = (text: string) => void;
type InterimHandler = (text: string) => void;
type EndHandler = () => void;

export interface StartListeningOptions {
  /** Fired for every partial (non-final) recognition result. Lets UI
   *  show a live transcript as the user speaks. Default: ignored. */
  onInterim?: InterimHandler;
  /** Fired when the mic genuinely STOPS — either because the caller
   *  invoked `stopListening()`, a hard error occurred, or all
   *  auto-restart attempts failed. Lets callers sync their own
   *  "listening" UI state back to false. NOT fired between utterances
   *  while we're transparently restarting for continuous listening. */
  onEnd?: EndHandler;
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

/** Max consecutive auto-restart attempts before we give up. Permission
 *  errors, device issues, and browser limits can loop `onend` forever;
 *  cap it so we don't brick the page. Reset on successful final. */
const MAX_RESTART_ATTEMPTS = 3;

/**
 * voiceInputService — continuous dictation.
 *
 * The mic stays ON until the caller invokes `stopListening()`. Between
 * utterances, the Web Speech API fires `onend` on most browsers; we
 * transparently restart recognition so the UI never sees the gap. Each
 * finalized utterance fires the registered `onResult` handler.
 *
 * iOS Safari quirks handled:
 *  - `continuous = true` is honored but the session silently ends on
 *    each utterance → we restart.
 *  - `onend` can fire without a final result → if we have accumulated
 *    interim text, we dispatch it as final before restarting.
 *  - Permission denial fires `onerror` with 'not-allowed' — we
 *    treat that as terminal (no restart) so the user can re-grant.
 */
class VoiceInputService {
  private recognition: SpeechRecognitionInstance | null = null;
  private resultHandler: ResultHandler | null = null;
  private interimHandler: InterimHandler | null = null;
  private endHandler: EndHandler | null = null;
  private listening = false;
  /** True when the CALLER asked us to stop. Distinguishes user intent
   *  from the browser's automatic end-of-utterance. */
  private userStopped = false;
  /** Most recent interim transcript within the current utterance.
   *  Reset after each dispatched final so the NEXT utterance starts
   *  fresh. Also used to back-fill a final when `onend` fires without
   *  one (iOS quirk). */
  private latestInterim = '';
  /** Prevents double-firing when `onend` races with a real final. */
  private finalDispatched = false;
  /** Consecutive restart attempts without a successful utterance —
   *  cap to avoid tight loops on permission-denied / device errors. */
  private restartAttempts = 0;

  isSupported(): boolean {
    return typeof window !== 'undefined' && (
      'SpeechRecognition' in window ||
      'webkitSpeechRecognition' in window
    );
  }

  startListening(options: StartListeningOptions = {}): boolean {
    if (!this.isSupported()) return false;
    if (this.listening) return true;

    const SpeechRecognitionClass = this.getSpeechRecognitionClass();
    if (SpeechRecognitionClass == null) return false;

    this.interimHandler = options.onInterim ?? null;
    this.endHandler = options.onEnd ?? null;
    this.userStopped = false;
    this.restartAttempts = 0;

    const started = this.createAndStart(SpeechRecognitionClass);
    this.listening = started;
    if (!started) {
      this.endHandler?.();
    }
    return started;
  }

  stopListening(): void {
    this.userStopped = true;
    if (this.recognition && this.listening) {
      try {
        this.recognition.stop();
      } catch {
        /* already stopped — onend will still fire */
      }
    }
    this.listening = false;
  }

  onResult(handler: ResultHandler): void {
    this.resultHandler = handler;
  }

  isListening(): boolean {
    return this.listening;
  }

  private getSpeechRecognitionClass(): SpeechRecognitionConstructor | null {
    const win = window as unknown as Record<string, unknown>;
    const klass = (win.SpeechRecognition ?? win.webkitSpeechRecognition) as
      | SpeechRecognitionConstructor
      | undefined;
    return klass ?? null;
  }

  private createAndStart(SpeechRecognitionClass: SpeechRecognitionConstructor): boolean {
    this.recognition = new SpeechRecognitionClass();
    // Continuous = true keeps the session alive across pauses on
    // browsers that honor it (desktop Chrome). iOS Safari still
    // auto-ends each utterance, which we handle by restarting in
    // `onend` below when `userStopped` is false.
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.latestInterim = '';
    this.finalDispatched = false;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
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
      }
      if (finalText) {
        this.dispatchFinal(finalText);
      }
    };

    this.recognition.onend = () => {
      // If we had interim text but the browser ended without firing a
      // final (common on iOS), dispatch whatever we heard.
      if (!this.finalDispatched && this.latestInterim.trim()) {
        this.dispatchFinal(this.latestInterim);
      }
      if (this.userStopped) {
        this.listening = false;
        this.endHandler?.();
        return;
      }
      // Continuous listening: transparently restart unless we're
      // thrashing (suggests a hard error like permission denied).
      this.restartAttempts += 1;
      if (this.restartAttempts > MAX_RESTART_ATTEMPTS) {
        this.listening = false;
        this.endHandler?.();
        return;
      }
      const klass = this.getSpeechRecognitionClass();
      if (!klass) {
        this.listening = false;
        this.endHandler?.();
        return;
      }
      // Fresh instance avoids "InvalidStateError: already started"
      // when we restart immediately after a stop.
      this.createAndStart(klass);
    };

    this.recognition.onerror = (event: { error: string }) => {
      // Permission denial is terminal — no point retrying, the user
      // has to re-grant via the browser. Other errors (no-speech,
      // audio-capture, network) are transient; let `onend` handle
      // the restart decision.
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        this.userStopped = true;
      }
    };

    try {
      this.recognition.start();
      return true;
    } catch {
      return false;
    }
  }

  private dispatchFinal(text: string): void {
    if (this.finalDispatched) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    this.finalDispatched = true;
    // Reset the per-utterance interim/final state so the next
    // utterance starts clean within the same listening session.
    this.latestInterim = '';
    // Successful utterance → reset the restart-thrash counter.
    this.restartAttempts = 0;
    this.resultHandler?.(trimmed);
    // Prepare for the next utterance. The browser's continuous mode
    // may keep firing new results within the same session; if it
    // ends, onend's restart path starts a fresh one.
    this.finalDispatched = false;
  }
}

export const voiceInputService = new VoiceInputService();
