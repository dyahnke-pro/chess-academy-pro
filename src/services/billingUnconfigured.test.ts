/**
 * A NATIVE DEVICE WITH BILLING SWITCHED OFF MUST SAY SO.
 *
 * `initBilling` marks the user Pro and returns when there is no RevenueCat key.
 * That is correct — it fails OPEN, so nobody is ever locked out — but on NATIVE
 * it also means no purchase, no restore and no subscription recognised, and it
 * used to happen in total silence. A dead revenue path was indistinguishable
 * from a quiet week.
 *
 * It is not hypothetical: the OTA bundle is built from the WEB environment
 * (`vercel build --prod` in ota-publish.yml), which carries no
 * VITE_REVENUECAT_IOS_KEY — so every native device that applies an OTA loses
 * billing until its next store install. Discovered 2026-09-03, after the OTA
 * pipeline was repaired and started landing reliably for everyone.
 *
 * The two properties that matter, and they pull against each other:
 *   - NATIVE keyless  → report it (this is a defect worth seeing)
 *   - WEB keyless     → stay silent (that is the designed, permanent state;
 *                       the web app is deliberately free and unwalled)
 * A detector that cannot tell them apart is either blind or pure noise.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('./appAuditor', () => ({ logAppAudit: vi.fn() }));

const captured: { name: string; props?: Record<string, unknown> }[] = [];
vi.mock('./analytics', () => ({
  captureEvent: (name: string, props?: Record<string, unknown>) => {
    captured.push({ name, props });
  },
}));

let isNative = false;
let platform = 'web';
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => isNative,
    getPlatform: () => platform,
  },
}));

vi.mock('@capgo/capacitor-updater', () => ({
  CapacitorUpdater: {
    current: async () => ({ bundle: { version: '34742dcd' }, native: '4.0' }),
  },
}));

beforeEach(() => {
  captured.length = 0;
  vi.resetModules();
});

const EVENT = 'billing_unconfigured_native';

describe('billing unconfigured on native', () => {
  it('reports it, naming the platform and the running bundle', async () => {
    isNative = true;
    platform = 'ios';
    const { initBilling } = await import('./billingService');
    const { useEntitlementStore } = await import('../stores/entitlementStore');
    useEntitlementStore.getState().reset();

    await initBilling();

    const hit = captured.find((c) => c.name === EVENT);
    expect(hit, 'a native boot with no billing key must emit an event').toBeDefined();
    expect(hit?.props?.native_platform).toBe('ios');
    // The bundle is the discriminator: the shipped builtin carries the key, an
    // OTA bundle does not. Without it the event says a device is broken but not
    // which population it belongs to.
    expect(hit?.props?.bundle).toBe('34742dcd');

    // ...and it still fails OPEN. Reporting must never cost the user access.
    expect(useEntitlementStore.getState().isPro).toBe(true);
  });

  it('stays silent on web, where keyless is the permanent design', async () => {
    isNative = false;
    platform = 'web';
    const { initBilling } = await import('./billingService');
    const { useEntitlementStore } = await import('../stores/entitlementStore');
    useEntitlementStore.getState().reset();

    await initBilling();

    expect(captured.find((c) => c.name === EVENT), 'web is keyless by design — reporting it is pure noise').toBeUndefined();
    expect(useEntitlementStore.getState().isPro).toBe(true);
  });
});
