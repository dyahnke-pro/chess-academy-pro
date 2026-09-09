import { describe, it, expect, vi, beforeEach } from 'vitest';

// 🔒 REGRESSION (David 2026-09-09 device audit): a single aborted manifest fetch
// in installStagedBundleOnLaunch stranded every staged bundle — his phone had 6
// downloaded, none installed, stuck on the builtin. The launch-installer must
// RETRY the manifest fetch (forward-only unchanged) so a transient abort no
// longer leaves a ready, forward bundle un-applied.

let setCalls: Array<{ id: string }> = [];
let fetchAttempts = 0;

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => 'ios' },
}));

vi.mock('@capgo/capacitor-updater', () => ({
  CapacitorUpdater: {
    current: async () => ({ bundle: { version: '9a2d187a', id: 'builtin-id', status: 'success' } }),
    list: async () => ({ bundles: [{ version: '5169b560', id: 'staged-id', status: 'pending' }] }),
    getBuiltinVersion: async () => ({ version: '9a2d187a' }),
    set: async (opts: { id: string }) => { setCalls.push(opts); },
    addListener: async () => ({ remove: async () => undefined }),
  },
}));

vi.mock('./analytics', () => ({ captureEvent: () => undefined, isAnalyticsEnabled: () => false }));
vi.mock('./appAuditor', () => ({ logAppAudit: async () => undefined }));

beforeEach(() => { setCalls = []; fetchAttempts = 0; });

describe('installStagedBundleOnLaunch — resilient to a flaky manifest fetch', () => {
  it('retries after an aborted fetch and installs the manifest-advertised staged bundle', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      fetchAttempts += 1;
      if (fetchAttempts === 1) {
        const e = new Error('Fetch is aborted'); e.name = 'AbortError'; throw e; // first attempt dies (backgrounding)
      }
      return { ok: true, json: async () => ({ version: '5169b560' }) } as unknown as Response;
    }));
    const { installStagedBundleOnLaunch } = await import('./otaObserver');
    const applied = await installStagedBundleOnLaunch();
    expect(fetchAttempts).toBeGreaterThanOrEqual(2);      // it did NOT give up on the first abort
    expect(applied).toBe(true);
    expect(setCalls).toEqual([{ id: 'staged-id' }]);       // installed the forward, advertised bundle
    vi.unstubAllGlobals();
  });

  it('applies nothing when the manifest keeps failing (stays put — safe)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      fetchAttempts += 1;
      const e = new Error('Fetch is aborted'); e.name = 'AbortError'; throw e;
    }));
    const { installStagedBundleOnLaunch } = await import('./otaObserver');
    const applied = await installStagedBundleOnLaunch();
    expect(applied).toBe(false);
    expect(setCalls).toEqual([]);                          // never rolls to an un-vetted bundle
    vi.unstubAllGlobals();
  });
});
