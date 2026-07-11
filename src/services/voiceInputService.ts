import { Capacitor } from '@capacitor/core';

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

/** Native end-of-utterance window: after the last partial with no new speech,
 *  auto-stop the recognizer and submit. ~2s is a natural sentence-end pause —
 *  long enough not to cut off a mid-thought pause, short enough to feel
 *  responsive. iOS never auto-stops on silence, so this is what turns the
 *  native mic into "tap, speak, done" instead of "tap, speak, tap again." */
const NATIVE_SILENCE_MS = 2000;

/** TURN-TAKING (David 2026-07-11: "I want it to stay on so I can have a back
 *  and forth with the coach — a natural conversation"). After an utterance
 *  auto-submits, the recognizer TEARS DOWN (half-duplex holds — record and
 *  playback must NEVER overlap on the shared iOS AVAudioSession, the proven
 *  crash) and re-arms only when the coach's spoken reply has FINISHED.
 *  Two-phase wait constants:
 *  - REPLY_START_WAIT_MS: how long to wait for the reply's TTS to START
 *    (covers the LLM round-trip). Restarting before the reply begins was the
 *    original continuous-mode crash: the mic came back instantly during the
 *    LLM gap, then playback started on top of the live recognizer.
 *  - PLAYBACK_IDLE_CONFIRM_MS: sentence-chained TTS goes briefly idle BETWEEN
 *    sentences; require this much continuous silence before declaring the
 *    reply finished.
 *  - REPLY_FINISH_MAX_MS: hard ceiling on waiting for a reply to finish. */
const REPLY_START_WAIT_MS = 15_000;
const PLAYBACK_IDLE_CONFIRM_MS = 900;
const REPLY_FINISH_MAX_MS = 120_000;

/** Minimum average confidence to accept a transcript. Web Speech
 *  reports 0-1; below this the audio was noisy or the speech wasn't
 *  clearly directed at the mic. 0.55 is a balance — catches most
 *  background chatter without rejecting quiet-but-clear speech. */
const NOISE_CONFIDENCE_THRESHOLD = 0.55;

/** Isolated noise / filler words that we should NOT send to the
 *  coach. A real question/greeting won't consist of only one of
 *  these. Case-insensitive.
 *
 *  Deliberately EXCLUDES "yes", "no", "yeah", "nope" — those are
 *  legitimate answers when the coach asks a yes/no question (e.g.
 *  "want to drill that?", "answer or hint?"). Dropping them broke
 *  the trainer-feel answer flow — the coach's question hung with no
 *  response. If a background voice says "yes" out of context, the
 *  coach's own prompt can handle the non-sequitur. */
const NOISE_WORD_SET = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'so', 'um', 'uh', 'er', 'ah',
  'eh', 'oh', 'mm', 'hmm', 'huh', 'ok', 'okay', 'mhm', 'uhhuh',
]);

/** Greetings allowed through even when short/single-word — these
 *  SHOULD reach the coach to trigger a RETURN greeting reply. */
const GREETING_WORD_SET = new Set([
  'hi', 'hello', 'hey', 'yo', 'sup', 'howdy', 'greetings',
]);

/** Single-word ANSWERS the student commonly gives to the coach's
 *  yes/no prompts. Explicitly allowed through the noise filter so
 *  the coach's "want to drill that?" flow actually works. */
const ANSWER_WORD_SET = new Set([
  'yes', 'no', 'yeah', 'yep', 'nope', 'sure', 'absolutely', 'definitely',
  'hint', 'answer', 'skip', 'continue', 'stop', 'pause', 'resume',
]);

/**
 * Heuristic noise filter — returns true when a final transcript
 * looks like background noise, cross-talk, or a mic pop rather than
 * the student addressing the coach. Errs on the side of LETTING
 * AMBIGUOUS speech through (false negatives are better than
 * frustrating the student with missed intents). Three signals:
 *   1. Average confidence below threshold.
 *   2. Single word matching NOISE_WORD_SET (and not a greeting).
 *   3. Empty or < 2 chars.
 */
