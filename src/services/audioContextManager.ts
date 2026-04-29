// Shared AudioContext with iOS WKWebView unlock pattern.
//
// On iOS, AudioContext starts suspended and may only be resumed during a
// user-gesture handler. This module holds a single shared context and
// attaches capture-phase touchstart/mousedown listeners so it is unlocked
// on the very first user interaction — before any async TTS work begins.
//
// All services that use Web Audio (voicePackService, voiceService, soundService)
// share this single context so that piece-move sounds, previews, and coach
// speech all benefit from the same unlock.

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

function _attachUnlockListeners(ctx: AudioContext): void {
  const handler = (): void => {
    _tryResume(ctx);
    if (ctx.state === 'running') {
      document.removeEventListener('touchstart', handler, true);
      document.removeEventListener('mousedown', handler, true);
    }
  };
  document.addEventListener('touchstart', handler, { passive: true, capture: true });
  document.addEventListener('mousedown', handler, { passive: true, capture: true });
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
