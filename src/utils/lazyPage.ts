import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { logAppAudit } from '../services/appAuditor';

/**
 * A route page loaded on first visit instead of at boot.
 *
 * Every page used to be imported statically by `App.tsx`, so the browser
 * downloaded and parsed all of them — and every data file they import — before
 * the first paint. Loading a page when the student opens it takes that off the
 * boot path.
 *
 * AFTER A DEPLOY a page chunk the old build names may no longer exist on the
 * server (Vercel serves only the newest build at the production URL). When a
 * chunk fails to load, reload ONCE so the page is re-fetched against the new
 * build. The guard stops a loop: a second failure inside the window is a real
 * error and goes to the route's ErrorBoundary.
 */
const RELOAD_KEY = 'lazy-page-reload-at';
const RELOAD_WINDOW_MS = 30_000;

function reloadedRecently(): boolean {
  try {
    const at = Number(globalThis.sessionStorage?.getItem(RELOAD_KEY) ?? 0);
    return Date.now() - at < RELOAD_WINDOW_MS;
  } catch {
    return true; // storage locked: never risk a reload loop
  }
}

export function lazyPage<P extends object>(
  name: string,
  load: () => Promise<ComponentType<P>>,
): LazyExoticComponent<ComponentType<P>> {
  return lazy(async () => {
    try {
      return { default: await load() };
    } catch (error) {
      void logAppAudit({
        kind: 'lazy-page-load-failed',
        category: 'app',
        source: 'lazyPage',
        summary: `${name}: ${error instanceof Error ? error.message : String(error)}`,
      });
      if (!reloadedRecently()) {
        try { globalThis.sessionStorage?.setItem(RELOAD_KEY, String(Date.now())); } catch { /* storage locked */ }
        globalThis.location?.reload();
        // Never resolves: the reload replaces this document.
        return new Promise<{ default: ComponentType<P> }>(() => undefined);
      }
      throw error;
    }
  });
}
