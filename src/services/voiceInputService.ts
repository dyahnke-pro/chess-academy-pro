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
  /** Fired when the FIRST interim transcript of a new utterance
   *  arrives — i.e. the student just started speaking. Lets callers
   *  cut the coach off mid-sentence so live conversation feels like
   *  talking over a trainer: the moment you start, they stop. Exactly
   *  one fire per utterance — reset after each final. */
  onSpeechStart?: () => void;
  /** Fired on hard errors the user should know about — permission
   *  denied, microphone unavailable, restart-thrash cap reached. The
   *  caller is expected to surface a toast or inline message so the
   *  student isn't left staring at a dead mic without explanation. */
  onError?: (reason: 'permission-denied' | 'unavailable' | 'thrashing') => void;
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
  /**
   * Array of active result handlers. Was previously a single slot
   * which meant ChatInput, VoiceChatMic, and SmartSearchBar all
   * fought for the same setter — whichever registered last silenced
   * the others. Now handlers are additive and each caller gets an
   * unsubscriber back to drop its own entry on cleanup, so multiple
   * mic-enabled surfaces can coexist without silently breaking each
   * other. */
  private resultHandlers: ResultHandler[] = [];
  private interimHandler: InterimHandler | null = null;
  private endHandler: EndHandler | null = null;
  private errorHandler: ((reason: 'permission-denied' | 'unavailable' | 'thrashing') => void) | null = null;
  private speechStartHandler: (() => void) | null = null;
  /** True once the current utterance has fired onSpeechStart. Reset
   *  after each dispatched final so the next utterance gets one fire. */
  private speechStartFired = false;
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
    this.errorHandler = options.onError ?? null;
    this.speechStartHandler = options.onSpeechStart ?? null;
    this.speechStartFired = false;
    this.userStopped = false;
    this.restartAttempts = 0;

    // Listen for the browser/PWA telling us the app is leaving the
    // foreground. `visibilitychange` fires on tab switch or window
    // minimize; `pagehide` is the reliable signal on iOS when the
    // user backgrounds the PWA, closes the tab, or navigates away.
    // Stop listening so the mic isn't left hot in the background.
    this.attachLifecycleListeners();

    const started = this.createAndStart(SpeechRecognitionClass);
    this.listening = started;
    if (!started) {
      this.detachLifecycleListeners();
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
    this.detachLifecycleListeners();
  }

  /**
   * Register a handler to receive finalised transcripts. Returns an
   * unsubscriber the caller MUST call on cleanup so handlers don't
   * leak between mounts. Multiple handlers coexist — every final
   * transcript fans out to all of them, so ChatInput, VoiceChatMic,
   * and SmartSearchBar can all listen simultaneously if all three
   * are mounted. Previously this was a single-slot setter and the
   * last caller silenced the others.
   */
  onResult(handler: ResultHandler): () => void {
    this.resultHandlers.push(handler);
    return () => {
      const idx = this.resultHandlers.indexOf(handler);
      if (idx >= 0) this.resultHandlers.splice(idx, 1);
    };
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
        // First interim of this utterance → student just started
        // talking. Fire the start hook so callers (voice chat,
        // SmartSearchBar, ChatInput) can cut off the coach's
        // in-flight TTS and let the student take the floor. Trainer
        // feel: never talked over.
        if (!this.speechStartFired) {
          this.speechStartFired = true;
          try {
            this.speechStartHandler?.();
          } catch (err) {
            console.warn('[voiceInputService] speechStart handler threw:', err);
          }
        }
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
        this.errorHandler?.('thrashing');
        this.endHandler?.();
        return;
      }
      const klass = this.getSpeechRecognitionClass();
      if (!klass) {
        this.listening = false;
        this.errorHandler?.('unavailable');
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
        this.errorHandler?.('permission-denied');
      } else if (event.error === 'audio-capture') {
        // Mic hardware missing / in use by another app. Still let
        // onend restart logic run, but surface the failure up top.
        this.errorHandler?.('unavailable');
      }
    };

    try {
      this.recognition.start();
      return true;
    } catch {
      return false;
    }
  }

  // ─── Lifecycle listeners ──────────────────────────────────────────

  /** Bound listener refs so add/remove match. Created lazily so SSR
   *  builds don't reference `document` at module load. */
  private visibilityListener: (() => void) | null = null;
  private pageHideListener: (() => void) | null = null;

  private attachLifecycleListeners(): void {
    if (typeof document === 'undefined') return;
    // Don't double-register.
    this.detachLifecycleListeners();

    this.visibilityListener = () => {
      if (document.visibilityState === 'hidden') {
        this.stopListening();
      }
    };
    this.pageHideListener = () => {
      this.stopListening();
    };
    document.addEventListener('visibilitychange', this.visibilityListener);
    // `pagehide` covers iOS Safari / PWA background & unload in a way
    // `beforeunload` doesn't. Add both for best coverage.
    window.addEventListener('pagehide', this.pageHideListener);
    window.addEventListener('beforeunload', this.pageHideListener);
  }

  private detachLifecycleListeners(): void {
    if (typeof document === 'undefined') return;
    if (this.visibilityListener) {
      document.removeEventListener('visibilitychange', this.visibilityListener);
      this.visibilityListener = null;
    }
    if (this.pageHideListener) {
      window.removeEventListener('pagehide', this.pageHideListener);
      window.removeEventListener('beforeunload', this.pageHideListener);
      this.pageHideListener = null;
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
    // Next utterance should fire onSpeechStart again.
    this.speechStartFired = false;
    // Successful utterance → reset the restart-thrash counter.
    this.restartAttempts = 0;
    // Fan out to every registered handler. Snapshot first so a
    // handler that unsubscribes as part of its callback doesn't
    // skip a sibling handler in the same dispatch.
    for (const handler of [...this.resultHandlers]) {
      try {
        handler(trimmed);
      } catch (err) {
        console.warn('[voiceInputService] result handler threw:', err);
      }
    }
    // Prepare for the next utterance. The browser's continuous mode
    // may keep firing new results within the same session; if it
    // ends, onend's restart path starts a fresh one.
    this.finalDispatched = false;
  }
}

export const voiceInputService = new VoiceInputService();
