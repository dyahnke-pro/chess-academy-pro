/**
 * withTimeout — race a promise against a timer with a typed result.
 * WO-COACH-RESILIENCE.
 *
 * Returns a discriminated result rather than throwing. The caller
 * decides what to do on timeout — fall through to a fallback chain,
 * surface an error to the user, or reject the upstream caller.
 *
 * Why a discriminated result instead of throw?
 *   - The coach-turn pipeline branches behaviorally on timeout
 *     (Level 1 retry without Stockfish, Level 2 retry without any
 *     data tools, Level 3 deterministic fallback). Try / catch with
 *     Error.message string-matching is brittle; a typed
 *     `{ ok: false, reason: 'timeout' }` lets each tier check the
 *     shape and chain.
 *   - The label travels with the timeout result so audit logs can
 *     name the layer that timed out without a separate parameter.
 *
 * Timer hygiene: the rejection branch clears the timer on resolve to
 * avoid keeping the event loop alive on a long-running test or
 * leaking a setTimeout handle inside a long-lived service.
 */

export type WithTimeoutResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: 'timeout'; label: string };

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<WithTimeoutResult<T>> {
  return new Promise<WithTimeoutResult<T>>((resolve, reject) => {
    const timer = setTimeout(() => {
      resolve({ ok: false, reason: 'timeout', label });
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve({ ok: true, value });
      },
      (err: unknown) => {
        clearTimeout(timer);
        // Real rejections propagate to the caller's try / catch.
        // Only timeouts take the discriminated `{ ok: false }` path.
        reject(err instanceof Error ? err : new Error(String(err)));
      },
    );
  });
}
