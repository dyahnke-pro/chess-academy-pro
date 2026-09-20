// weaknessModelEvents — ONE leaf signal: "the student model just changed".
//
// WHY A LEAF. `weaknessSignalLoader` memoizes the spine for 5 minutes and its
// `invalidateWeaknessSignals` had ZERO callers (measured 2026-09-20), so a slip
// recorded by the sweep did not reach the next narration until the cache aged
// out — the loop's record→speak wire had a five-minute hole in it. The writers
// cannot import the loader directly: `weaknessSpine` imports
// `misconceptionService`, so `misconceptionService → loader → weaknessSpine`
// would be a cycle. This module imports NOTHING; writers emit, readers listen.
//
// WO-LOOP-01 (David 2026-09-20: "get the main concept of the app working").

type Listener = () => void;

const listeners = new Set<Listener>();

/** Subscribe. Returns the unsubscribe. */
export function onWeaknessModelChanged(cb: Listener): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

/** Fire after a row that feeds the weakness spine has been WRITTEN
 *  (misconception tag, mistake puzzle). Listeners must never throw upward —
 *  a failed refresh is a stale read, not a broken write. */
export function emitWeaknessModelChanged(): void {
  for (const cb of [...listeners]) {
    try { cb(); } catch { /* a listener's failure is its own */ }
  }
}

/** Test hook — forget every listener. */
export function __resetWeaknessModelListenersForTests(): void {
  listeners.clear();
}
