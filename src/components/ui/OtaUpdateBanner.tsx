import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, X } from 'lucide-react';
import { installStagedBundleOnLaunch } from '../../services/otaObserver';

/**
 * OtaUpdateBanner — the "Update ready — Restart now / Not now" prompt.
 *
 * David 2026-09-06: "OTA must NOT kick users mid-session… at least launch a
 * warning that says update available restart, or not now options." With
 * autoUpdate:'onlyDownload' (capacitor.config.ts) a fresh bundle downloads but is
 * NEVER auto-applied — it sits `pending` and swaps in silently at the next cold
 * launch (installStagedBundleOnLaunch), so no one is interrupted mid-game. This
 * banner is the courtesy on top: when a download completes during a session it
 * offers an immediate restart, or the user dismisses and keeps playing (the
 * update lands on their next open regardless).
 *
 * Non-blocking, portalled to document.body, dismissible. Purely additive — if
 * it never renders (web, or no update), nothing changes.
 */
export function OtaUpdateBanner(): JSX.Element | null {
  const [show, setShow] = useState(false);
  const [restarting, setRestarting] = useState(false);

  useEffect(() => {
    const onStaged = (): void => setShow(true);
    window.addEventListener('ota-update-staged', onStaged);
    return () => window.removeEventListener('ota-update-staged', onStaged);
  }, []);

  const restartNow = useCallback(() => {
    setRestarting(true);
    // set() applies + reloads the app onto the staged bundle. If it can't (no
    // staged bundle matches the server), we just close — it'll land next launch.
    void installStagedBundleOnLaunch().then((applied) => {
      if (!applied) { setRestarting(false); setShow(false); }
    });
  }, []);

  if (!show) return null;

  return createPortal(
    <div
      className="fixed inset-x-0 z-[120] flex justify-center px-3"
      style={{ bottom: 'calc(4.75rem + env(safe-area-inset-bottom, 0px))' }}
      data-testid="ota-update-banner"
    >
      <div
        className="flex w-full max-w-md items-center gap-3 rounded-2xl px-4 py-3 shadow-xl"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <RefreshCw size={18} className="shrink-0 text-theme-accent" />
        <div className="flex-1 text-sm text-theme-text">
          <div className="font-semibold">Update ready</div>
          <div style={{ color: 'var(--color-text-muted)' }}>Restart to get the latest, or keep playing — it applies next time you open the app.</div>
        </div>
        <button
          type="button"
          onClick={restartNow}
          disabled={restarting}
          data-testid="ota-restart-now"
          className="shrink-0 rounded-xl bg-theme-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {restarting ? 'Restarting…' : 'Restart now'}
        </button>
        <button
          type="button"
          onClick={() => setShow(false)}
          aria-label="Not now"
          data-testid="ota-not-now"
          className="shrink-0 rounded p-1 text-theme-text hover:opacity-70"
        >
          <X size={18} />
        </button>
      </div>
    </div>,
    document.body,
  );
}
