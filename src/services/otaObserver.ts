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

  // The decisive per-launch signal: which bundle the device booted, and whether
  // it is the builtin or a downloaded OTA bundle (status).
  emitWhenAnalyticsReady(
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
    // A newer bundle is staged (autoUpdate:'onlyDownload' never auto-applies it).
    // Tell the UI so the non-blocking OtaUpdateBanner can offer "Restart now";
    // otherwise it swaps in silently at the next cold launch. Never reloads here.
    try { window.dispatchEvent(new CustomEvent('ota-update-staged', { detail: { version: nb.version } })); } catch { /* no window */ }
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

/**
 * Apply a downloaded-but-unapplied OTA bundle at COLD LAUNCH.
 *
 * David 2026-09-05 ("OTA still not working!", twice). The updater's autoUpdate
 * flow downloads a newer bundle and then installs it on the NEXT
 * background→foreground. A force-close is not a background: it relaunches the
 * CURRENT bundle, and the downloaded one sits in `list()` as `pending` — for
 * hours, or forever for a user who only ever force-closes. On David's device
 * the stream showed exactly that: `download complete → 9d514942`, `appReady …
 * update downloaded, will install next background`, then a relaunch booting
 * the OLD bundle again. "Do the bundle on launch."
 *
 * So, at boot: find the newest `pending` bundle and `set()` it — `set` applies
 * AND reloads. Ordering matters: call this AFTER `notifyAppReady()` has
 * committed the current bundle, so its auto-revert window cannot misfire on a
 * bundle we are deliberately leaving. Safe against boot loops: a bundle that
 * fails its own ready-check is marked `error`, never `pending`, so it is never a
 * candidate again. Never used the plugin's "install immediately on download"
 * mode — that reloads mid-session and would kill a running analysis sweep; a
 * cold launch has nothing to lose.
 *
 * Returns true when a bundle was applied (the app is about to reload).
 */
/** Same endpoint the plugin is pointed at (capacitor.config.ts
 *  CapacitorUpdater.updateUrl). It owns the forward-only ordinal. */
const OTA_MANIFEST_URL = 'https://chess-academy-pro.vercel.app/api/ota/manifest';

export async function installStagedBundleOnLaunch(): Promise<boolean> {
  let isNative = false;
  try {
    isNative = Capacitor.isNativePlatform();
  } catch {
    return false;
  }
  if (!isNative) return false;

  const source = 'otaObserver.installStagedBundleOnLaunch';
  try {
    const [cur, listed, bi] = await Promise.all([
      CapacitorUpdater.current(),
      CapacitorUpdater.list(),
      CapacitorUpdater.getBuiltinVersion().catch(() => ({ version: '' })),
    ]);
    const currentVersion = cur?.bundle?.version ?? '';
    const currentId = cur?.bundle?.id ?? '';
    const builtinVersion = bi?.version ?? '';

    const pending = (listed?.bundles ?? [])
      .filter((b) => b.status === 'pending')
      .filter((b) => b.id !== currentId && b.version !== currentVersion && b.version !== builtinVersion);
    if (pending.length === 0) return false;

    // 🔒 FORWARD-ONLY, AND THE SERVER IS THE ONLY THING THAT KNOWS WHICH WAY
    // THAT IS (David 2026-09-05 — caught on his own device).
    //
    // This used to take the most recently DOWNLOADED pending bundle. Download
    // time is not version order: a bundle fetched while the pointer briefly
    // served it, then left pending, is applied on a later launch OVER a newer
    // bundle. His device did exactly that — booted d5c1b818, then rolled BACK to
    // its ancestor 6215607a three times. That is the rollback hazard
    // api/ota/manifest's ordinal exists to prevent, reintroduced here from the
    // client side, and it is how devices were once stranded on a build carrying
    // a crash.
    //
    // Bundle versions are git short SHAs, so nothing on-device can order them.
    // The manifest CAN: it holds a monotonic ordinal and refuses to hand back
    // anything at or below what the device already runs. So ask it what this
    // device should be running and install ONLY that — inheriting the server's
    // forward-only guarantee instead of inventing a weaker one here. If the
    // manifest is unreachable or says up-to-date, we apply NOTHING: staying put
    // is always safe, going backwards is not.
    // 🔒 RESILIENT MANIFEST FETCH (David 2026-09-09 device audit). A SINGLE
    // aborted fetch here used to strand every staged bundle: the device's log
    // showed 6 bundles downloaded but never installed, because this one boot-time
    // GET kept dying with "Fetch is aborted" (the app backgrounds constantly, and
    // an unmount/background tears the request down). The manifest itself is
    // reachable — autoUpdate downloaded the bundles through it moments earlier —
    // so giving up after one abort was the bug, not the network. Retry a few
    // times with backoff and a per-attempt timeout so a transient abort no longer
    // leaves a forward, ready bundle un-applied. Forward-only is UNCHANGED: we
    // still install ONLY the version the manifest advertises.
    let advertised = '';
    const manifestUrl = `${OTA_MANIFEST_URL}?version=${encodeURIComponent(currentVersion || '0.0.0')}`
      + `&platform=${encodeURIComponent(Capacitor.getPlatform())}`;
    for (let attempt = 0; attempt < 4 && !advertised; attempt += 1) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 500 * attempt)); // 0, 0.5s, 1s, 1.5s
      try {
        const ctrl = new AbortController();
        const to = setTimeout(() => ctrl.abort(), 8000);
        let res: Response;
        try {
          res = await fetch(manifestUrl, { cache: 'no-store', signal: ctrl.signal });
        } finally { clearTimeout(to); }
        if (res.ok) {
          const body = (await res.json()) as { kind?: string; version?: string };
          if (body.kind === 'up_to_date') break; // authoritative: nothing to apply
          if (typeof body.version === 'string') advertised = body.version;
        }
      } catch { /* aborted / offline — retry, then fall through and apply nothing */ }
    }

    const target = advertised ? pending.find((b) => b.version === advertised) : undefined;
    if (!target) {
      void logAppAudit({
        kind: 'ota-launch-install',
        category: 'subsystem',
        source,
        summary: `${pending.length} staged bundle(s) held back — none matches what the server advertises`
          + ` (advertised=${advertised || 'none/up-to-date'}, running=${currentVersion || 'unknown'},`
          + ` staged=${pending.map((b) => b.version).join(',')})`,
      });
      // 🔒 NEVER-AGAIN TELEMETRY (David 2026-09-09). The strand was found by luck
      // in one device log; the audit-stream is ephemeral, so a recurrence could
      // hide the same way. Emit a DURABLE PostHog event whenever staged bundles
      // are held back — the more that pile up (advertised empty ⇒ the manifest
      // fetch never succeeded even with retries), the louder. This is the signal
      // to alert on: a device accumulating pending bundles is stuck on old code.
      if (isAnalyticsEnabled()) {
        captureEvent('ota_install_held_back', {
          running: currentVersion || 'unknown',
          builtin: builtinVersion || 'unknown',
          stagedCount: pending.length,
          staged: pending.map((b) => b.version).join(','),
          manifestReached: advertised !== '' ? true : false,
          reason: advertised ? 'advertised-not-staged' : 'manifest-unreachable',
        });
      }
      return false;
    }

    void logAppAudit({
      kind: 'ota-launch-install',
      category: 'subsystem',
      source,
      summary: `staged bundle found at launch → applying ${target.version} (running ${currentVersion || 'unknown'})`,
    });
    if (isAnalyticsEnabled()) {
      captureEvent('ota_launch_install', { from: currentVersion, to: target.version, toId: target.id });
    }
    await CapacitorUpdater.set({ id: target.id }); // applies + reloads the app
    return true;
  } catch (err) {
    void logAppAudit({
      kind: 'ota-launch-install',
      category: 'subsystem',
      source,
      summary: `launch install skipped: ${err instanceof Error ? err.message : String(err)}`,
    });
    return false;
  }
}
