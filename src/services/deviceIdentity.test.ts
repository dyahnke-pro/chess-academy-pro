import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import {
  getDeviceId,
  resolveDistributionChannel,
  isInternalDevice,
  setInternalDevice,
  applyInternalFromUrl,
  resolveDeviceIdentity,
} from './deviceIdentity';

beforeEach(async () => {
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
