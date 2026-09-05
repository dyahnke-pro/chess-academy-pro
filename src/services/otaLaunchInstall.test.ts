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
/** What the OTA manifest currently advertises for this device. The server owns
 *  the forward-only ordinal, so this is what decides whether anything applies. */
let advertised: { kind?: string; version?: string } = {};
let manifestShouldThrow = false;
vi.stubGlobal('fetch', async () => {
  if (manifestShouldThrow) throw new Error('offline');
  return { ok: true, json: async () => advertised } as unknown as Response;
});

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => isNative, getPlatform: () => 'ios' },
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
  manifestShouldThrow = false;
  advertised = {};
});

describe('installStagedBundleOnLaunch', () => {
  it('applies a newer pending bundle at launch', async () => {
    bundles = [currentBundle, pending('new-1', '9d514942', '2026-09-05T16:46:00Z')];
    advertised = { version: '9d514942' };   // the server says this is the one
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

  // ⚠️ THIS TEST ASSERTED THE BUG. It used to require the most recently
  // DOWNLOADED staged bundle to win, which is not version order — and that is
  // precisely how David's device rolled back onto an ancestor bundle. The
  // contract is now "whatever the server advertises", so the download times
  // below are deliberately scrambled: the winner is the OLDEST download.
  it('ignores download time entirely — the server picks, however stale the download', async () => {
    bundles = [
      pending('old-1', 'c18e02fd9', '2026-09-05T15:30:00Z'),
      pending('new-2', '9d514942', '2026-09-05T16:46:00Z'),
      pending('mid-1', 'ece94663x', '2026-09-05T16:00:00Z'),
    ];
    advertised = { version: 'c18e02fd9' };   // the earliest download, and correct
    expect(await installStagedBundleOnLaunch()).toBe(true);
    expect(setSpy).toHaveBeenCalledWith({ id: 'old-1' });
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

// 🔒 FORWARD-ONLY. The first version of this install took the most recently
// DOWNLOADED pending bundle, which is not version order at all: a bundle
// fetched while the pointer briefly served it, then left pending, gets applied
// on a later launch OVER a newer one. David's device did exactly that — booted
// d5c1b818, then rolled BACK to its ancestor 6215607a three times. Bundle
// versions are git short SHAs, so nothing on-device can order them; the
// manifest can, and refuses to advertise anything at or below what the device
// runs. These pin that the install now inherits that guarantee.
describe('installStagedBundleOnLaunch — never rolls a device backward', () => {
  it('applies the bundle the server advertises, not the most recently downloaded', async () => {
    currentBundle = { id: 'cur-1', version: 'd5c1b818', status: 'success', downloaded: '2026-09-05T21:50:00Z', checksum: '' };
    // The stale ancestor was downloaded LATER than the good one — the exact
    // ordering that fooled the previous implementation.
    bundles = [
      pending('p-new', '7a4e1390', '2026-09-05T21:00:00Z'),
      pending('p-old', '6215607a', '2026-09-05T21:40:00Z'),
    ];
    advertised = { version: '7a4e1390' };

    await expect(installStagedBundleOnLaunch()).resolves.toBe(true);
    expect(setSpy).toHaveBeenCalledWith({ id: 'p-new' });
  });

  it('applies NOTHING when the only staged bundle is older than what is running', async () => {
    // The server, asked about d5c1b818, reports up-to-date: 6215607a is behind
    // it and must never be applied.
    currentBundle = { id: 'cur-1', version: 'd5c1b818', status: 'success', downloaded: '2026-09-05T21:50:00Z', checksum: '' };
    bundles = [pending('p-old', '6215607a', '2026-09-05T21:40:00Z')];
    advertised = { kind: 'up_to_date' };

    await expect(installStagedBundleOnLaunch()).resolves.toBe(false);
    expect(setSpy, 'this is the rollback that stranded devices on a crashing build').not.toHaveBeenCalled();
  });

  it('applies nothing when the manifest is unreachable — staying put is always safe', async () => {
    currentBundle = { id: 'cur-1', version: 'd5c1b818', status: 'success', downloaded: '2026-09-05T21:50:00Z', checksum: '' };
    bundles = [pending('p-old', '6215607a', '2026-09-05T21:40:00Z')];
    manifestShouldThrow = true;

    await expect(installStagedBundleOnLaunch()).resolves.toBe(false);
    expect(setSpy).not.toHaveBeenCalled();
  });

  it('applies nothing when no staged bundle matches what is advertised', async () => {
    currentBundle = { id: 'cur-1', version: 'd5c1b818', status: 'success', downloaded: '2026-09-05T21:50:00Z', checksum: '' };
    bundles = [pending('p-old', '6215607a', '2026-09-05T21:40:00Z')];
    advertised = { version: '7a4e1390' };   // advertised but not downloaded yet

    await expect(installStagedBundleOnLaunch()).resolves.toBe(false);
    expect(setSpy).not.toHaveBeenCalled();
  });
});
