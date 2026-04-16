// Hard-refresh utility: clears PWA caches + service workers, then reloads.
//
// Why: vite-plugin-pwa runs with `registerType: 'autoUpdate'` and the SW
// normally updates on its own. But installed PWAs (iOS home-screen app,
// TestFlight build, desktop install) can stay pinned to a stale cache when
// the background update check hasn't run yet. Sharing the app with others
// means we need a one-tap "give me the new version" action they can use.
//
// What this does NOT touch: IndexedDB (Dexie). User progress — puzzles,
// openings, games, SRS cards — is preserved. For a full wipe, use the
// "Reset All Data" button in Settings > About.

interface HardRefreshOptions {
  /** Reload function; overridable for tests. */
  reload?: () => void;
}

/**
 * Clear all Cache Storage entries + unregister service workers, then reload.
 *
 * Resolves with `true` on success, `false` if any step threw (the reload
 * still fires on failure — a stale SW shouldn't trap the user).
 */
export async function hardRefresh(options: HardRefreshOptions = {}): Promise<boolean> {
  const reload = options.reload ?? ((): void => {
    window.location.reload();
  });

  let ok = true;

  try {
    await clearAllCaches();
  } catch (err) {
    ok = false;
    console.warn('[hardRefresh] cache clear failed', err);
  }

  try {
    await unregisterServiceWorkers();
  } catch (err) {
    ok = false;
    console.warn('[hardRefresh] SW unregister failed', err);
  }

  reload();
  return ok;
}

async function clearAllCaches(): Promise<void> {
  if (typeof caches === 'undefined') return;
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
}

async function unregisterServiceWorkers(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((reg) => reg.unregister()));
}
