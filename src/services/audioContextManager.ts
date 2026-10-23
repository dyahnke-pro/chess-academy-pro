// Shared AudioContext with iOS WKWebView unlock pattern.
//
// On iOS, AudioContext starts suspended and may only be resumed during a
// user-gesture handler. This module holds a single shared context and
// attaches capture-phase touchstart/mousedown listeners so it is unlocked
// on the very first user interaction — before any async TTS work begins.
//
// All services that use Web Audio (voiceService, soundService) share this
// single context so that piece-move sounds, previews, and coach speech all
// benefit from the same unlock.

let _ctx: AudioContext | null = null;
let _lastResumeError: string | null = null;

/**
 * ANY STATE BUT RUNNING AND CLOSED CAN BE RESUMED (David's iPhone, 2026-10-23:
 * no move sounds, no reward chimes, the voice still talking). WebKit reports
 * `interrupted`, not `suspended`, after a call, Siri or another app took the
 * audio session; every check here read `suspended` only, so an interrupted
 * context was never resumed and every Web Audio sound stayed silent until the
 * app was relaunched. The cloud voice plays through an <audio> element, which
 * is why it kept working.
 */
export function needsResume(ctx: AudioContext): boolean {
  const state = ctx.state as string;
  return state !== 'running' && state !== 'closed';
}

/** Play on the shared context now when it runs; otherwise resume it first and
 *  play once it does (a resume refused outside a gesture plays nothing, and
 *  the next tap's unlock listener resumes it for the sound after). */
export function playWhenRunning(play: (ctx: AudioContext) => void): void {
  const ctx = getSharedAudioContext();
  if (!needsResume(ctx)) { play(ctx); return; }
  void ctx.resume()
    .then(() => { if (!needsResume(ctx)) play(ctx); })
    .catch((err: unknown) => { _lastResumeError = err instanceof Error ? err.message : String(err); });
}

function _tryResume(ctx: AudioContext): void {
  if (needsResume(ctx)) {
    // resume() rejects on iOS when the system audio session can't start
    // (foreground audio interruption, hardware unavailable). We catch
    // it here so it doesn't propagate as an unhandled rejection — the
    // voice service's per-call playAudioBuffer detects suspended state
    // separately and falls through to Web Speech.
    void ctx.resume().catch((err: unknown) => {
      _lastResumeError = err instanceof Error ? err.message : String(err);
    });
  }
}

let _listenersAttached = false;

function _attachUnlockListeners(): void {
  // Attach ONCE. Do NOT remove the listeners after the first resume — the
  // context can be SUSPENDED AGAIN whenever the app is backgrounded / the
  // iOS audio session is interrupted (a call, Siri, a notification, a
  // Bluetooth route change). If we tear the listeners down after the first
  // unlock, the next tap can't re-resume it and ALL Web Audio (board
  // sounds + coach voice) stays dead until a full relaunch — exactly the
  // native-app silence David hit (audio worked on web/Vercel, where the
  // session isn't torn down the same way). The handler is a cheap state
  // check when the context is already running, so leaving it attached is
  // free. (David 2026-06-04.)
  if (_listenersAttached) return;
  _listenersAttached = true;
  // The CURRENT context, never the one these listeners were attached for: a
  // closed context is replaced, and the replacement needs the same unlock.
  const handler = (): void => { if (_ctx) _tryResume(_ctx); };
  document.addEventListener('touchstart', handler, { passive: true, capture: true });
  document.addEventListener('mousedown', handler, { passive: true, capture: true });
  // Foreground recovery: when the tab/app becomes visible again, the
  // context may be suspended from the time in the background. Resume it
  // proactively so the first sound after returning isn't dropped.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && _ctx) _tryResume(_ctx);
  });
}

/** Returns the shared AudioContext, creating it on first call. */
export function getSharedAudioContext(): AudioContext {
  if (!_ctx || _ctx.state === 'closed') {
    _ctx = new AudioContext();
    // ALWAYS, not only when it starts suspended: a context created running
    // (inside a gesture) is suspended or interrupted later just the same, and
    // without the listeners no tap ever woke it again.
    _attachUnlockListeners();
  }
  return _ctx;
}

/**
 * Call this synchronously inside a user-gesture handler (click, touchend)
 * to unlock the AudioContext immediately, before any async work begins.
 * Safe to call multiple times.
 */
export function unlockAudioContext(): void {
  _tryResume(getSharedAudioContext());
}
