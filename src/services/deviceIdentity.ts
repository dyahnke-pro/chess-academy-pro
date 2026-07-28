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
  /** True for the owner's own devices, so their traffic can be excluded. */
  is_internal: boolean;
  /** Optional human name for the device ("David iPhone", "MacBook neo"). */
  device_label?: string;
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

/** The stable device uuid, minted + persisted on first call. */
export async function getDeviceId(): Promise<string> {
  const existing = await readMeta(DEVICE_ID_KEY);
  if (existing) return existing;
  const id = newUuid();
  await writeMeta(DEVICE_ID_KEY, id);
  return id;
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

/** Resolve the full identity for registration as PostHog super-properties. */
export async function resolveDeviceIdentity(): Promise<DeviceIdentity> {
  const [device_id, is_internal, label] = await Promise.all([
    getDeviceId(),
    isInternalDevice(),
    getDeviceLabel(),
  ]);
  return { device_id, is_internal, ...(label ? { device_label: label } : {}) };
}
