import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initBilling, isBillingConfigured, getBillingPackages, purchasePackage, restorePurchases, clearBillingError } from './billingService';
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

  it('clearBillingError wipes a stored error so the paywall banner cannot linger', () => {
    useEntitlementStore.getState().setError('StoreKit exploded');
    expect(useEntitlementStore.getState().lastError).toBe('StoreKit exploded');
    clearBillingError();
    expect(useEntitlementStore.getState().lastError).toBeNull();
  });
});