export function shouldDropAsNoise(text: string, avgConfidence: number): boolean {
  const normalized = text.trim().toLowerCase();
  if (normalized.length < 2) return true;
  const words = normalized.replace(/[^\w'\s]/g, '').split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    const word = words[0];
    // Greetings + yes/no answers pass through — these are the two
    // cases where a single word IS the full intent.
    if (GREETING_WORD_SET.has(word)) return false;
    if (ANSWER_WORD_SET.has(word)) return false;
    if (NOISE_WORD_SET.has(word)) return true;
  }
  // Confidence signal: only drop when confidence is BOTH low AND the
  // utterance is short (longer speech with low confidence might still
  // be a real question we should try to answer).
  if (avgConfidence > 0 && avgConfidence < NOISE_CONFIDENCE_THRESHOLD && words.length <= 3) {
    return true;
  }
  return false;
}

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

  /** True once we've successfully opened a mic stream at least once.
   *  Used to bypass the getUserMedia pre-warm on subsequent taps —
   *  permission grants persist for the session, so we only need to
   *  ask + warm up the audio pipeline once. */
  private micPreWarmed = false;

  /** True while a NATIVE (Capacitor @capacitor-community/speech-recognition)
   *  session is active. The native path is used inside the iOS/Android app
   *  (WKWebView), where the browser Web Speech API is blocked by Apple
   *  (David 2026-06-18: "works on vercel, not the iOS app"). */
  private nativeListening = false;
  /** Latest partial transcript from the native recognizer within the current
   *  utterance — dispatched as final when the utterance stops. */
  private nativeLatest = '';
  /** End-of-utterance silence timer for the NATIVE path. iOS SFSpeechRecognizer
   *  never auto-stops on silence, so without this the user must tap the mic a
   *  SECOND time to submit — undiscoverable, and it read as "the mic doesn't
   *  work" (David 2026-07-11: it heard "Test" but never sent). Each partial
   *  resets it; when it fires (no new speech for NATIVE_SILENCE_MS) we stop +
   *  dispatch, so the flow is: tap → speak → pause → sends. */
  private nativeSilenceTimer: ReturnType<typeof setTimeout> | null = null;
  /** Continuous (hands-free) mode: the mic STAYS on across turns (David
   *  2026-07-11: "I want it to stay on"). Each pause auto-submits the utterance
   *  and the recognizer keeps listening for the next one — the user only taps
   *  the mic to turn it OFF. Set true on a native start, false on user stop. */
  private nativeContinuous = false;
  /** The plugin handle, cached from the dynamic import so an auto-restart (iOS
   *  caps a single SFSpeechRecognizer session at ~1 min) can re-`start()`
   *  without re-importing or re-adding listeners. */
  private nativeSR: { start: (opts: Record<string, unknown>) => Promise<void> } | null = null;
  /** voiceService handle, cached so the hot partials path can synchronously
   *  check `isPlaying()` — the echo guard that drops audio captured WHILE the
   *  coach is speaking its reply, so continuous mode never talks to itself. */
  private voiceServiceRef: { isPlaying: () => boolean; stop: () => void } | null = null;
  /** True while an auto-restart is already scheduled/in-flight, so overlapping
   *  triggers (silence + iOS session-cap 'stopped') don't double-start. */
  private nativeRestarting = false;

  /** Running inside the native app shell (Capacitor WKWebView), where the
   *  native speech plugin is available and Web Speech is not. */
  private isNativePlatform(): boolean {
    try { return Capacitor.isNativePlatform(); } catch { return false; }
  }

  isSupported(): boolean {
    // Native app: the @capacitor-community/speech-recognition plugin provides
    // recognition even though the WKWebView has no Web Speech API.
    if (this.isNativePlatform()) return true;
    return typeof window !== 'undefined' && (
      'SpeechRecognition' in window ||
      'webkitSpeechRecognition' in window
    );
  }

  /** Fire-and-forget audit so mic failures are visible in the live audit
   *  stream. The mic stack previously emitted NOTHING — a dead mic on an
   *  unfamiliar device (Dictation disabled, server-recognition unreachable,
   *  standalone PWA) left no trace, so the only "fix" was guessing. Every
   *  start / error / give-up now lands in the stream. Auditing must never
   *  throw into the mic flow. */
  private audit(
    kind:
      | 'mic-start-requested'
      | 'mic-started'
      | 'mic-start-failed'
      | 'mic-error'
      | 'mic-gave-up'
      // Pipeline-visibility events (David 2026-07-09): the mic path past
      // `mic-started` was silent, so a "captured but no response" failure left
      // no trace to root-cause. These make every step observable in the stream.
      | 'mic-heard-speech'
      | 'mic-final-dispatched'
      | 'mic-native-stopped',
    summary: string,
    details?: Record<string, unknown>,
  ): void {
    void import('./appAuditor')
      .then(({ logAppAudit }) => {
        void logAppAudit({
          kind,
          category: 'subsystem',
          source: 'voiceInputService',
          summary,
          details: details ? JSON.stringify(details) : undefined,
        });
      })
      .catch(() => { /* auditing must never break the mic */ });
  }

  /** Snapshot of what the platform claims to support — exactly the data
   *  needed to diagnose a dead mic on an unfamiliar device without the
   *  user in the room. */
  private capabilitySnapshot(): Record<string, unknown> {
    const hasWin = typeof window !== 'undefined';
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    const ua = nav?.userAgent ?? '';
    // Cast through a loose shape: the DOM lib types these as always-present,
    // but on the exact unusual platforms we're diagnosing they can be
    // undefined, so we probe defensively.
    const loose = nav as unknown as { standalone?: boolean; mediaDevices?: { getUserMedia?: unknown }; onLine?: boolean } | undefined;
    const navStandalone = loose?.standalone === true;
    const displayStandalone = hasWin && window.matchMedia('(display-mode: standalone)').matches;
    return {
      hasSpeechRecognition: hasWin && 'SpeechRecognition' in window,
      hasWebkitSpeechRecognition: hasWin && 'webkitSpeechRecognition' in window,
      hasGetUserMedia: !!loose?.mediaDevices?.getUserMedia,
      isSecureContext: hasWin ? window.isSecureContext : undefined,
      standalone: navStandalone || displayStandalone,
      isIos: /iPhone|iPad|iPod/.test(ua),
      online: loose?.onLine,
      userAgent: ua,
    };
  }

  /**
   * Pre-warm the mic permission + hardware by opening a brief
   * getUserMedia stream, then closing it. Solves the "press mic
   * twice to start" bug: on the first-ever tap, some browsers pop
   * the permission prompt synchronously which steals focus and
   * cancels the in-flight Web Speech start. By requesting the mic
   * ourselves BEFORE calling recognition.start(), permission is
   * resolved and audio hardware is hot by the time Web Speech
   * opens its own stream. Noise-suppression + echo-cancellation
   * are requested via constraints so Web Speech sees cleaner
   * audio on devices that honour them.
   */
  async prewarmMic(): Promise<void> {
    if (this.micPreWarmed) return;
    if (typeof navigator === 'undefined') return;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      // Close the stream immediately — Web Speech opens its own. We
      // only needed the permission grant + device warm-up.
      stream.getTracks().forEach((t) => t.stop());
      this.micPreWarmed = true;
    } catch {
      // Permission denied or no mic — don't flip the flag so we can
      // retry on the next tap. The error surfaces through
      // recognition.onerror in the normal flow.
    }
  }

  startListening(options: StartListeningOptions = {}): boolean {
    // Capability snapshot on EVERY start attempt — this is the diagnostic
    // payload that turns a "dead mic on a weird iPhone" report into a
    // concrete cause in the audit stream.
    const caps = this.capabilitySnapshot();
    this.audit('mic-start-requested', `mic tap — supported=${this.isSupported()}`, caps);

    if (!this.isSupported()) {
      this.audit('mic-start-failed', 'Web Speech recognition unsupported on this platform', caps);
      return false;
    }
    if (this.listening || this.nativeListening) return true;

    this.interimHandler = options.onInterim ?? null;
    this.endHandler = options.onEnd ?? null;
    this.errorHandler = options.onError ?? null;
    this.speechStartHandler = options.onSpeechStart ?? null;
    this.speechStartFired = false;
    this.userStopped = false;
    this.restartAttempts = 0;

    // Native app (iOS/Android WKWebView): use the Capacitor speech plugin —
    // the browser Web Speech API is unavailable there. The flow is async; we
    // start it and optimistically report success (errors surface via
    // errorHandler), since startListening's contract is synchronous.
    if (this.isNativePlatform()) {
      this.nativeListening = true;
      void this.startNative();
      return true;
    }

    const SpeechRecognitionClass = this.getSpeechRecognitionClass();
    if (SpeechRecognitionClass == null) {
      this.audit('mic-start-failed', 'SpeechRecognition constructor missing despite isSupported', caps);
      return false;
    }

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
    this.nativeContinuous = false; // a user tap-off must NOT trigger an auto-restart
    this.clearNativeSilenceTimer();
    if (this.nativeListening) {
      this.nativeListening = false;
      // Manual stop (user tapped the mic off): iOS won't deliver its own
      // `listeningState:stopped` with the final transcript before we tear the
      // session down, and that event's guard then short-circuits — so a
      // tap-to-stop would LOSE the whole utterance and the coach would never
      // respond. Dispatch the latest partial as the final NOW (David
      // 2026-07-08: "Play does not respond when I talk to it").
      const pending = this.nativeLatest.trim();
      this.nativeLatest = '';
      void this.stopNative();
      if (pending) this.dispatchFinal(pending);
      this.endHandler?.();
      return;
    }
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

  /** (Re)arm the end-of-utterance silence timer. Cleared+reset on every partial
   *  so it only fires once speech has paused for NATIVE_SILENCE_MS. On fire it
   *  SUBMITS the utterance and executes a TURN-SUBMIT stop.
   *
   *  🔒 HALF-DUPLEX HOLDS — record and playback must NEVER overlap on the
   *  shared iOS AVAudioSession (proven crash, David 2026-07-11). The recognizer
   *  is torn down before the coach's reply plays. What changed for TURN-TAKING
   *  (David 2026-07-11 evening: "I want it to stay on… a natural conversation"):
   *  the stop keeps `nativeContinuous` armed and keeps the plugin listeners
   *  attached, so the 'stopped' event routes into restartNativeSession — which
   *  waits for the reply's TTS to START (the LLM gap — restarting inside it was
   *  the original continuous-mode crash) and then to FINISH, and only then
   *  re-arms the mic. Strictly serialized: mic OR voice, never both. */
  private armNativeSilenceTimer(): void {
    this.clearNativeSilenceTimer();
    this.nativeSilenceTimer = setTimeout(() => {
      this.nativeSilenceTimer = null;
      if (!this.nativeListening) return;
      // Dispatch the utterance NOW (the manual-stop lesson: iOS may not
      // deliver a final 'stopped' payload), then tear the engine down while
      // KEEPING listeners + the continuous flag — the 'stopped' event drives
      // the wait-for-reply → re-arm cycle. endHandler does NOT fire here: the
      // conversation is still live, so the mic button stays on.
      const pending = this.nativeLatest.trim();
      this.nativeLatest = '';
      this.speechStartFired = false;
      if (pending) {
        this.audit('mic-final-dispatched', `end-of-utterance submit: "${pending.slice(0, 60)}"`);
        this.dispatchFinal(pending);
      }
      this.nativeListening = false;
      void this.turnSubmitStopNative();
    }, NATIVE_SILENCE_MS);
  }

  /** Tear down the recognizer for a TURN-SUBMIT (conversation continues):
   *  stops the native session but KEEPS the plugin listeners attached, so the
   *  'listeningState: stopped' event fires and routes into the re-arm cycle.
   *  A safety timer covers the plugin variant where 'stopped' never arrives
   *  after an explicit stop() — without it the conversation would die silently
   *  with the button still on. */
  private async turnSubmitStopNative(): Promise<void> {
    try {
      const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
      await SpeechRecognition.stop().catch(() => { /* already stopped */ });
    } catch { /* plugin unavailable — the safety timer below still runs */ }
    setTimeout(() => {
      if (this.nativeContinuous && !this.userStopped && !this.nativeListening) {
        void this.restartNativeSession();
      }
    }, 3000);
  }

  private clearNativeSilenceTimer(): void {
    if (this.nativeSilenceTimer) {
      clearTimeout(this.nativeSilenceTimer);
      this.nativeSilenceTimer = null;
    }
  }

  /** Re-arm the native recognizer for TURN-TAKING conversation mode. Runs
   *  after every recognizer teardown (turn-submit, iOS ~1-min session cap)
   *  while `nativeContinuous` is armed. THE crash constraint drives the shape:
   *  record and playback must never overlap, so the restart is TWO-PHASE:
   *  Phase A — wait for the coach's reply TTS to START (up to
   *    REPLY_START_WAIT_MS: the LLM round-trip means playback is silent for
   *    seconds after submit; restarting inside that gap put the mic under the
   *    incoming reply — the original continuous-mode crash). If no reply ever
   *    speaks (voice off / silent verbosity), fall through and re-arm.
   *  Phase B — wait for playback to FINISH, requiring
   *    PLAYBACK_IDLE_CONFIRM_MS of continuous silence (sentence-chained TTS
   *    goes briefly idle between sentences).
   *  Then settle the audio route and start the recognizer. Listeners persist
   *  from startNative — only start() is called again. */
  private async restartNativeSession(): Promise<void> {
    if (this.nativeRestarting) return;
    this.nativeRestarting = true;
    try {
      const aborted = (): boolean => this.userStopped || !this.nativeContinuous;
      // Phase A — give the reply time to start speaking.
      let waitedForStart = 0;
      while (!this.voiceServiceRef?.isPlaying() && waitedForStart < REPLY_START_WAIT_MS) {
        await new Promise((r) => setTimeout(r, 200));
        waitedForStart += 200;
        if (aborted()) return;
      }
      // Phase B — wait until playback has been idle for the confirm window.
      let idleMs = 0;
      let waitedTotal = 0;
      while (idleMs < PLAYBACK_IDLE_CONFIRM_MS && waitedTotal < REPLY_FINISH_MAX_MS) {
        await new Promise((r) => setTimeout(r, 150));
        waitedTotal += 150;
        idleMs = this.voiceServiceRef?.isPlaying() ? 0 : idleMs + 150;
        if (aborted()) return;
      }
      if (aborted() || !this.nativeSR || this.nativeListening) return;
      await new Promise((r) => setTimeout(r, 300)); // let the playback route release
      if (aborted() || this.voiceServiceRef?.isPlaying()) {
        // A late narration grabbed the session — run the cycle again.
        this.nativeRestarting = false;
        void this.restartNativeSession();
        return;
      }
      await this.nativeSR.start({ language: 'en-US', maxResults: 2, partialResults: true, popup: false });
      this.nativeListening = true;
      this.audit('mic-started', 'native mic re-armed (turn-taking: reply finished)');
    } catch (e) {
      this.nativeListening = false;
      this.nativeContinuous = false;
      this.audit('mic-start-failed', `native re-arm threw: ${(e as Error)?.message ?? e}`);
      this.endHandler?.();
    } finally {
      this.nativeRestarting = false;
    }
  }

  /** Native recognition (Capacitor) — used inside the app shell where Web
   *  Speech is unavailable. Streams partial results; the latest partial is the
   *  utterance's final transcript when listening stops. iOS uses SFSpeechRecognizer
   *  + the NSMicrophone/NSSpeechRecognition usage strings injected at build. */
  private async startNative(): Promise<void> {
    try {
      const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');

      // PERMISSIONS FIRST. On iOS, SFSpeechRecognizer.isAvailable can read
      // FALSE until speech-recognition is authorized — so the old order
      // (available() before requestPermissions()) dead-ended on a bogus
      // "unavailable" before the user was ever asked (David 2026-06-27: the
      // external app says "mic is unavailable" on tap). requestPermissions()
      // asks for BOTH microphone + speech recognition. We also stop
      // swallowing the raw error (the old `.catch(() => ({available:false}))`
      // hid the real cause): a THROW here means the plugin isn't registered
      // or the Info.plist usage strings are missing → that's 'unavailable',
      // not a user denial.
      let permState = 'unknown';
      try {
        const perm = await SpeechRecognition.requestPermissions();
        permState = perm.speechRecognition;
      } catch (e) {
        permState = `threw:${(e as Error)?.message ?? e}`;
      }
      if (permState !== 'granted') {
        this.nativeListening = false;
        this.audit('mic-start-failed', `native permission ${permState}`, { permState, ...this.capabilitySnapshot() });
        // A real 'denied'/'prompt' → the user can re-grant (permission-denied
        // copy). A throw (missing Info.plist string / unregistered plugin) is
        // a build problem, not a user choice → 'unavailable' copy.
        this.errorHandler?.(permState.startsWith('threw:') ? 'unavailable' : 'permission-denied');
        this.endHandler?.();
        return;
      }

      // available() is now ADVISORY — capture it for diagnosis but do NOT
      // hard-bail on false. Some plugin/locale combos report available:false
      // immediately after a fresh grant; if it's genuinely unusable, start()
      // throws below and we surface the REAL reason instead of a swallowed
      // default.
      let availRaw: unknown = 'unknown';
      try { availRaw = await SpeechRecognition.available(); }
      catch (e) { availRaw = `threw:${(e as Error)?.message ?? e}`; }
      this.audit('mic-start-requested', 'native permission granted; starting', { available: availRaw, permState });

      // Cache the plugin + voiceService handles so the silence timer's
      // dispatch-and-continue and the iOS session-cap auto-restart can run
      // without re-importing, and so the hot partials path can synchronously
      // check whether the coach is speaking.
      this.nativeSR = SpeechRecognition as unknown as { start: (o: Record<string, unknown>) => Promise<void> };
      try { this.voiceServiceRef = (await import('./voiceService')).voiceService; } catch { /* echo guard degrades to off */ }

      await SpeechRecognition.removeAllListeners();
      await SpeechRecognition.addListener('partialResults', (data: { matches: string[] }) => {
        const m = data.matches?.[0]?.trim();
        if (!m) return;
        // ECHO GUARD (continuous mode): the mic stays hot while the coach speaks
        // its reply, so it would capture the coach's OWN voice and send it back
        // → an infinite self-conversation. Drop anything heard while TTS is
        // playing, and clear any half-captured tail, so only the user's speech
        // (after the coach finishes) is ever submitted.
        if (this.voiceServiceRef?.isPlaying()) {
          this.nativeLatest = '';
          this.clearNativeSilenceTimer();
          return;
        }
        this.nativeLatest = m;
        if (!this.speechStartFired) {
          this.speechStartFired = true;
          this.speechStartHandler?.();
          this.audit('mic-heard-speech', `native partial heard: "${m.slice(0, 60)}"`);
        }
        this.interimHandler?.(m);
        // End-of-utterance detection: reset the silence timer on every partial;
        // when speech pauses for NATIVE_SILENCE_MS, stop + submit automatically
        // (iOS never does this itself). Without it the utterance is captured but
        // never sent unless the user taps the mic a second time.
        this.armNativeSilenceTimer();
      });
      await SpeechRecognition.addListener('listeningState', (data: { status: 'started' | 'stopped' }) => {
        if (data.status !== 'stopped') return;
        this.clearNativeSilenceTimer();
        this.audit(
          'mic-native-stopped',
          `native session stopped; pending="${this.nativeLatest.trim().slice(0, 60)}" listening=${this.nativeListening}`,
        );
        // The recognizer stopped. In CONTINUOUS mode this is almost always iOS
        // capping a single SFSpeechRecognizer session (~1 min), NOT the user —
        // so dispatch whatever was pending and AUTO-RESTART to keep the mic on
        // for the next turn. Only a real user stop (userStopped) ends it.
        const final = this.nativeLatest.trim();
        this.nativeLatest = '';
        this.speechStartFired = false;
        // The recognizer is down either way; isListening() must say so while
        // the re-arm cycle waits out the coach's reply.
        this.nativeListening = false;
        if (final) {
          this.audit('mic-final-dispatched', `session-stop submit: "${final.slice(0, 60)}"`);
          this.dispatchFinal(final);
        }
        if (this.nativeContinuous && !this.userStopped) {
          void this.restartNativeSession();
          return;
        }
        this.endHandler?.();
      });
      // iOS shared-AVAudioSession crash guard (David 2026-07-11). The audit
      // proved it: starting the native recognizer's audio engine while Polly
      // TTS is ACTIVELY playing on the same AVAudioSession throws an uncaught
      // native exception → hard app crash (mic tap → "permission granted;
      // starting" → app-boot, no `mic-started`). When no TTS was playing the
      // start was clean. So STOP any in-flight narration and let iOS tear down
      // the playback route before the recognizer reconfigures the session for
      // record — starting in the same tick can still collide. Lazy import so
      // voiceInputService keeps no hard dep on voiceService.
      try { this.voiceServiceRef?.stop(); } catch { /* never block the mic on a TTS-stop failure */ }
      await new Promise((resolve) => setTimeout(resolve, 150));
      await SpeechRecognition.start({ language: 'en-US', maxResults: 2, partialResults: true, popup: false });
      // CONVERSATION MODE (turn-taking, David 2026-07-11): one tap arms a
      // whole back-and-forth. Each pause auto-submits and tears the
      // recognizer down (half-duplex — record and playback never overlap);
      // restartNativeSession re-arms it only after the coach's reply has
      // finished speaking. Only a tap-off (or backgrounding/error) ends it.
      this.nativeContinuous = true;
      this.audit('mic-started', 'native speech recognition started (conversation mode)');
    } catch (e) {
      this.nativeListening = false;
      this.audit('mic-start-failed', `native start threw: ${(e as Error)?.message ?? e}`, this.capabilitySnapshot());
      this.errorHandler?.('unavailable');
      this.endHandler?.();
    }
  }

  private async stopNative(): Promise<void> {
    try {
      const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
      await SpeechRecognition.stop().catch(() => {});
      await SpeechRecognition.removeAllListeners().catch(() => {});
    } catch { /* plugin unavailable — nothing to stop */ }
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
  /** PLAYBACK-SIDE GATE (turn-taking, 2026-07-11): called by voiceService
   *  right before it starts ANY audio. If the native recognizer is live
   *  (e.g. the mic re-armed during a quiet gap and a late narration then
   *  fires), tear it down FIRST — playback starting over a live recognizer
   *  is the same AVAudioSession overlap that crashed the app, just in the
   *  other order. The captured tail is dropped (it would be echo anyway);
   *  the conversation re-arm cycle brings the mic back after this playback
   *  finishes. No-op on web / when the mic is off. */
  async yieldForPlayback(): Promise<void> {
    if (!this.nativeListening) return;
    this.audit('mic-native-stopped', 'yielding mic for incoming playback (turn-taking gate)');
    this.clearNativeSilenceTimer();
    this.nativeLatest = '';
    this.speechStartFired = false;
    this.nativeListening = false;
    try {
      const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
      await SpeechRecognition.stop().catch(() => { /* already stopped */ });
    } catch { /* plugin unavailable */ }
    // Give iOS a beat to release the record route before playback claims it.
    await new Promise((r) => setTimeout(r, 250));
  }

  /** True while conversation mode is armed (the tap-on…tap-off window),
   *  even during the phases where the recognizer itself is torn down
   *  (reply playing / waiting to re-arm). UI uses this to keep the mic
   *  button lit across the whole back-and-forth. */
  isConversationActive(): boolean {
    return this.nativeContinuous;
  }

  onResult(handler: ResultHandler): () => void {
    this.resultHandlers.push(handler);
    return () => {
      const idx = this.resultHandlers.indexOf(handler);
      if (idx >= 0) this.resultHandlers.splice(idx, 1);
    };
  }

  isListening(): boolean {
    return this.listening || this.nativeListening;
  }

  private getSpeechRecognitionClass(): SpeechRecognitionConstructor | null {
    const win = window as unknown as Record<string, unknown>;
    const klass = (win.SpeechRecognition ?? win.webkitSpeechRecognition) as
      | SpeechRecognitionConstructor
      | undefined;
    return klass ?? null;
  }

  private createAndStart(SpeechRecognitionClass: SpeechRecognitionConstructor, isRestart = false): boolean {
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
      let finalConfidence = 0;
      let finalSegments = 0;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
          finalConfidence += result[0].confidence || 0;
          finalSegments += 1;
        } else {
          interimText += result[0].transcript;
        }
      }
      // Noise / cross-talk filter: reject finals that look like
      // background chatter or mic pops picked up while the student
      // wasn't actually addressing the coach. Three signals, any of
      // which drops the transcript:
      //   1. Low average confidence (< 0.55) — Web Speech is unsure
      //   2. Single-word noise (just "the", "uh", "yeah", "okay", etc.)
      //   3. Very short non-greeting (< 2 chars)
      // Greetings are allowed through even if short/single-word.
      if (finalText && finalSegments > 0) {
        const avgConfidence = finalConfidence / finalSegments;
        const trimmed = finalText.trim();
        if (shouldDropAsNoise(trimmed, avgConfidence)) {
          // Swallow the noise — reset per-utterance state so the next
          // real utterance starts clean.
          this.latestInterim = '';
          this.speechStartFired = false;
          this.finalDispatched = false;
          return;
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
        // The classic "mic looks like it's trying but never returns a
        // transcript" symptom: recognition keeps ending with no result and
        // we restart until the cap, then give up. Now visible in the stream.
        this.audit(
          'mic-gave-up',
          `auto-restart thrashed past ${MAX_RESTART_ATTEMPTS} attempts without a transcript`,
          this.capabilitySnapshot(),
        );
        this.errorHandler?.('thrashing');
        this.endHandler?.();
        return;
      }
      const klass = this.getSpeechRecognitionClass();
      if (!klass) {
        this.listening = false;
        this.audit('mic-start-failed', 'SpeechRecognition constructor vanished mid-session', this.capabilitySnapshot());
        this.errorHandler?.('unavailable');
        this.endHandler?.();
        return;
      }
      // Fresh instance avoids "InvalidStateError: already started"
      // when we restart immediately after a stop.
      this.createAndStart(klass, true);
    };

    this.recognition.onerror = (event: { error: string }) => {
      const err = event.error;
      // The RAW error string is the single most useful diagnostic for a dead
      // mic on an unfamiliar device — capture it ALWAYS, before any branching.
      this.audit('mic-error', `recognition error: ${err}`, { error: err, ...this.capabilitySnapshot() });
      // Permission denial is terminal — no point retrying, the user has to
      // re-grant. `service-not-allowed` on iOS specifically means Dictation /
      // Siri is disabled (Settings → General → Keyboard → Enable Dictation).
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        this.userStopped = true;
        this.errorHandler?.('permission-denied');
      } else if (err === 'audio-capture') {
        // Mic hardware missing / in use by another app.
        this.errorHandler?.('unavailable');
      } else if (err === 'network' || err === 'language-not-supported') {
        // network = the platform's server-based recognition is unreachable
        // (iOS uses Apple's servers for some locales — the "trying to collect
        // an audio sample" stall). language-not-supported = no recognizer for
        // the locale. Both leave the mic dead, so surface them instead of
        // silently thrash-restarting until the cap.
        this.userStopped = true;
        this.errorHandler?.('unavailable');
      }
      // 'no-speech' / 'aborted' are benign — let `onend` handle the restart.
    };

    try {
      this.recognition.start();
      // Audit the FIRST start only — transparent restarts (continuous mode
      // between utterances) would otherwise spam the stream.
      if (!isRestart) this.audit('mic-started', 'recognition.start() succeeded');
      return true;
    } catch (err) {
      // Previously swallowed silently — this catch is exactly where a "weird
      // iPhone" mic dies with zero trace. Capture the throw + capabilities.
      const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      this.audit('mic-start-failed', `recognition.start() threw: ${detail}`, this.capabilitySnapshot());
      return false;
    }
  }

  // ─── Lifecycle listeners ──────────────────────────────────────────

  /** Bound listener refs so add/remove match. Created lazily so SSR
   *  builds don't reference `document` at module load. */
  private visibilityListener: (() => void) | null = null;
  private pageHideListener: (() => void) | null = null;
  private deviceChangeListener: (() => void) | null = null;

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
    // Audio-route changes: BT headset connect/disconnect fires
    // `devicechange` on navigator.mediaDevices. The Web Speech API
    // doesn't automatically re-select the new mic — we have to
    // restart recognition so the platform re-opens with the new
    // input route. Only restart if we were already listening AND
    // not manually stopped.
    this.deviceChangeListener = () => {
      if (!this.listening || this.userStopped) return;
      // Flag as transient so onend doesn't count it toward the
      // thrash cap. Quick stop+restart refreshes mic selection.
      const klass = this.getSpeechRecognitionClass();
      if (!klass) return;
      try {
        this.recognition?.stop();
      } catch {
        /* already stopping */
      }
      // Restart after a tick so the browser settles the route
      // change before we re-open.
      setTimeout(() => {
        if (this.listening && !this.userStopped) {
          const k = this.getSpeechRecognitionClass();
          if (k) this.createAndStart(k);
        }
      }, 250);
    };
    document.addEventListener('visibilitychange', this.visibilityListener);
    // `pagehide` covers iOS Safari / PWA background & unload in a way
    // `beforeunload` doesn't. Add both for best coverage.
    window.addEventListener('pagehide', this.pageHideListener);
    window.addEventListener('beforeunload', this.pageHideListener);
    // navigator.mediaDevices types as non-null in TS lib but can be
    // undefined on older browsers / insecure contexts / file://.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener('devicechange', this.deviceChangeListener);
    }
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
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (this.deviceChangeListener && typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.removeEventListener('devicechange', this.deviceChangeListener);
      this.deviceChangeListener = null;
    }
  }

  private dispatchFinal(text: string): void {
    if (this.finalDispatched) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    // Pipeline visibility (David 2026-07-09): record every finalized transcript
    // + how many handlers receive it, so a "captured but no coach response"
    // failure is diagnosable from the stream instead of guessed.
    this.audit(
      'mic-final-dispatched',
      `dispatch "${trimmed.slice(0, 60)}" → ${this.resultHandlers.length} handler(s)`,
    );
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
