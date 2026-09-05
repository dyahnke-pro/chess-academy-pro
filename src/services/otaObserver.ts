/**
 * otaObserver — makes the Capgo OTA lifecycle OBSERVABLE.
 *
 * WHY THIS EXISTS (David 2026-07-24: "the OTA hasn't worked once!"): we had
 * ZERO on-device OTA telemetry, so every diagnosis of why updates never land
 * was a GUESS. This instruments the real thing. Native-only; a complete no-op
 * on web (the PWA updates itself).
 *
 * On boot it snapshots what bundle the device is ACTUALLY running (version +
 * status) vs its compiled-in builtin vs the native app version — the single
 * most decisive signal, emitted every launch. Then it wires every Capgo
 * lifecycle listener to emit BOTH an audit-stream event (G2 live watch) and a
 * durable PostHog event (history), so `scripts/audit-ota.mjs` can reconstruct
 * each device's real journey and pinpoint where it breaks:
 *
 *   SUCCESS: ota_boot → ota_update_available → ota_download_complete → ota_set
 *            → ota_app_reloaded → ota_app_ready (committed)
 *   BREAKS:  ota_no_need_update  (server never offered it — version mismatch or
 *                                 a pre-autoUpdate build that never polls)
 *            ota_download_failed / ota_update_failed
 *            ota_set with NO following ota_app_ready  (the auto-revert: the
 *                                 applied bundle never committed in time)
 *            no ota_* events at all  (autoUpdate:false legacy install — blind)
 *
 * G0/telemetry-only: this decides nothing and changes no OTA behavior — it
 * only reports facts the plugin emits. The fix comes AFTER the evidence, not
 * from a hunch.
 */
import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { logAppAudit, type AuditKind } from './appAuditor';
import { captureEvent, isAnalyticsEnabled } from './analytics';

let started = false;

interface BundleLike {
  version?: string;
  id?: string;
  status?: string;
}

function asBundle(x: unknown): BundleLike {
  return x && typeof x === 'object' ? (x as BundleLike) : {};
}

/**
 * Wire the OTA lifecycle listeners + emit the boot snapshot. Idempotent and
 * native-guarded — safe to call unconditionally on every boot.
 */
