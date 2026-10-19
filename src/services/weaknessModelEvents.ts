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

// ONE BURST, ONE RE-READ (David's phone, 2026-10-19: hot and slow in Learn).
// A Learn move writes several evidence rows, and every write used to make each
// RELOADING reader re-read the whole record — on a real record (9,800 evidence
// rows) that was the game's CPU: 14 plies in 408s and a stalled reply, against
// 49 plies in 170s on an empty one. Cache INVALIDATION stays synchronous (it is
// free and keeps the next read correct); a reader that RELOADS subscribes to the
// settled notice, which fires once after a burst of writes goes quiet.
const settledListeners = new Set<Listener>();
export const SETTLE_MS = 600;
let settleTimer: ReturnType<typeof setTimeout> | null = null;

/** Subscribe a RELOADING reader: called once after a burst of record writes.
 *  Returns the unsubscribe. */
export function onWeaknessModelSettled(cb: Listener): () => void {
  settledListeners.add(cb);
  return () => { settledListeners.delete(cb); };
}

function fireSettled(): void {
  settleTimer = null;
  for (const cb of [...settledListeners]) {
    try { cb(); } catch { /* a listener's failure is its own */ }
  }
}

/** Fire after a row that feeds the weakness spine has been WRITTEN
 *  (misconception tag, mistake puzzle). Listeners must never throw upward —
 *  a failed refresh is a stale read, not a broken write. */
export function emitWeaknessModelChanged(): void {
  for (const cb of [...listeners]) {
    try { cb(); } catch { /* a listener's failure is its own */ }
  }
  if (settledListeners.size === 0) return;
  if (settleTimer) clearTimeout(settleTimer);
  settleTimer = setTimeout(fireSettled, SETTLE_MS);
}

/** Test hook — forget every listener. */
export function __resetWeaknessModelListenersForTests(): void {
  listeners.clear();
  settledListeners.clear();
  if (settleTimer) clearTimeout(settleTimer);
  settleTimer = null;
}
