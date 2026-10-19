/**
 * deviceIdentity — a STABLE per-install identity + the owner/internal flag.
 * --------------------------------------------------------------------------
 * Two problems this solves (David 2026-07-28):
 *
 * 1. HOW MANY DEVICES / WHO'S REAL. PostHog's anonymous id churns on iOS
 *    (storage eviction mints a fresh "person" almost every session), so 20 real
 *    installs looked like 281 device-ids. We mint ONE uuid, persist it in Dexie
 *    (which survives the localStorage evictions that break posthog's own id),
 *    and register it as a super-property. Device counts become real.
 *
 * 2. "I NEVER WANT MY STATS MIXED IN." David's own devices (his iPhone + the
 *    MacBook "neo") are flagged INTERNAL, and every event they emit carries
 *    `is_internal: true` so every insight/dashboard filters them out. Marking a
 *    device is deliberate + persistent — either the Settings toggle or the
 *    `?internal=1` URL param (handy on a laptop).
 *
 * Storage is Dexie `meta` (key/value) per the CLAUDE.md no-localStorage rule.
 * Every export is total — a Dexie hiccup degrades to a non-internal, ephemeral
 * id rather than throwing on a boot path.
 */
import { db } from '../db/schema';

export const DEVICE_ID_KEY = 'analytics_device_id';
const INTERNAL_KEY = 'analytics_device_internal';
const LABEL_KEY = 'analytics_device_label';

/** The identity super-properties attached to every event from this device. */
export interface DeviceIdentity {
  /** Stable per-install uuid — survives posthog's anonymous-id churn. */
  device_id: string;
  /** How the id was established: `dexie` | `keychain` (post-eviction
   *  recovery) | `minted` (new install / no durable anchor). */
  device_id_source?: 'dexie' | 'keychain' | 'minted';
  /** True for the owner's own devices, so their traffic can be excluded. */
  is_internal: boolean;
  /** Optional human name for the device ("David iPhone", "MacBook neo"). */
  device_label?: string;
  /** Install channel: testflight | appstore | development | web | unknown. */
  distribution?: string;
}

