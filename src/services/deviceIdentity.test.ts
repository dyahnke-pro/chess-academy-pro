import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../db/schema';
import {
  getDeviceId,
  getDeviceIdSource,
  resolveDistributionChannel,
  isInternalDevice,
  setInternalDevice,
  applyInternalFromUrl,
  resolveDeviceIdentity,
} from './deviceIdentity';

/** Stand-in for RevenueCat's Keychain-backed app-user id. Null by default so
 *  the baseline tests exercise the mint path (web / keyless builds). */
const durableAnchor = { value: null as string | null };
vi.mock('./billingService', () => ({
  getStableAnalyticsId: async (): Promise<string | null> => durableAnchor.value,
}));

/** Stand-in for the iOS Keychain (installAnchor). Null = web, no keychain. */
const keychain = { value: null as string | null, native: false };
vi.mock('./installAnchor', () => ({
  readInstallAnchor: async (): Promise<string | null> => (keychain.native ? keychain.value : null),
  writeInstallAnchor: async (id: string): Promise<boolean> => {
    if (!keychain.native) return false;
    keychain.value = id;
    return true;
  },
}));

beforeEach(async () => {
  durableAnchor.value = null;
  keychain.value = null;
  keychain.native = false;
  await db.delete();
  await db.open();
});

describe('deviceIdentity — stable id', () => {
  it('mints an id once and returns the SAME id on every later call', async () => {
    const first = await getDeviceId();
    const second = await getDeviceId();
    expect(first).toBeTruthy();
    expect(second).toBe(first);
  });
});

/**
 * The whole point of device_id is counting REAL installs. It used to live only
 * in Dexie — which is precisely what WebKit evicts — so on the infrequently
 * opened devices it exists to measure, it churned as badly as posthog's own
 * anonymous id (one iPhone minted 110 of them). After an eviction the id must
 * RECOVER from the Keychain-backed anchor, not mint a brand-new "device".
 */
describe('deviceIdentity — survives a storage eviction', () => {
  it('recovers the SAME id after Dexie is wiped, via the durable anchor', async () => {
    durableAnchor.value = 'rc-anchor-abc123';
    const before = await getDeviceId();
    expect(before).toBe('rc-anchor-abc123');

    // Simulate WebKit evicting the origin's IndexedDB.
    await db.delete();
    await db.open();

    expect(await getDeviceId()).toBe(before);
  });

  it('keeps an already-stored Dexie id even when an anchor exists (no churn)', async () => {
    const original = await getDeviceId(); // minted, anchor null
    durableAnchor.value = 'rc-anchor-different';
    expect(await getDeviceId()).toBe(original);
  });

  it('mints a fresh id when wiped with NO anchor available (web / keyless)', async () => {
    const before = await getDeviceId();
    await db.delete();
    await db.open();
    expect(await getDeviceId()).not.toBe(before);
  });

  it('reports how the id was established, before the write-back', async () => {
    expect(await getDeviceIdSource()).toBe('minted');
    await getDeviceId();
    expect(await getDeviceIdSource()).toBe('dexie');

    await db.delete();
    await db.open();
    durableAnchor.value = 'rc-anchor-xyz';
    expect(await getDeviceIdSource()).toBe('keychain');
  });

  it('resolveDeviceIdentity reports the source alongside the id', async () => {
    await db.delete();
    await db.open();
    durableAnchor.value = 'rc-anchor-xyz';
    const identity = await resolveDeviceIdentity();
    expect(identity.device_id).toBe('rc-anchor-xyz');
    expect(identity.device_id_source).toBe('keychain');
  });
});

/**
 * A delete-and-reinstall wipes the app's database AND RevenueCat's anonymous id
 * (both live in the app container). Only the Keychain survives, so the install
 * must come back as the SAME device — that is what keys the free-tier ledger.
 */
describe('deviceIdentity — survives a reinstall (Keychain anchor)', () => {
  it('a reinstalled app comes back as the same device', async () => {
    keychain.native = true;
    const before = await getDeviceId();
    expect(keychain.value).toBe(before);
    // Reinstall: the database is gone, RevenueCat has a brand-new id.
    await db.delete();
    await db.open();
    durableAnchor.value = 'rc-new-anonymous-id';
    expect(await getDeviceId()).toBe(before);
    expect((await resolveDeviceIdentity()).device_id).toBe(before);
  });

  it('an existing install seeds the Keychain with the id it already has', async () => {
    const old = await getDeviceId(); // pre-anchor build: web-like, Dexie only
    keychain.native = true; // the new build lands
    expect(await getDeviceId()).toBe(old);
    expect(keychain.value).toBe(old);
  });

  it('reports keychain as the source right after a reinstall', async () => {
    keychain.native = true;
    keychain.value = 'kc-install-123456';
    const identity = await resolveDeviceIdentity();
    expect(identity.device_id).toBe('kc-install-123456');
    expect(identity.device_id_source).toBe('keychain');
  });
});

describe('deviceIdentity — owner/internal flag', () => {
  it('defaults to NOT internal (a real user is never excluded by accident)', async () => {
    expect(await isInternalDevice()).toBe(false);
    expect((await resolveDeviceIdentity()).is_internal).toBe(false);
  });

  it('marking internal persists and rides the resolved identity', async () => {
    await setInternalDevice(true, 'MacBook neo');
    expect(await isInternalDevice()).toBe(true);
    const identity = await resolveDeviceIdentity();
    expect(identity.is_internal).toBe(true);
    expect(identity.device_label).toBe('MacBook neo');
    expect(identity.device_id).toBeTruthy();
  });

  it('can be turned back off', async () => {
    await setInternalDevice(true);
    await setInternalDevice(false);
    expect(await isInternalDevice()).toBe(false);
  });
});

describe('deviceIdentity — ?internal= URL marking', () => {
  it('?internal=1 marks the device and stores the optional label', async () => {
    const applied = await applyInternalFromUrl('?internal=1&device=David%20iPhone');
    expect(applied).toBe(true);
    expect(await isInternalDevice()).toBe(true);
    expect((await resolveDeviceIdentity()).device_label).toBe('David iPhone');
  });

  it('?internal=0 un-marks it', async () => {
    await setInternalDevice(true);
    await applyInternalFromUrl('?internal=0');
    expect(await isInternalDevice()).toBe(false);
  });

  it('no param is a no-op — never flips an existing flag', async () => {
    await setInternalDevice(true);
    expect(await applyInternalFromUrl('?foo=bar')).toBe(false);
    expect(await isInternalDevice()).toBe(true);
  });
});

describe('deviceIdentity — distribution channel (TestFlight vs App Store)', () => {
  it('reports web on a non-native platform', async () => {
    // jsdom is not Capacitor-native, so the native receipt check is skipped.
    expect(await resolveDistributionChannel()).toBe('web');
  });

  it('rides the resolved identity so every event can split beta vs real users', async () => {
    const identity = await resolveDeviceIdentity();
    expect(identity.distribution).toBe('web');
  });
});
