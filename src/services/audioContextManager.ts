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

export function getLastAudioContextError(): string | null {
  return _lastResumeError;
}

function _tryResume(ctx: AudioContext): void {
  if (ctx.state === 'suspended') {
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

function _attachUnlockListeners(ctx: AudioContext): void {
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
  const handler = (): void => _tryResume(ctx);
  document.addEventListener('touchstart', handler, { passive: true, capture: true });
  document.addEventListener('mousedown', handler, { passive: true, capture: true });
  // Foreground recovery: when the tab/app becomes visible again, the
  // context may be suspended from the time in the background. Resume it
  // proactively so the first sound after returning isn't dropped.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') _tryResume(ctx);
  });
}

/** Returns the shared AudioContext, creating it on first call. */
export function getSharedAudioContext(): AudioContext {
  if (!_ctx || _ctx.state === 'closed') {
    _ctx = new AudioContext();
    if (_ctx.state === 'suspended') {
      _attachUnlockListeners(_ctx);
    }
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
