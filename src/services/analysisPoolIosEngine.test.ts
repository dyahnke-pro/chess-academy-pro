// The batch-analysis pool MUST stay on on native iOS (2 asm.js workers).
//
// 🚨 WHAT THIS COSTS WHEN IT REGRESSES (David 2026-09-05: "still stuck at 1").
//
// e1534fc returned a pool size of 0 on native iOS so the batch would fall back
// to the native ARM singleton, reasoning the singleton is "vastly faster" than
// the asm.js pool. It never verified the singleton COMPLETES a batch — and it
// does not. With no pool, `analyzeGamePositions` drives every position of every
// game through the native singleton in a tight sequential loop, and one
// `analyzePosition` never resolves: the sweep wedges on game 1.
//
// The differential is unambiguous in PostHog, straight off David's device:
//
//   WORKED  (bundles 261efbd / b2c3f7f — misconception + weakness output flowing):
//     gameAnalysisService.spawnDedicatedWorker  worker 0/1  variant=asm   (/weaknesses)
//   BROKE   (bundle 561d741d = e1534fc — ZERO analysis output all day):
//     stockfishEngine.initialize  variant=ios-native   ← and NO pool workers at all
//
// The asm.js build is the app's DELIBERATE safe iOS engine (the WASM/multi
// builds are the ones that crash-storm — see resolveWorkerUrl). The pool spawns
// isolated Worker engines and does not wedge. e1534fc's real complaint — "2 asm
// engines grinding 831 games = hot phone" — is a batch-SIZE problem, fixed by
// ANALYSIS_PACKAGE_SIZE (50 games per tap), not by deleting the one engine path
// that actually finishes. So: keep the pool, bound the work.
//
// 🚨 AND WHY A UNIT TEST RATHER THAN THE AUDIT. `audit-analysis-pool-engine-prod`
// drives desktop Chromium, where every build resolves to `multi` and agrees — it
// is structurally blind to the iOS-only divergence and passed 8/8 while iOS was
// broken. The check has to live where the platform can be faked.
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
  WebPlugin: function WebPlugin() { /* export must exist; never constructed */ },
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
  it('KEEPS the asm.js pool on native iOS with the Stockfish plugin', () => {
    const t = poolSizeFor({ native: true, platform: 'ios', plugin: true, cores: 6 });
    // 1-2 asm.js Worker engines — the path that actually completes a batch.
    // 0 here is the e1534fc regression: it routes batch to the native singleton,
    // which wedges on game 1 ("stuck at 1"). The 50-game package cap, not a dead
    // pool, is what keeps the phone cool.
    expect(t).toBeGreaterThan(0);
    expect(t).toBeLessThanOrEqual(2);
  });

  it('pools on native Android too, capped for UI + voice', () => {
    const t = poolSizeFor({ native: true, platform: 'android', plugin: false, cores: 6 });
    expect(t).toBeGreaterThan(0);
    expect(t).toBeLessThanOrEqual(2);
  });

  it('CAPS the pool on iOS mobile web / PWA — a phone is a phone, even in Safari', () => {
    // isNativePlatform() is false in Safari, so this used to fall into the
    // desktop branch and get up to 6 asm.js engines on an iPhone → OOM/wedge
    // (David 2026-09-05, testing on iPhone Safari). Must cap like the app does.
    const t = poolSizeFor({ native: false, platform: 'ios', plugin: false, cores: 6 });
    expect(t).toBeGreaterThan(0);
    expect(t).toBeLessThanOrEqual(2);
  });

  it('pools wider on desktop web', () => {
    const t = poolSizeFor({ native: false, platform: 'web', plugin: false, cores: 8 });
    expect(t).toBeGreaterThan(1);
  });
});
