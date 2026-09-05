import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { startOtaObserver, installStagedBundleOnLaunch } from './services/otaObserver';
import './index.css';
import { App } from './App';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

/**
 * OTA readiness signal (David 2026-07-03). On native, tell the Capgo updater
 * this bundle booted successfully so it COMMITS a freshly-applied OTA update
 * instead of rolling it back. This is the load-bearing safety call: if a bad
 * OTA bundle is ever applied and fails to reach here within `appReadyTimeout`
 * (capacitor.config.ts), the plugin auto-reverts to the last good bundle — a
 * broken update can never brick a tester. No-op / guarded on web (PWA).
 */
function signalOtaReady(): void {
  let isNative = false;
  try { isNative = Capacitor.isNativePlatform(); } catch { /* web */ }
  if (!isNative) return;
  void CapacitorUpdater.notifyAppReady().catch(() => { /* plugin absent / web */ });
}

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
  // Commit the (possibly OTA-applied) bundle now that it has booted.
  signalOtaReady();
  // THEN apply any bundle that was downloaded but never installed — a
  // force-close skips the background→foreground the updater waits for, so
  // without this a staged update can sit `pending` forever (David 2026-09-05,
  // "OTA still not working!"). Must run AFTER the commit above so the current
  // bundle's auto-revert window can't misfire. `set()` reloads the app if it
  // finds one; a cold launch has nothing to lose.
  void installStagedBundleOnLaunch();
  // Make the OTA lifecycle observable (David 2026-07-24 "hasn't worked once").
  // Telemetry only — snapshots the running bundle + traces the update journey
  // so the audit tool can find the real failure instead of guessing.
  void startOtaObserver();
}

void killServiceWorkerOnNative();