export async function startOtaObserver(): Promise<void> {
  if (started) return;
  let isNative = false;
  try {
    isNative = Capacitor.isNativePlatform();
  } catch {
    return;
  }
  if (!isNative) return;
  started = true;

  // 🚨 THE SNAPSHOT USED TO RUN *BEFORE* THE LISTENERS, AND IT COST US THE
  // DIAGNOSIS. `autoUpdate: true` makes the plugin check for an update at
  // native launch — so `updateAvailable` / `noNeedUpdate` / `downloadComplete`
  // can all fire while this function is still awaiting `current()` and
  // `getBuiltinVersion()`. Those events land with nothing attached and are gone.
  //
  // On 2026-09-05 that produced launches showing ONLY `ota_boot`, which I read
  // as "the device never checked for an update" and told David so — twice. It
  // was not evidence of that at all; it was evidence of this race. An observer
  // whose whole job is to say what the updater did must be listening BEFORE the
  // updater does anything.
  //
  // So: attach first, snapshot second. `base` starts empty and is filled in by
  // the time any human reads the event; the listener payloads (`to`, `toStatus`)
  // are what actually matter and they are never lost.
  let running = 'unknown';
  let runningId = 'unknown';
  let runningStatus = 'unknown';
  let nativeVersion = 'unknown';
  let builtin = 'unknown';

  const base: Record<string, unknown> = {
    running,
    runningId,
    runningStatus,
    nativeVersion,
    builtin,
  };

  const emit = (
    kind: AuditKind,
    event: string,
    summary: string,
    props: Record<string, unknown> = {},
  ): void => {
    void logAppAudit({ kind, category: 'subsystem', source: 'otaObserver', summary });
    captureEvent(event, { ...base, ...props });
  };

  /**
   * The boot snapshot is the ONE per-launch signal that says which bundle the
   * device actually booted — and it was being thrown away. `initAnalytics` runs
   * from an App effect that waits on the profile, whereas this observer starts
   * in main.tsx before React mounts; `captureEvent` only queues once init is in
   * flight and otherwise DROPS. Measured 2026-09-03: `ota_boot` reached 6
   * devices while `ota_app_ready` — which fires later, after init — reached 56.
   *
   * So hold the snapshot until analytics is up, then send it. Bounded, because
   * a user who opted out never enables it and this must not leak a timer: the
   * audit-stream half above is already recorded either way.
   */
  const emitWhenAnalyticsReady = (
    kind: AuditKind,
    event: string,
    summary: string,
  ): void => {
    void logAppAudit({ kind, category: 'subsystem', source: 'otaObserver', summary });
    if (isAnalyticsEnabled()) {
      captureEvent(event, base);
      return;
    }
    const startedAt = Date.now();
    const timer = setInterval(() => {
      if (isAnalyticsEnabled()) {
        clearInterval(timer);
        captureEvent(event, base);
      } else if (Date.now() - startedAt > 30_000) {
        clearInterval(timer);
      }
    }, 500);
  };

  // Snapshot + boot signal come AFTER every listener is attached (see above).
  const snapshot = async (): Promise<void> => {
    try {
      const cur = await CapacitorUpdater.current();
      running = cur?.bundle?.version ?? 'unknown';
      runningId = cur?.bundle?.id ?? 'unknown';
      runningStatus = cur?.bundle?.status ?? 'unknown';
      nativeVersion = cur?.native ?? 'unknown';
    } catch { /* plugin absent / web */ }
    try {
      const bi = await CapacitorUpdater.getBuiltinVersion();
      builtin = bi?.version ?? 'unknown';
    } catch { /* older plugin without getBuiltinVersion */ }
    base.running = running;
    base.runningId = runningId;
    base.runningStatus = runningStatus;
    base.nativeVersion = nativeVersion;
    base.builtin = builtin;
    emitWhenAnalyticsReady(
      'ota-boot',
      'ota_boot',
      `OTA boot — running=${running} (status=${runningStatus}) builtin=${builtin} native=${nativeVersion}`,
    );
  };

  const add = async (
    name: string,
    fn: (state: unknown) => void,
  ): Promise<void> => {
    try {
      await CapacitorUpdater.addListener(name as never, fn as never);
    } catch {
      /* listener unsupported on this plugin version — skip */
    }
  };

  await add('updateAvailable', (s) => {
    const nb = asBundle((s as { bundle?: unknown })?.bundle);
    emit('ota-update-available', 'ota_update_available', `update available → ${nb.version}`, {
      to: nb.version,
      toId: nb.id,
    });
  });
  await add('downloadComplete', (s) => {
    const nb = asBundle((s as { bundle?: unknown })?.bundle);
    emit('ota-download-complete', 'ota_download_complete', `download complete → ${nb.version}`, {
      to: nb.version,
      toId: nb.id,
    });
  });
  await add('downloadFailed', (s) => {
    const v = (s as { version?: string })?.version;
    emit('ota-download-failed', 'ota_download_failed', `download FAILED version=${v}`, { to: v });
  });
  await add('updateFailed', (s) => {
    const nb = asBundle((s as { bundle?: unknown })?.bundle);
    emit('ota-update-failed', 'ota_update_failed', `update FAILED → ${nb.version} status=${nb.status}`, {
      to: nb.version,
      toStatus: nb.status,
    });
  });
  await add('noNeedUpdate', (s) => {
    const nb = asBundle((s as { bundle?: unknown })?.bundle);
    emit('ota-no-need-update', 'ota_no_need_update', `no update needed (current=${nb.version})`, {
      current: nb.version,
    });
  });
  await add('set', (s) => {
    const nb = asBundle((s as { bundle?: unknown })?.bundle);
    emit('ota-set', 'ota_set', `bundle SET → ${nb.version} status=${nb.status}`, {
      to: nb.version,
      toStatus: nb.status,
    });
  });
  await add('appReloaded', () => {
    emit('ota-app-reloaded', 'ota_app_reloaded', 'app reloaded onto bundle');
  });
  await add('appReady', (s) => {
    const ev = s as { bundle?: unknown; status?: string };
    const nb = asBundle(ev?.bundle);
    emit('ota-app-ready', 'ota_app_ready', `appReady COMMITTED → ${nb.version} status=${ev?.status ?? nb.status}`, {
      to: nb.version,
      commitStatus: ev?.status ?? nb.status,
    });
  });

  // Every listener is attached; NOW read the current bundle and emit the boot
  // snapshot. Deliberately last — see the note above the snapshot definition.
  await snapshot();
}
