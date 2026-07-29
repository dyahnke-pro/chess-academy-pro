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

const DEVICE_ID_KEY = 'analytics_device_id';
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
 * A Keychain-backed anchor for this install, when one exists.
 *
 * RevenueCat persists its app-user id in the iOS KEYCHAIN, which survives both
 * WebKit storage eviction and an app reinstall — unlike Dexie/localStorage,
 * which WebKit clears wholesale from apps that aren't opened often. Lazy import
 * so this module stays free of the billing layer (and safe on web/keyless,
 * where it simply returns null).
 */
async function readDurableAnchor(): Promise<string | null> {
  try {
    const { getStableAnalyticsId } = await import('./billingService');
    return await getStableAnalyticsId();
  } catch {
    return null;
  }
}

/**
 * The stable device id, minted + persisted on first call.
 *
 * 🔒 EVICTION-HEALING (David 2026-07-29). The original version minted a uuid
 * into Dexie `meta` — but Dexie is EXACTLY what WebKit evicts, so on the
 * infrequently-opened devices this counter exists to measure, the id churned
 * just as badly as posthog's own anonymous id (one iPhone produced 110 of
 * them). Resolution order now:
 *
 *   1. Dexie value, if present — healthy devices never churn.
 *   2. Otherwise the Keychain-backed RevenueCat anchor — so a device whose
 *      storage WAS evicted comes back as the SAME device instead of a new one.
 *   3. Otherwise a fresh uuid (web / keyless builds, or pre-billing installs).
 *
 * Whatever we resolve is written back to Dexie so later reads are cheap.
 */
export async function getDeviceId(): Promise<string> {
  const existing = await readMeta(DEVICE_ID_KEY);
  if (existing) return existing;

  const anchor = await readDurableAnchor();
  const id = anchor ?? newUuid();
  await writeMeta(DEVICE_ID_KEY, id);
  return id;
}

/**
 * How this device's id was established — `dexie` (never lost), `keychain`
 * (recovered after an eviction), or `minted` (brand new / no durable anchor).
 * Reported as a super-property so we can see, in the wild, how often storage
 * is still being evicted and whether the persistence fix is holding.
 */
export async function getDeviceIdSource(): Promise<'dexie' | 'keychain' | 'minted'> {
  if (await readMeta(DEVICE_ID_KEY)) return 'dexie';
  return (await readDurableAnchor()) ? 'keychain' : 'minted';
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
  // Source MUST be read before getDeviceId(), which writes the id back to
  // Dexie — otherwise every boot would report 'dexie' and the eviction signal
  // would be invisible.
  const device_id_source = await getDeviceIdSource();
  const [device_id, is_internal, label, distribution] = await Promise.all([
    getDeviceId(),
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
