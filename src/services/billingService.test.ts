import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initBilling, isBillingConfigured, getBillingPackages, purchasePackage, restorePurchases, clearBillingError, getStableAnalyticsId } from './billingService';
import { useEntitlementStore } from '../stores/entitlementStore';

// The audit sink is a fire-and-forget side effect — stub it so the test stays
// focused on entitlement resolution.
vi.mock('./appAuditor', () => ({ logAppAudit: vi.fn() }));

describe('billingService — keyless (graceful degradation)', () => {
  beforeEach(() => {
    useEntitlementStore.getState().reset();
    vi.unstubAllEnvs();
  });

  it('reports unconfigured when no platform key is set', () => {
    // jsdom → Capacitor web platform; VITE_REVENUECAT_WEB_KEY is unset.
    expect(isBillingConfigured()).toBe(false);
  });

  it('initBilling resolves to Pro/unconfigured with no key (app stays usable)', async () => {
    await initBilling();
    const s = useEntitlementStore.getState();
    expect(s.isPro).toBe(true);
    expect(s.source).toBe('unconfigured');
    expect(s.isResolving).toBe(false);
  });

  it('billing actions no-op safely when unconfigured', async () => {
    await initBilling();
    await expect(getBillingPackages()).resolves.toEqual([]);
    await expect(purchasePackage('monthly')).resolves.toBe(false);
    await expect(restorePurchases()).resolves.toBe(false);
  });

  it('getStableAnalyticsId returns null when billing is unconfigured (web/keyless → PostHog cookie id stays)', async () => {
    // No RevenueCat key in jsdom, so there is no durable Keychain id to hand
    // PostHog — identify() must be skipped, leaving PostHog's own stable id.
    await initBilling();
    await expect(getStableAnalyticsId()).resolves.toBeNull();
  });

  it('clearBillingError wipes a stored error so the paywall banner cannot linger', () => {
    useEntitlementStore.getState().setError('StoreKit exploded');
    expect(useEntitlementStore.getState().lastError).toBe('StoreKit exploded');
    clearBillingError();
    expect(useEntitlementStore.getState().lastError).toBeNull();
  });
});

// DURABLE CUSTOMER IDENTITY (David 2026-08-01: "make sure I have access").
// Every install used to be a throwaway $RCAnonymousID, so a reinstall orphaned
// the customer and no entitlement could be granted to a specific person. The
// app now hands RevenueCat its own Dexie device id — but the ORDER matters:
// configuring straight into a new appUserID makes RevenueCat treat it as a
// different customer and silently strands an existing purchase. It must
// configure anonymously and then ALIAS via logIn.
describe('billingService — stable app user id migration', () => {
  const configure = vi.fn(async () => undefined);
  const logIn = vi.fn(async () => ({ customerInfo: { entitlements: { active: {} } } }));

  beforeEach(() => {
    useEntitlementStore.getState().reset();
    configure.mockClear();
    logIn.mockClear();
    vi.resetModules();
    // resolvePlatformKey() bails unless Capacitor reports a NATIVE platform, so
    // the whole init path is dead in jsdom without this.
    vi.doMock('@capacitor/core', () => ({
      Capacitor: { isNativePlatform: () => true, getPlatform: () => 'ios' },
    }));
    vi.doMock('@revenuecat/purchases-capacitor', () => ({
      LOG_LEVEL: { DEBUG: 'DEBUG' },
      Purchases: {
        configure,
        logIn,
        setLogLevel: vi.fn(async () => undefined),
        addCustomerInfoUpdateListener: vi.fn(async () => undefined),
        getCustomerInfo: vi.fn(async () => ({ customerInfo: { entitlements: { active: {} } } })),
      },
    }));
    vi.stubEnv('VITE_REVENUECAT_IOS_KEY', 'appl_test');
  });

  it('configures ANONYMOUSLY, then aliases onto the device id', async () => {
    const { initBilling: init } = await import('./billingService');
    await init('device-abc');
    // The configure call must NOT carry the id — that is what orphans a
    // customer and loses their purchase.
    expect(configure).toHaveBeenCalledTimes(1);
    expect(configure.mock.calls[0][0]).not.toHaveProperty('appUserID');
    expect(logIn).toHaveBeenCalledWith({ appUserID: 'device-abc' });
  });

  it('skips the alias entirely when no device id resolved', async () => {
    const { initBilling: init } = await import('./billingService');
    await init(undefined);
    expect(configure).toHaveBeenCalledTimes(1);
    expect(logIn).not.toHaveBeenCalled();
  });

  it('a failed alias never costs the user their entitlement', async () => {
    logIn.mockRejectedValueOnce(new Error('network down'));
    const { initBilling: init } = await import('./billingService');
    await expect(init('device-abc')).resolves.toBeUndefined();
    // Still configured on the anonymous customer, which owns the purchase.
    expect(configure).toHaveBeenCalledTimes(1);
  });
});
