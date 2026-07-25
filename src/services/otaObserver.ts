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
import { captureEvent } from './analytics';

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

  // Snapshot: what is this device ACTUALLY running right now?
  let running = 'unknown';
  let runningId = 'unknown';
  let runningStatus = 'unknown';
  let nativeVersion = 'unknown';
  let builtin = 'unknown';
  try {
    const cur = await CapacitorUpdater.current();
    running = cur?.bundle?.version ?? 'unknown';
    runningId = cur?.bundle?.id ?? 'unknown';
    runningStatus = cur?.bundle?.status ?? 'unknown';
    nativeVersion = cur?.native ?? 'unknown';
  } catch {
    /* plugin absent / web */
  }
  try {
    const bi = await CapacitorUpdater.getBuiltinVersion();
    builtin = bi?.version ?? 'unknown';
  } catch {
    /* older plugin without getBuiltinVersion */
  }

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

  // The decisive per-launch signal: which bundle the device booted, and whether
  // it is the builtin or a downloaded OTA bundle (status).
  emit(
    'ota-boot',
    'ota_boot',
    `OTA boot — running=${running} (status=${runningStatus}) builtin=${builtin} native=${nativeVersion}`,
  );

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
}
