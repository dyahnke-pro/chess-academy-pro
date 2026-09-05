import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 🔒 A BACKGROUNDED PAGE MUST NOT BE MISTAKEN FOR A DEAD ENGINE
// (David 2026-09-05, from his own device's audit stream).
//
// iOS suspends the WebView when the app leaves the foreground. The worker stops
// executing and so do the page's timers, so on resume every watchdog fires at
// once and a healthy engine is indistinguishable from one that never answered.
//
// The teardown that follows is costly by itself, but the real damage is the
// DEMOTE: an `ios-native` runtime stall drops the engine to asm.js for the whole
// SESSION. One app-switch while the coach was thinking therefore pins the user
// to the slowest engine we ship — every coach answer, review and sweep — until
// they relaunch. That is what these tests exist to prevent.
//
// Observed on device, in order:
//   stockfish-analysis-stalled   variant=ios-native depth=18  (no bestmove 12s)
//   stockfish-analysis-stalled   resetting worker             (no bestmove 30s)
//   stockfish-variant-fallback   ios-native → demoted to asm.js for the session

const audits: { kind: string; summary: string }[] = [];
vi.mock('./appAuditor', () => ({
  logAppAudit: (e: { kind: string; summary: string }) => { audits.push(e); return Promise.resolve(); },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web', isPluginAvailable: () => false },
  registerPlugin: () => ({}),
  WebPlugin: function WebPlugin() { /* export must exist */ },
}));

/** Drive document.visibilityState + fire the event the guard listens on. */
function setVisibility(state: 'visible' | 'hidden'): void {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

interface EngineInternals {
  pending: { hardTimeout?: ReturnType<typeof setTimeout> } | null;
  _hiddenDuringPending: boolean;
  _suspendReArmed: boolean;
  _nativeFallbackAttempted: boolean;
  workerVariant: string | null;
  worker: unknown;
  hookVisibility: () => void;
  recoverStuckAnalysis: (reason: string) => void;
}

/** The engine with a pending analysis staged, as if a search were in flight. */
async function stagedEngine(variant: string): Promise<EngineInternals> {
  const mod = await import('./stockfishEngine');
  const eng = mod.stockfishEngine as unknown as EngineInternals;
  eng.workerVariant = variant;
  eng.worker = { terminate: () => { /* noop */ }, postMessage: () => { /* noop */ } };
  eng.pending = { hardTimeout: undefined };
  eng._hiddenDuringPending = false;
  eng._suspendReArmed = false;
  eng._nativeFallbackAttempted = false;
  eng.hookVisibility();
  return eng;
}

beforeEach(() => {
  audits.length = 0;
  setVisibility('visible');
});
afterEach(() => { vi.useRealTimers(); });

describe('a suspended page is not an engine fault', () => {
  // THE RACE THIS CLOSES. handleAppResume() already resets the engine cleanly
  // (and without demoting) when the page comes back. But iOS freezes the page's
  // timers along with the worker, so on resume the pending hardTimeout AND the
  // visibilitychange both come due at once. If the timer wins the race,
  // recoverStuckAnalysis runs first and demotes ios-native for the session
  // before the resume handler ever gets to clean up. Whether the user keeps
  // their fast engine then depends on callback ordering — which is why the
  // slowness was intermittent. These tests pin the timer-wins ordering.

  it('does NOT demote ios-native when the timeout fires after a backgrounding', async () => {
    const eng = await stagedEngine('ios-native');
    setVisibility('hidden');                              // user switches apps
    eng.recoverStuckAnalysis('no bestmove in 30000ms');   // frozen timer wins the race

    expect(eng._nativeFallbackAttempted, 'a backgrounding must not cost the session its fast engine').toBe(false);
    expect(eng.pending, 'the in-flight analysis is kept for the resume handler').not.toBeNull();
    expect(audits.some((a) => /BACKGROUNDED/.test(a.summary))).toBe(true);
    expect(audits.some((a) => /demoted to asm/.test(a.summary))).toBe(false);
  });

  it('forgives the suspension exactly ONCE — a genuinely dead engine still recovers', async () => {
    const eng = await stagedEngine('ios-native');
    setVisibility('hidden');

    eng.recoverStuckAnalysis('no bestmove in 30000ms');   // forgiven, re-armed
    expect(eng.pending).not.toBeNull();

    // A second full window with no further suspension: the engine really is dead.
    eng.recoverStuckAnalysis('no bestmove in 30000ms');
    expect(eng.pending, 'the second failure must tear down').toBeNull();
    expect(eng._nativeFallbackAttempted, 'and demote, exactly as before').toBe(true);
  });

  it('a foreground stall still demotes immediately — the original fix is intact', async () => {
    const eng = await stagedEngine('ios-native');
    // Never hidden: a stall here really is the native plugin wedging.
    eng.recoverStuckAnalysis('no bestmove in 30000ms');
    expect(eng.pending).toBeNull();
    expect(eng._nativeFallbackAttempted).toBe(true);
    expect(audits.some((a) => /demoted to asm/.test(a.summary))).toBe(true);
  });

  it('an analysis dispatched while ALREADY hidden is forgiven too', async () => {
    // The page can be backgrounded before the search is even armed (a sweep
    // continuing after the user leaves). Same evidence, same forgiveness.
    const eng = await stagedEngine('ios-native');
    eng._hiddenDuringPending = true;
    eng.recoverStuckAnalysis('no bestmove in 30000ms');
    expect(eng._nativeFallbackAttempted).toBe(false);
    expect(eng.pending).not.toBeNull();
  });

  it('the OTHER ordering — resume wins the race — still cleans up without demoting', async () => {
    // Pins the pre-existing handleAppResume path so the guard above and it
    // cannot drift apart: either order must end with the fast engine intact.
    const eng = await stagedEngine('ios-native');
    setVisibility('hidden');
    setVisibility('visible');   // module-level listener → handleAppResume()

    expect(eng.pending, 'resume rejects the doomed analysis').toBeNull();
    expect(eng._nativeFallbackAttempted, 'and never demotes').toBe(false);
  });
});
