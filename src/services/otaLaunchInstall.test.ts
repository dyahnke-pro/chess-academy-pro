import { describe, it, expect, vi, beforeEach } from 'vitest';

// A downloaded OTA bundle must be APPLIED at cold launch, not left `pending`
// until a background→foreground that a force-closing user never produces
// (David 2026-09-05, "OTA still not working!"). Each case below is a way the
// launch install could misfire: applying the running bundle, applying the
// builtin, picking a stale download over a fresh one, running on web, or
// throwing when the plugin is absent.

let isNative = true;
const setSpy = vi.fn(async (_: { id: string }) => {});
let currentBundle = { id: 'cur-1', version: 'ece94663', status: 'success', downloaded: '2026-09-05T16:20:00Z', checksum: '' };
let bundles: Array<{ id: string; version: string; status: string; downloaded: string; checksum: string }> = [];
let listShouldThrow = false;

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => isNative },
}));
vi.mock('@capgo/capacitor-updater', () => ({
  CapacitorUpdater: {
    current: async () => ({ bundle: currentBundle, native: '0.0.0' }),
    list: async () => { if (listShouldThrow) throw new Error('plugin absent'); return { bundles }; },
    set: (o: { id: string }) => setSpy(o),
    getBuiltinVersion: async () => ({ version: 'c18e02fd' }),
    addListener: async () => ({ remove: () => {} }),
  },
}));
vi.mock('./analytics', () => ({ captureEvent: vi.fn(), isAnalyticsEnabled: () => false }));
vi.mock('./appAuditor', () => ({ logAppAudit: vi.fn(async () => {}) }));

import { installStagedBundleOnLaunch } from './otaObserver';

const pending = (id: string, version: string, downloaded: string) =>
  ({ id, version, status: 'pending', downloaded, checksum: '' });

beforeEach(() => {
  isNative = true;
  listShouldThrow = false;
  setSpy.mockClear();
  currentBundle = { id: 'cur-1', version: 'ece94663', status: 'success', downloaded: '2026-09-05T16:20:00Z', checksum: '' };
  bundles = [];
});

describe('installStagedBundleOnLaunch', () => {
  it('applies a newer pending bundle at launch', async () => {
    bundles = [currentBundle, pending('new-1', '9d514942', '2026-09-05T16:46:00Z')];
    expect(await installStagedBundleOnLaunch()).toBe(true);
    expect(setSpy).toHaveBeenCalledWith({ id: 'new-1' });
  });

  it('does nothing when nothing is pending', async () => {
    bundles = [currentBundle];
    expect(await installStagedBundleOnLaunch()).toBe(false);
    expect(setSpy).not.toHaveBeenCalled();
  });

  it('never re-applies the bundle that is already running', async () => {
    bundles = [{ ...currentBundle, status: 'pending' }];
    expect(await installStagedBundleOnLaunch()).toBe(false);
    expect(setSpy).not.toHaveBeenCalled();
  });

  it('never applies a pending bundle that matches the builtin native version', async () => {
    bundles = [pending('b-1', 'c18e02fd', '2026-09-05T16:46:00Z')];
    expect(await installStagedBundleOnLaunch()).toBe(false);
    expect(setSpy).not.toHaveBeenCalled();
  });

  it('picks the NEWEST pending download when several are staged', async () => {
    bundles = [
      pending('old-1', 'c18e02fd9', '2026-09-05T15:30:00Z'),
      pending('new-2', '9d514942', '2026-09-05T16:46:00Z'),
      pending('mid-1', 'ece94663x', '2026-09-05T16:00:00Z'),
    ];
    expect(await installStagedBundleOnLaunch()).toBe(true);
    expect(setSpy).toHaveBeenCalledWith({ id: 'new-2' });
  });

  it('is a no-op on web', async () => {
    isNative = false;
    bundles = [pending('new-1', '9d514942', '2026-09-05T16:46:00Z')];
    expect(await installStagedBundleOnLaunch()).toBe(false);
    expect(setSpy).not.toHaveBeenCalled();
  });

  it('swallows a plugin error instead of breaking boot', async () => {
    listShouldThrow = true;
    await expect(installStagedBundleOnLaunch()).resolves.toBe(false);
    expect(setSpy).not.toHaveBeenCalled();
  });
});
