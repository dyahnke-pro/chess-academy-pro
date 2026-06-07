import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import './index.css';
import { App } from './App';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');
const rootEl: HTMLElement = root;

function mountApp(): void {
  // Outer-most ErrorBoundary: catches failures thrown during App init,
  // route setup, or StrictMode's double-invoke passes — anything that
  // would otherwise white-screen the app before the per-route
  // boundaries mount. Per-route boundaries still live inside App.tsx.
  createRoot(rootEl).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}

/**
 * NATIVE ONLY — kill the PWA service worker. In the Capacitor WKWebView the app
 * is served from the local package, so the precaching service worker is pure
 * harm: it caches the bundle and keeps serving the OLD assets across app
 * UPDATES (the WKWebView storage survives a reinstall-over), so code updates
 * never take effect — the device runs a stale bundle no matter how clean the
 * build is. This cost an entire day (David 2026-06-07): the phone was pinned to
 * a June-4 bundle through a dozen rebuilds. On web the SW stays (offline +
 * install benefits); on native we unregister it + clear its caches, then reload
 * ONCE (guarded) so the webview re-fetches the current bundle from the package.
 *
 * NOTE: this only protects FUTURE updates — it can't bust an already-stale
 * cache that is serving an OLD bundle WITHOUT this code in it. The first time,
 * the app must be DELETED + reinstalled to clear the existing SW cache; after
 * that this keeps every later update clean. IndexedDB (games/progress) is NOT
 * touched here.
 */
async function killServiceWorkerOnNative(): Promise<void> {
  let isNative = false;
  try { isNative = Capacitor.isNativePlatform(); } catch { /* web */ }
  if (!isNative) { mountApp(); return; }

  let purged = false;
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) { if (await r.unregister()) purged = true; }
    }
  } catch { /* ignore */ }
  try {
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      if (keys.length > 0) purged = true;
    }
  } catch { /* ignore */ }

  let alreadyReloaded = false;
  try { alreadyReloaded = sessionStorage.getItem('__native_sw_purged') === '1'; } catch { /* ignore */ }
  if (purged && !alreadyReloaded) {
    try { sessionStorage.setItem('__native_sw_purged', '1'); } catch { /* ignore */ }
    window.location.reload();
    return;
  }
  mountApp();
}

void killServiceWorkerOnNative();
