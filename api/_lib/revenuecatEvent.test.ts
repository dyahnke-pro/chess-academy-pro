import { describe, it, expect } from 'vitest';
import { mapRevenueCatEvent } from './revenuecatEvent';

const BASE = {
  app_user_id: 'rc-user-1',
  product_id: 'pro_monthly',
  price: 7.99,
  price_in_purchased_currency: 7.99,
  currency: 'USD',
  store: 'APP_STORE',
  environment: 'PRODUCTION',
  expiration_at_ms: Date.UTC(2027, 0, 1),
};

describe('mapRevenueCatEvent — identity + drops', () => {
  it('returns null with no event', () => {
    expect(mapRevenueCatEvent(null)).toBeNull();
    expect(mapRevenueCatEvent(undefined)).toBeNull();
  });

  it('drops an event with no type or no user id', () => {
    expect(mapRevenueCatEvent({ ...BASE, type: '' })).toBeNull();
    expect(mapRevenueCatEvent({ type: 'RENEWAL' })).toBeNull();
  });

  it('keys distinct_id on app_user_id (falls back to original)', () => {
    const m = mapRevenueCatEvent({ type: 'RENEWAL', original_app_user_id: 'orig-9', ...BASE, app_user_id: undefined });
    expect(m?.distinctId).toBe('orig-9');
  });
});

describe('mapRevenueCatEvent — trial vs paid split', () => {
  it('INITIAL_PURCHASE with a TRIAL period is a trial start, no revenue', () => {
    const m = mapRevenueCatEvent({ ...BASE, type: 'INITIAL_PURCHASE', period_type: 'TRIAL' });
    expect(m?.event).toBe('trial_started');
    expect(m?.properties).not.toHaveProperty('revenue');
    expect((m?.properties.$set as Record<string, unknown>).subscription_status).toBe('trial');
  });

  it('INITIAL_PURCHASE with NORMAL period is a paid conversion carrying revenue', () => {
    const m = mapRevenueCatEvent({ ...BASE, type: 'INITIAL_PURCHASE', period_type: 'NORMAL' });
    expect(m?.event).toBe('purchase_completed');
    expect(m?.properties.revenue).toBe(7.99);
    expect(m?.properties.$revenue).toBe(7.99);
    const set = m?.properties.$set as Record<string, unknown>;
    expect(set.is_pro).toBe(true);
    expect(set.subscription_expires_at).toBe(new Date(BASE.expiration_at_ms).toISOString());
  });
});

describe('mapRevenueCatEvent — lifecycle (the closed-app events clients miss)', () => {
  it('RENEWAL carries revenue and keeps is_pro true', () => {
    const m = mapRevenueCatEvent({ ...BASE, type: 'RENEWAL', period_type: 'NORMAL' });
    expect(m?.event).toBe('subscription_renewed');
    expect(m?.properties.revenue).toBe(7.99);
    expect((m?.properties.$set as Record<string, unknown>).is_pro).toBe(true);
  });

  it('EXPIRATION flips is_pro false and carries NO revenue', () => {
    const m = mapRevenueCatEvent({ ...BASE, type: 'EXPIRATION' });
    expect(m?.event).toBe('subscription_expired');
    expect(m?.properties).not.toHaveProperty('revenue');
    const set = m?.properties.$set as Record<string, unknown>;
    expect(set.is_pro).toBe(false);
    expect(set.subscription_status).toBe('free');
  });

  it('CANCELLATION is recorded but does NOT flip is_pro (access runs to period end)', () => {
    const m = mapRevenueCatEvent({ ...BASE, type: 'CANCELLATION' });
    expect(m?.event).toBe('subscription_cancelled');
    expect(m?.properties).not.toHaveProperty('$set');
  });

  it('BILLING_ISSUE maps without revenue', () => {
    const m = mapRevenueCatEvent({ ...BASE, type: 'BILLING_ISSUE' });
    expect(m?.event).toBe('subscription_billing_issue');
    expect(m?.properties).not.toHaveProperty('revenue');
  });

  it('an unknown type falls through to rc_<type>, never dropped', () => {
    const m = mapRevenueCatEvent({ ...BASE, type: 'SOME_NEW_EVENT' });
    expect(m?.event).toBe('rc_some_new_event');
    expect(m?.properties.rc_event_type).toBe('SOME_NEW_EVENT');
  });

  it('a RENEWAL with is_trial_conversion is the FIRST paid charge, not a routine renewal', () => {
    const m = mapRevenueCatEvent({
      ...BASE,
      type: 'RENEWAL',
      period_type: 'NORMAL',
      is_trial_conversion: true,
    });
    expect(m?.event).toBe('purchase_completed');
    expect(m?.properties.revenue).toBe(7.99);
    expect(m?.properties.is_trial_conversion).toBe(true);
    const set = m?.properties.$set as Record<string, unknown>;
    expect(set.is_pro).toBe(true);
    expect(set.subscription_status).toBe('subscription');
  });

  it('a RENEWAL without is_trial_conversion stays a routine renewal', () => {
    const m = mapRevenueCatEvent({ ...BASE, type: 'RENEWAL', period_type: 'NORMAL', is_trial_conversion: false });
    expect(m?.event).toBe('subscription_renewed');
    expect(m?.properties).not.toHaveProperty('is_trial_conversion');
  });

  it('uses price_in_purchased_currency when present, else falls back to price', () => {
    const m = mapRevenueCatEvent({
      type: 'RENEWAL',
      app_user_id: 'u',
      price: 5,
      price_in_purchased_currency: 6.5,
      period_type: 'NORMAL',
    });
    expect(m?.properties.revenue).toBe(6.5);
  });
});
