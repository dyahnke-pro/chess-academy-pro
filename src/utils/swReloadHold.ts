// Service-worker HANDOVER hold — keeps a fresh deploy from yanking a live session.
//
// 🔒 WHAT THIS GATES CHANGED ON 2026-09-19, AND THE OLD DESCRIPTION IS DELETED
// RATHER THAN ANNOTATED (the Lake Butler rule). It used to read: "the PWA
// updates with skipWaiting:true + clientsClaim:true … surfaces acquire a hold
// and the index.html handler defers the RELOAD until every hold is released."
// That was the mechanism, and the mechanism was the bug.
//
// Deferring the reload never protected anything. The new worker had already
// activated (skipWaiting), `cleanupOutdatedCaches` had already deleted the
// precache the running page was executing out of, and it had already claimed
// that page (clientsClaim). All the hold did was keep a session alive on top
// of code that no longer existed — so instead of a jarring reload, the next
// lazy chunk or Web Worker fetch asked for a hashed file the deploy no longer
// serves and the page died. Caught on David's iPhone 2026-09-19: `stockfish-
// error` (worker load failure), `lichess-error TypeError: Load failed`,
// `sw-lifecycle installed → activating → controllerchange → activated`,
// `pagehide persisted=false`, and no `app-boot` on reopen. A watcher standing
// downstream of the damage — exactly what CLAUDE.md means by "a gate that
// fires means the wrong thing was still possible".
//
// NOW: sw.js ships skipWaiting:false + clientsClaim:false (vite.config.ts), so
// a new worker installs and WAITS, touching nothing. The hold gates the ASK —
// index.html posts SKIP_WAITING to the waiting worker only while no hold is
// held, and retries at the next quiet moment otherwise. The reload that
// follows `controllerchange` is now unconditional, because by then the
// handover has happened and the old bundle really is gone.
//
// So: holding no longer means "delay the reload". It means "do not hand over
// yet" — the session keeps its code, not just its scroll position. The API is
// unchanged; every existing call site got safer without moving.
//
// Surfaces with in-memory session state acquire a hold while active. Ref-
// counted so overlapping surfaces (a review walk opened from a live game)
// compose safely.

declare global {
  interface Window {
    __HOLD_SW_RELOAD__?: boolean;
  }
}

let holds = 0;

function sync(): void {
  if (typeof window !== 'undefined') {
    window.__HOLD_SW_RELOAD__ = holds > 0;
  }
}

/**
 * Acquire a hold that defers the service-worker HANDOVER — the page will not
 * ask a waiting worker to take over while any hold is held. Returns a release
 * function; releasing twice is a no-op. Meant for a React effect:
 *
 *   useEffect(() => {
 *     if (!sessionActive) return;
 *     return acquireSwReloadHold();
 *   }, [sessionActive]);
 */
export function acquireSwReloadHold(): () => void {
  holds += 1;
  sync();
  let released = false;
  return (): void => {
    if (released) return;
    released = true;
    holds = Math.max(0, holds - 1);
    sync();
  };
}

/** Current hold count — exposed for tests and the SW-lifecycle audit. */
export function swReloadHoldCount(): number {
  return holds;
}
