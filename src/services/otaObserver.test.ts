import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- mocks ---------------------------------------------------------------
const captured: { name: string; props?: Record<string, unknown> }[] = [];
const audits: { kind: string; summary: string }[] = [];
const listeners: string[] = [];

let isNative = true;

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => isNative },
}));

vi.mock('@capgo/capacitor-updater', () => ({
  CapacitorUpdater: {
    current: async () => ({
      bundle: { version: '1a2b3c4', id: 'bundle-1', status: 'success' },
      native: '3.2.0',
    }),
    getBuiltinVersion: async () => ({ version: 'deadbee' }),
    addListener: async (name: string) => {
      listeners.push(name);
      return { remove: async () => undefined };
    },
  },
}));

let analyticsReady = true;
vi.mock('./analytics', () => ({
  captureEvent: (name: string, props?: Record<string, unknown>) => {
    captured.push({ name, props });
  },
  isAnalyticsEnabled: () => analyticsReady,
}));

vi.mock('./appAuditor', () => ({
  logAppAudit: async (e: { kind: string; summary: string }) => {
    audits.push({ kind: e.kind, summary: e.summary });
  },
}));

async function freshObserver() {
  vi.resetModules();
  const mod = await import('./otaObserver');
  return mod.startOtaObserver;
}

beforeEach(() => {
  analyticsReady = true;
  captured.length = 0;
  audits.length = 0;
  listeners.length = 0;
  isNative = true;
});

describe('otaObserver', () => {
  it('emits an ota_boot snapshot (running vs builtin) on native', async () => {
    const start = await freshObserver();
    await start();
    const boot = captured.find((c) => c.name === 'ota_boot');
    expect(boot).toBeTruthy();
    expect(boot?.props?.running).toBe('1a2b3c4');
    expect(boot?.props?.builtin).toBe('deadbee');
    expect(boot?.props?.nativeVersion).toBe('3.2.0');
    // audit-stream mirror fired too
    expect(audits.some((a) => a.kind === 'ota-boot')).toBe(true);
  });

  it('registers the full lifecycle listener set', async () => {
    const start = await freshObserver();
    await start();
    for (const ev of [
      'updateAvailable',
      'downloadComplete',
      'downloadFailed',
      'updateFailed',
      'noNeedUpdate',
      'set',
      'appReloaded',
      'appReady',
    ]) {
      expect(listeners).toContain(ev);
    }
  });

  it('is a complete no-op on web (never touches analytics)', async () => {
    isNative = false;
    const start = await freshObserver();
    await start();
    expect(captured).toHaveLength(0);
    expect(audits).toHaveLength(0);
    expect(listeners).toHaveLength(0);
  });

  it('is idempotent — a second start does not double-register', async () => {
    const start = await freshObserver();
    await start();
    const first = listeners.length;
    await start();
    expect(listeners.length).toBe(first);
  });

  // THE REGRESSION THIS GUARDS: `startOtaObserver` runs from main.tsx before
  // React mounts, but `initAnalytics` runs from an App effect that waits on the
  // profile — so the boot snapshot was captured while `captureEvent` still
  // DROPS. Measured on prod 2026-09-03: ota_boot reached 6 devices, ota_app_ready
  // (which fires later, after init) reached 56. The snapshot is the only signal
  // that says which bundle the device actually booted, so losing it is losing
  // the answer to "did the OTA land?".
  it('still sends the boot snapshot when analytics initialises late', async () => {
    vi.useFakeTimers();
    analyticsReady = false;
    try {
      const start = await freshObserver();
      await start();
      expect(captured.find((c) => c.name === 'ota_boot')).toBeUndefined();

      analyticsReady = true;
      await vi.advanceTimersByTimeAsync(600);

      const boot = captured.find((c) => c.name === 'ota_boot');
      expect(boot).toBeDefined();
      expect(boot?.props?.running).toBeDefined();
      expect(boot?.props?.builtin).toBeDefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('gives up on the boot snapshot rather than leaking a timer forever', async () => {
    vi.useFakeTimers();
    analyticsReady = false;
    try {
      const start = await freshObserver();
      await start();
      await vi.advanceTimersByTimeAsync(31_000);
      expect(vi.getTimerCount()).toBe(0);
      expect(captured.find((c) => c.name === 'ota_boot')).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });
});
