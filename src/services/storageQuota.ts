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
