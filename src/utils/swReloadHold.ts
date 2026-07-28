// Service-worker reload hold — keeps a fresh deploy from yanking a live session.
//
// The PWA updates with `skipWaiting: true` + `clientsClaim: true`, and an
// inline script in index.html reloads the page on `controllerchange` so
// testers pick up new bundles without getting pinned to stale ones. That
// reload is correct on an idle dashboard and catastrophic mid-session: a
// deploy landing while a walkthrough narrates or a coach game is live
// hard-reloads the page and destroys the session (caught live 2026-07-28 —
// the app's own audit trail showed `coach-narration-spoken` at 23:05:19,
// `controllerchange — new bundle taking over` the same second, and a cold
// `route-changed (initial)` two seconds later).
//
// Surfaces with in-memory session state acquire a hold while active; the
// index.html handler polls `window.__HOLD_SW_RELOAD__` and defers the reload
// until every hold is released. Ref-counted so overlapping surfaces (a
// review walk opened from a live game) compose safely.

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
 * Acquire a hold that defers the service-worker update reload. Returns a
 * release function; releasing twice is a no-op. Meant for a React effect:
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
