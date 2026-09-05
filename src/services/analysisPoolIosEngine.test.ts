// On a native iOS app the batch analysis pool must NOT spawn.
//
// 🚨 WHAT THIS COSTS WHEN IT REGRESSES (David 2026-09-05: "my games are not
// analyzing", phone hot, progress stuck on 1 of 831).
//
// `spawnDedicatedWorker` resolves its engine through `resolveWorkerUrl()`,
// which pins iOS to the ASM.JS build, and then calls `new Worker(url)`. The
// native ARM Stockfish plugin is not a Worker, so the pool could never reach
// it. Both instruments said the same thing on one run of his device:
//
//     stockfishEngine.initialize     variant=ios-native   ← fast
//     spawnDedicatedWorker worker 0  variant=asm          ← slowest we ship
//     spawnDedicatedWorker worker 1  variant=asm
//     analyze kickoff — 831 unanalyzed
//
// Zero uncaught errors. It was not crashing, it was grinding — two asm.js
// engines on 831 games while the "vastly faster" native engine sat idle.
//
// 🚨 AND WHY A UNIT TEST RATHER THAN THE AUDIT. `audit-analysis-pool-engine-prod`
// exists for precisely this defect — its SF2 asserts the pool resolves the SAME
// build as the singleton. It passes 8/8 and is STRUCTURALLY BLIND here: it
// drives desktop Chromium, where both resolve to `multi` and agree. The
// divergence only exists on iOS, which that audit never visits. A green audit
// was not evidence, so the check has to live where the platform can be faked.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// vi.mock is hoisted above every const, so the spies are created INSIDE the
// factory and read back through the mocked module.
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
    getPlatform: vi.fn(),
    isPluginAvailable: vi.fn(),
  },
  registerPlugin: () => ({}),
  WebPlugin: class {},
}));

import { Capacitor } from '@capacitor/core';
import { __testables } from './gameAnalysisService';

const capacitor = vi.mocked(Capacitor);

const { resolveWorkerPoolSize } = __testables;

/** Ask the real decision function what pool size a given device gets. */
function poolSizeFor(opts: { native: boolean; platform: string; plugin: boolean; cores: number }): number {
  capacitor.isNativePlatform.mockReturnValue(opts.native);
  capacitor.getPlatform.mockReturnValue(opts.platform);
  capacitor.isPluginAvailable.mockReturnValue(opts.plugin);
  vi.stubGlobal('navigator', { hardwareConcurrency: opts.cores });
  return resolveWorkerPoolSize();
}

beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('analysis worker pool — engine choice per platform', () => {
  it('does NOT spawn a pool on native iOS with the Stockfish plugin', () => {
    const t = poolSizeFor({ native: true, platform: 'ios', plugin: true, cores: 6 });
    // 0 => both callers fall back to the singleton, which on iOS is the native
    // ARM engine. Any positive number here is asm.js workers coming back.
    expect(t).toBe(0);
  });

  it('still pools on native Android, where the singleton is the JS engine', () => {
    const t = poolSizeFor({ native: true, platform: 'android', plugin: false, cores: 6 });
    expect(t).toBeGreaterThan(0);
    expect(t).toBeLessThanOrEqual(2);
  });

  it('still pools on iOS when the native plugin is absent (mobile web / PWA)', async () => {
    // No plugin => the singleton is asm.js too, so a pool is a genuine win.
    const t = await poolSizeFor({ native: false, platform: 'ios', plugin: false, cores: 6 });
    expect(t).toBeGreaterThan(0);
  });

  it('still pools on desktop web', () => {
    const t = poolSizeFor({ native: false, platform: 'web', plugin: false, cores: 8 });
    expect(t).toBeGreaterThan(1);
  });
});