function newUuid(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  // Non-crypto fallback — uniqueness is all we need, not unguessability.
  return `dev-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

async function readMeta(key: string): Promise<string | null> {
  try {
    const row = await db.meta.get(key);
    return typeof row?.value === 'string' ? row.value : null;
  } catch {
    return null;
  }
}

async function writeMeta(key: string, value: string): Promise<void> {
  try {
    await db.meta.put({ key, value });
  } catch {
    /* best effort — analytics must never break a feature path */
  }
}

/**
 * RevenueCat's app-user id, the older fallback anchor.
 *
 * 🔴 CORRECTED 2026-10-18: this comment used to say RevenueCat keeps its id in
 * the iOS Keychain and that it "survives an app reinstall". It does not — the
 * SDK keeps it in the app's own preferences, which iOS deletes with the app,
 * and billing configures only after this runs, so on a fresh install it was
 * null anyway. It still heals a storage EVICTION on a long-lived install; the
 * reinstall anchor is `installAnchor`, which really is in the Keychain.
 */
async function readBillingAnchor(): Promise<string | null> {
  try {
    const { getStableAnalyticsId } = await import('./billingService');
    return await getStableAnalyticsId();
  } catch {
    return null;
  }
}

async function resolveId(): Promise<{ id: string; source: 'dexie' | 'keychain' | 'minted' }> {
  const { readInstallAnchor, writeInstallAnchor } = await import('./installAnchor');
  const [kc, existing] = await Promise.all([readInstallAnchor(), readMeta(DEVICE_ID_KEY)]);
  let out: { id: string; source: 'dexie' | 'keychain' | 'minted' };
  if (kc) {
    // The Keychain outlives the app, so it is the install's identity: a
    // reinstall comes back as the SAME device (and the same free-tier ledger).
    out = { id: kc, source: existing === kc ? 'dexie' : 'keychain' };
    if (existing !== kc) await writeMeta(DEVICE_ID_KEY, kc);
  } else if (existing) {
    // An install from before the anchor existed: seed the Keychain with the id
    // it already has, so its analytics history and ledger carry over.
    out = { id: existing, source: 'dexie' };
    await writeInstallAnchor(existing);
  } else {
    const billing = await readBillingAnchor();
    out = { id: billing ?? newUuid(), source: billing ? 'keychain' : 'minted' };
    await writeMeta(DEVICE_ID_KEY, out.id);
    await writeInstallAnchor(out.id);
  }
  return out;
}

/**
 * The stable device id, minted + persisted on first call.
 *
 * Resolution order (2026-10-18):
 *   1. The iOS Keychain install anchor — survives a delete-and-reinstall.
 *   2. Dexie value — an install from before the anchor; seeds the Keychain.
 *   3. RevenueCat's id (heals a storage eviction), else a fresh uuid.
 */
export async function getDeviceId(): Promise<string> {
  return (await resolveId()).id;
}

/**
 * How this device's id was established — `dexie` (never lost), `keychain`
 * (recovered from a durable anchor after a reinstall or eviction), or `minted`
 * (brand new). Reported as a super-property so reinstalls are visible.
 */
export async function getDeviceIdSource(): Promise<'dexie' | 'keychain' | 'minted'> {
  return (await resolveId()).source;
}

/** Whether THIS device is the owner's (excluded from product analytics). */
export async function isInternalDevice(): Promise<boolean> {
  return (await readMeta(INTERNAL_KEY)) === 'true';
}

/** Mark/unmark this device as the owner's. Persists across sessions. */
export async function setInternalDevice(internal: boolean, label?: string): Promise<void> {
  await writeMeta(INTERNAL_KEY, internal ? 'true' : 'false');
  if (label !== undefined) await writeMeta(LABEL_KEY, label);
}

/** The optional human label for this device. */
export async function getDeviceLabel(): Promise<string | null> {
  return readMeta(LABEL_KEY);
}

/**
 * Honor `?internal=1` (or `?internal=0`) in the URL so a device can be marked
 * without hunting through Settings — the fast path on a laptop. Returns true
 * when the param was present and applied. Pure-ish; safe on any platform.
 */
export async function applyInternalFromUrl(search?: string): Promise<boolean> {
  try {
    const qs = search ?? (typeof window !== 'undefined' ? window.location.search : '');
    if (!qs) return false;
    const value = new URLSearchParams(qs).get('internal');
    if (value == null) return false;
    const label = new URLSearchParams(qs).get('device') ?? undefined;
    await setInternalDevice(value !== '0' && value !== 'false', label);
    return true;
  } catch {
    return false;
  }
}

/**
 * Which channel this install came from — `testflight` | `appstore` |
 * `development` on native, `web` elsewhere. Lets analytics separate BETA
 * TESTERS from real App Store users (David 2026-07-28).
 *
 * MUST be a runtime check: Apple promotes the SAME binary from TestFlight to
 * the App Store, so a build-time flag would mislabel every user the moment a
 * version ships. The native side reads the receipt filename (`sandboxReceipt`
 * = TestFlight). Total — any failure degrades to `unknown`, never throws.
 */
export async function resolveDistributionChannel(): Promise<string> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return 'web';
    const { StockfishNative } = await import('capacitor-stockfish-native');
    const res = await StockfishNative.getDistribution();
    return res?.channel && res.channel.length > 0 ? res.channel : 'unknown';
  } catch {
    // Older native build without the method, or a non-Capacitor context.
    return 'unknown';
  }
}

/** Resolve the full identity for registration as PostHog super-properties. */
export async function resolveDeviceIdentity(): Promise<DeviceIdentity> {
  // ONE resolution gives both the id and how it was found — read separately,
  // the first call's write-back would make every boot report 'dexie' and hide
  // the reinstall / eviction signal.
  const { id: device_id, source: device_id_source } = await resolveId();
  const [is_internal, label, distribution] = await Promise.all([
    isInternalDevice(),
    getDeviceLabel(),
    resolveDistributionChannel(),
  ]);
  return {
    device_id,
    device_id_source,
    is_internal,
    distribution,
    ...(label ? { device_label: label } : {}),
  };
}
