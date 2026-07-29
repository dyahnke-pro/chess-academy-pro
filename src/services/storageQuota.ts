/**
 * storageQuota
 * ------------
 * Thin wrapper around navigator.storage.estimate() so feature code
 * can check storage headroom before expensive Dexie writes (bulk
 * game imports, puzzle sync, sideline generation). iOS PWA storage
 * can be tight — the security/perf audits both flagged silent
 * data-loss on quota-exceeded as a real risk.
 *
 * When the API isn't available (SSR, older browsers, secure-context
 * rules), callers get `null` and should proceed as if there's no
 * quota signal to respect. Fail-open by design — we don't want to
 * block a user's data just because the browser doesn't expose the
 * API.
 */

export interface StorageHeadroom {
  /** Estimated bytes currently used by this origin. */
  usedBytes: number;
  /** Estimated bytes available before the origin hits its cap. */
  quotaBytes: number;
  /** Usage / quota as a 0-1 fraction. Higher = closer to full. */
  usageRatio: number;
}

/**
 * Return the current storage headroom, or null when the browser
 * doesn't expose navigator.storage.estimate. Cheap — can be called
 * per-write if desired.
 */
export async function getStorageHeadroom(): Promise<StorageHeadroom | null> {
  if (typeof navigator === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!navigator.storage?.estimate) return null;
  try {
    const est = await navigator.storage.estimate();
    const used = est.usage ?? 0;
    const quota = est.quota ?? 0;
    if (quota <= 0) return null;
    return {
      usedBytes: used,
      quotaBytes: quota,
      usageRatio: used / quota,
    };
  } catch {
    return null;
  }
}

/**
 * True when the origin is using more than 90% of its storage quota —
 * a good gate for large writes (bulk imports) so we can bail early
 * with a user-visible error instead of silently losing data when
 * Dexie's put() throws quota-exceeded.
 */
export async function isStorageNearlyFull(threshold = 0.9): Promise<boolean> {
  const headroom = await getStorageHeadroom();
  if (!headroom) return false;
  return headroom.usageRatio >= threshold;
}

/** Outcome of a persistent-storage request. */
export interface PersistenceState {
  /** Browser exposes navigator.storage.persist / .persisted. */
  supported: boolean;
  /** Storage is persistent (exempt from eviction) after this call. */
  persisted: boolean;
  /** It was ALREADY persistent — we didn't need to ask. */
  alreadyPersisted: boolean;
}

/**
 * Ask the browser to make this origin's storage PERSISTENT — i.e. exempt from
 * automatic eviction.
 *
 * WHY THIS EXISTS (David 2026-07-29). Without a persistence grant every
 * browser treats IndexedDB as "best-effort" and WebKit evicts it from origins
 * that haven't been used recently. The analytics proved it was happening to
 * real testers: per-device, the share of app opens that had to re-run
 * first-run calibration (i.e. booted with an EMPTY Dexie) tracked inversely
 * with how often the device was opened —
 *
 *     402x874  141 opens → 101 fresh profiles (72%)
 *     440x956   80 opens →  62 fresh profiles (78%)
 *     430x932  419 opens →  28 fresh profiles ( 7%)   ← daily user, kept data
 *
 * Infrequent users lost EVERYTHING between sessions (profile, rating, unlocked
 * openings, ladder progress, SRS history, imported games) and came back to a
 * blank app — which also minted a fresh analytics identity, so ~20 real
 * installs looked like 340 one-and-done "users". This is the documented fix.
 *
 * Fail-open and total, like the rest of this module: a browser without the API
 * (or a rejected request) returns `persisted: false` and the app carries on
 * exactly as before. Callers should treat this as advisory telemetry, never a
 * gate on a feature path.
 */
export async function requestPersistentStorage(): Promise<PersistenceState> {
  // Single-flight for the process. React StrictMode double-invokes the boot
  // effect in dev (the audit caught persist() firing twice), and any future
  // caller shouldn't be able to re-ask either — a repeat persist() can surface
  // a permission prompt on some engines. Memoizing the PROMISE also collapses
  // concurrent callers into one request.
  inFlightRequest ??= resolvePersistentStorage();
  return inFlightRequest;
}

let inFlightRequest: Promise<PersistenceState> | null = null;

/** Test-only: forget the memoized grant so each case starts clean. */
export function __resetPersistenceRequestForTests(): void {
  inFlightRequest = null;
}

async function resolvePersistentStorage(): Promise<PersistenceState> {
  const unsupported: PersistenceState = {
    supported: false,
    persisted: false,
    alreadyPersisted: false,
  };
  if (typeof navigator === 'undefined') return unsupported;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!navigator.storage?.persist || !navigator.storage.persisted) return unsupported;

  try {
    // Never re-ask when the grant already exists — on some engines a repeat
    // persist() can surface a permission prompt.
    const already = await navigator.storage.persisted();
    if (already) return { supported: true, persisted: true, alreadyPersisted: true };

    const granted = await navigator.storage.persist();
    return { supported: true, persisted: granted, alreadyPersisted: false };
  } catch {
    return { supported: true, persisted: false, alreadyPersisted: false };
  }
}
