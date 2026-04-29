/**
 * App-boot audit — fires once on app mount with the full install /
 * runtime context. Lets a production audit log answer questions like
 *   "was this user on a fresh load or a SW-driven reload?"
 *   "is this PWA standalone-mode or browser tab?"
 *   "what's the user agent — Capacitor, iOS Safari, desktop?"
 *   "was the network online at boot?"
 * The buildId stamp is auto-attached by logAppAudit.
 *
 * Idempotent: tracks a one-shot flag in sessionStorage so re-mounts
 * within the same tab session don't spam the log.
 */
import { logAppAudit } from './appAuditor';

const BOOT_AUDIT_FLAG = 'app-boot-audited';

export function emitAppBootAudit(): void {
  if (typeof window === 'undefined') return;
  // Once per session — react-router remounts shouldn't trigger fresh
  // boot audits.
  try {
    if (sessionStorage.getItem(BOOT_AUDIT_FLAG) === '1') return;
    sessionStorage.setItem(BOOT_AUDIT_FLAG, '1');
  } catch {
    // sessionStorage unavailable (private browsing) — fall through
    // and audit; spam is preferable to silence.
  }

  const matchMedia = typeof window.matchMedia === 'function' ? window.matchMedia : null;
  const standalone = matchMedia ? matchMedia('(display-mode: standalone)').matches : null;
  const isCapacitor = window.location.protocol === 'capacitor:';
  const sw = 'serviceWorker' in navigator ? navigator.serviceWorker : null;
  const swController = sw?.controller ?? null;
  const swState = swController?.state ?? 'no-controller';

  void logAppAudit({
    kind: 'app-boot',
    category: 'app',
    source: 'appBootAudit.emitAppBootAudit',
    summary: `online=${navigator.onLine} standalone=${standalone} capacitor=${isCapacitor} swState=${swState}`,
    details: JSON.stringify(
      {
        href: window.location.href,
        protocol: window.location.protocol,
        userAgent: navigator.userAgent,
        languages: navigator.languages,
        online: navigator.onLine,
        cookieEnabled: navigator.cookieEnabled,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: (navigator as { deviceMemory?: number }).deviceMemory ?? null,
        crossOriginIsolated: (window as { crossOriginIsolated?: boolean }).crossOriginIsolated ?? null,
        sharedArrayBufferAvailable: typeof SharedArrayBuffer !== 'undefined',
        standaloneMode: standalone,
        isCapacitor,
        swController: swController
          ? {
              state: swController.state,
              scriptURL: swController.scriptURL,
            }
          : null,
        timing: {
          domContentLoadedTs:
            performance?.timeOrigin && performance?.timing?.domContentLoadedEventEnd
              ? performance.timing.domContentLoadedEventEnd
              : null,
          now: Date.now(),
        },
      },
      null,
      2,
    ),
  });
}
