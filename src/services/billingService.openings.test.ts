import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useEntitlementStore } from '../stores/entitlementStore';

/**
 * Openings sold one at a time ($0.99, David 2026-10-25): ownership is read off
 * the store's own record of one-time purchases every time customer info
 * arrives — boot, purchase, restore — never a local flag.
 */
vi.mock('./appAuditor', () => ({ logAppAudit: vi.fn() }));
vi.mock('./billingAnalytics', async (orig) => ({
  ...(await orig<typeof import('./billingAnalytics')>()),
  syncSubscriptionPerson: vi.fn(),
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: (): boolean => true, getPlatform: (): string => 'ios' },
}));

interface FakeCustomerInfo {
  entitlements: { active: Record<string, never> };
  nonSubscriptionTransactions: Array<{ productIdentifier: string }>;
}

const rc = vi.hoisted(() => {
  const info = (productIds: string[]): FakeCustomerInfo => ({
    entitlements: { active: {} },
    nonSubscriptionTransactions: productIds.map((productIdentifier) => ({ productIdentifier })),
  });
  return {
    info,
    customer: { current: info([]) },
    products: [] as Array<{ identifier: string; priceString: string; price: number; currencyCode: string; title: string }>,
    purchase: vi.fn(),
  };
});
vi.mock('@revenuecat/purchases-capacitor', () => ({
  LOG_LEVEL: { DEBUG: 'DEBUG' },
  PRODUCT_CATEGORY: { NON_SUBSCRIPTION: 'NON_SUBSCRIPTION' },
  Purchases: {
    configure: async (): Promise<void> => undefined,
    logIn: async (): Promise<void> => undefined,
    setLogLevel: async (): Promise<void> => undefined,
    addCustomerInfoUpdateListener: async (): Promise<void> => undefined,
    getCustomerInfo: async () => ({ customerInfo: rc.customer.current }),
    restorePurchases: async () => ({ customerInfo: rc.customer.current }),
    getProducts: async ({ productIdentifiers }: { productIdentifiers: string[] }) => ({
      products: rc.products.filter((p) => productIdentifiers.includes(p.identifier)),
    }),
    purchaseStoreProduct: rc.purchase,
  },
}));

const CARO = { identifier: 'opening.caro_kann', priceString: '$0.99', price: 0.99, currencyCode: 'USD', title: 'Caro-Kann Defense' };

async function boot(): Promise<typeof import('./billingService')> {
  vi.resetModules();
  vi.stubEnv('VITE_REVENUECAT_IOS_KEY', 'appl_test');
  const mod = await import('./billingService');
  await mod.initBilling();
  return mod;
}

beforeEach(() => {
  useEntitlementStore.getState().reset();
  rc.customer.current = rc.info([]);
  rc.products = [CARO];
  rc.purchase.mockReset();
});

describe('billingService — openings bought one at a time', () => {
  it('reads owned openings off the store at boot, ignoring products that are not openings', async () => {
    rc.customer.current = rc.info(['opening.caro_kann', 'some_other_product']);
    await boot();
    const { useEntitlementStore: store } = await import('../stores/entitlementStore');
    expect(store.getState().ownedOpeningIds).toEqual(['caro-kann']);
  });

  it('offers an opening at the store\'s own price, and nothing for an opening not on sale', async () => {
    const billing = await boot();
    await expect(billing.getOpeningOffer('caro-kann')).resolves.toMatchObject({
      openingId: 'caro-kann', productId: 'opening.caro_kann', priceString: '$0.99', priceAmount: 0.99,
    });
    rc.products = [];
    await expect(billing.getOpeningOffer('caro-kann')).resolves.toBeNull();
    await expect(billing.getOpeningOffer('not-an-opening')).resolves.toBeNull();
  });

  it('a purchase owns the opening straight from the purchase result', async () => {
    const billing = await boot();
    rc.purchase.mockResolvedValue({ productIdentifier: 'opening.caro_kann', customerInfo: rc.info(['opening.caro_kann']) });
    const offer = await billing.getOpeningOffer('caro-kann');
    await expect(billing.purchaseOpening(offer!)).resolves.toBe(true);
    const { useEntitlementStore: store } = await import('../stores/entitlementStore');
    expect(store.getState().ownedOpeningIds).toEqual(['caro-kann']);
    expect(rc.purchase).toHaveBeenCalledWith({ product: CARO });
  });

  it('a cancelled sheet owns nothing and resolves false', async () => {
    const billing = await boot();
    rc.purchase.mockRejectedValue({ userCancelled: true, message: 'cancelled' });
    const offer = await billing.getOpeningOffer('caro-kann');
    await expect(billing.purchaseOpening(offer!)).resolves.toBe(false);
    const { useEntitlementStore: store } = await import('../stores/entitlementStore');
    expect(store.getState().ownedOpeningIds).toEqual([]);
  });

  it('a refund takes the opening away on the next customer info', async () => {
    rc.customer.current = rc.info(['opening.caro_kann']);
    const billing = await boot();
    rc.customer.current = rc.info([]);
    await billing.restorePurchases();
    const { useEntitlementStore: store } = await import('../stores/entitlementStore');
    expect(store.getState().ownedOpeningIds).toEqual([]);
  });

  it('restore reports an opening coming back even with no subscription', async () => {
    const billing = await boot();
    rc.customer.current = rc.info(['opening.caro_kann']);
    await expect(billing.restorePurchases()).resolves.toBe(true);
  });
});
