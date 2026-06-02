import { describe, it, expect, beforeEach } from 'vitest';
import {
  useEntitlementStore,
  DEFAULT_ENTITLEMENT,
  selectIsPro,
  isPaywallGateEnabled,
  trialDaysLeft,
} from './entitlementStore';

beforeEach(() => {
  useEntitlementStore.getState().reset();
});

describe('entitlementStore — defaults', () => {
  it('starts not-Pro, unknown, resolving (gate dormant, app still usable)', () => {
    const s = useEntitlementStore.getState();
    expect(s.isPro).toBe(false);
    expect(s.status).toBe('unknown');
    expect(s.isResolving).toBe(true);
    expect(s.lastError).toBeNull();
  });
});

describe('entitlementStore — setEntitlement', () => {
  it('a paid subscription resolves to Pro', () => {
    useEntitlementStore.getState().setEntitlement({ isPro: true, source: 'subscription' });
    const s = useEntitlementStore.getState();
    expect(s.isPro).toBe(true);
    expect(s.status).toBe('pro');
    expect(s.source).toBe('subscription');
    expect(s.isResolving).toBe(false);
  });

  it('a trial resolves to Pro with an expiry', () => {
    const end = Date.now() + 7 * 24 * 60 * 60 * 1000;
    useEntitlementStore.getState().setEntitlement({ isPro: true, source: 'trial', expiresAt: end });
    const s = useEntitlementStore.getState();
    expect(selectIsPro(s)).toBe(true);
    expect(s.source).toBe('trial');
    expect(s.expiresAt).toBe(end);
  });

  it('no entitlement resolves to free (the wall case)', () => {
    useEntitlementStore.getState().setEntitlement({ isPro: false, source: 'none' });
    const s = useEntitlementStore.getState();
    expect(s.isPro).toBe(false);
    expect(s.status).toBe('free');
  });

  it('setError surfaces the paywall error state and stops resolving', () => {
    useEntitlementStore.getState().setError('store unreachable');
    const s = useEntitlementStore.getState();
    expect(s.lastError).toBe('store unreachable');
    expect(s.isResolving).toBe(false);
  });

  it('reset restores defaults', () => {
    useEntitlementStore.getState().setEntitlement({ isPro: true, source: 'subscription' });
    useEntitlementStore.getState().reset();
    expect(useEntitlementStore.getState()).toMatchObject(DEFAULT_ENTITLEMENT);
  });
});

describe('isPaywallGateEnabled — dormant by default', () => {
  it('is false unless VITE_PAYWALL_ENABLED === "true"', () => {
    // No flag set in the test env → gate is dormant.
    expect(isPaywallGateEnabled()).toBe(false);
  });
});

describe('trialDaysLeft — countdown copy', () => {
  it('returns null when there is no expiry', () => {
    expect(trialDaysLeft(null)).toBeNull();
  });

  it('rounds up partial days', () => {
    const now = 1_000_000_000_000;
    expect(trialDaysLeft(now + 2.4 * 24 * 60 * 60 * 1000, now)).toBe(3);
    expect(trialDaysLeft(now + 1, now)).toBe(1);
  });

  it('returns 0 once elapsed', () => {
    const now = 1_000_000_000_000;
    expect(trialDaysLeft(now - 1, now)).toBe(0);
  });
});
