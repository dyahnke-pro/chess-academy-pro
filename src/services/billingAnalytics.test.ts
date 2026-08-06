import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the low-level analytics sink so we can assert the exact event names +
// payloads billingAnalytics emits (captureEvent is a no-op without a key, so we
// can't observe it otherwise).
vi.mock('./analytics', () => ({
  captureEvent: vi.fn(),
  setUserProperties: vi.fn(),
}));

import { captureEvent, setUserProperties } from './analytics';
import {
  BILLING_EVENT,
  trackCheckoutStarted,
  trackPlanSelected,
  trackPaywallDismissed,
  trackPurchaseSuccess,
  trackPurchaseFailed,
  trackPurchaseCancelled,
  trackRestore,
  trackRestoreFailed,
  syncSubscriptionPerson,
  trackFreePuzzleLimitReached,
  trackFreeOpeningClaimed,
  trackSecondOpeningWalled,
  type PurchaseContext,
} from './billingAnalytics';

const capture = vi.mocked(captureEvent);
const setPerson = vi.mocked(setUserProperties);

const CTX: PurchaseContext = {
  packageId: 'pro_monthly',
  priceString: '$7.99',
  priceAmount: 7.99,
  currency: 'USD',
  isAnnual: false,
};

beforeEach(() => {
  capture.mockClear();
  setPerson.mockClear();
});

describe('billingAnalytics — checkout funnel', () => {
  it('checkout_started carries price, period, and the walled feature', () => {
    trackCheckoutStarted(CTX, 'coach');
    expect(capture).toHaveBeenCalledWith(
      BILLING_EVENT.checkoutStarted,
      expect.objectContaining({
        package_id: 'pro_monthly',
        price: 7.99,
        currency: 'USD',
        is_annual: false,
        period: 'monthly',
        walled_feature: 'coach',
      }),
    );
  });

  it('checkout_started omits walled_feature when none given', () => {
    trackCheckoutStarted(CTX, null);
    const props = capture.mock.calls[0][1] as Record<string, unknown>;
    expect(props).not.toHaveProperty('walled_feature');
  });

  it('plan_selected records the highlighted plan', () => {
    trackPlanSelected({ packageId: 'pro_annual', isAnnual: true });
    expect(capture).toHaveBeenCalledWith(BILLING_EVENT.planSelected, {
      package_id: 'pro_annual',
      is_annual: true,
      period: 'annual',
    });
  });

  it('paywall_dismissed carries the walled feature', () => {
    trackPaywallDismissed('opening');
    expect(capture).toHaveBeenCalledWith(BILLING_EVENT.paywallDismissed, {
      walled_feature: 'opening',
    });
  });
});

describe('billingAnalytics — purchase split (trial vs paid)', () => {
  it('TRIAL period fires trial_started with NO revenue', () => {
    trackPurchaseSuccess(CTX, 'TRIAL');
    expect(capture).toHaveBeenCalledTimes(1);
    const [name, props] = capture.mock.calls[0];
    expect(name).toBe(BILLING_EVENT.trialStarted);
    expect(props).not.toHaveProperty('revenue');
    expect(props).not.toHaveProperty('$revenue');
  });

  it('INTRO period is also treated as a trial start', () => {
    trackPurchaseSuccess(CTX, 'INTRO');
    expect(capture.mock.calls[0][0]).toBe(BILLING_EVENT.trialStarted);
  });

  it('NORMAL period fires purchase_completed carrying revenue', () => {
    trackPurchaseSuccess(CTX, 'NORMAL');
    expect(capture).toHaveBeenCalledWith(
      BILLING_EVENT.purchaseCompleted,
      expect.objectContaining({ revenue: 7.99, $revenue: 7.99, price: 7.99 }),
    );
  });

  it('unknown period defaults to a paid conversion (never silently drops)', () => {
    trackPurchaseSuccess(CTX, 'SOMETHING_NEW');
    expect(capture.mock.calls[0][0]).toBe(BILLING_EVENT.purchaseCompleted);
  });
});

describe('billingAnalytics — failure + restore', () => {
  it('purchase_failed truncates the error message', () => {
    trackPurchaseFailed('pro_monthly', 'x'.repeat(500));
    const props = capture.mock.calls[0][1] as { error_message: string };
    expect(capture.mock.calls[0][0]).toBe(BILLING_EVENT.purchaseFailed);
    expect(props.error_message.length).toBe(200);
  });

  it('purchase_failed carries the RevenueCat error detail when present', () => {
    trackPurchaseFailed('pro_annual', 'There was a problem with the App Store.', {
      code: '2',
      readableErrorCode: 'STORE_PROBLEM_ERROR',
      underlyingErrorMessage: 'y'.repeat(500),
    });
    const props = capture.mock.calls[0][1] as Record<string, unknown>;
    expect(props.error_code).toBe('2');
    expect(props.readable_error_code).toBe('STORE_PROBLEM_ERROR');
    expect((props.underlying_error_message as string).length).toBe(300);
  });

  it('purchase_failed omits detail keys entirely when no detail is given', () => {
    trackPurchaseFailed('pro_monthly', 'purchase failed');
    const props = capture.mock.calls[0][1] as Record<string, unknown>;
    expect('error_code' in props).toBe(false);
    expect('readable_error_code' in props).toBe(false);
    expect('underlying_error_message' in props).toBe(false);
  });

  it('purchase_cancelled names the package', () => {
    trackPurchaseCancelled('pro_annual');
    expect(capture).toHaveBeenCalledWith(BILLING_EVENT.purchaseCancelled, {
      package_id: 'pro_annual',
    });
  });

  it('restore_completed reports whether a sub was found', () => {
    trackRestore(true);
    expect(capture).toHaveBeenCalledWith(BILLING_EVENT.restoreCompleted, { became_pro: true });
  });

  it('restore_failed carries the error', () => {
    trackRestoreFailed('network down');
    expect(capture).toHaveBeenCalledWith(BILLING_EVENT.restoreFailed, {
      error_message: 'network down',
    });
  });
});

describe('billingAnalytics — person properties', () => {
  it('a Pro subscriber sets is_pro + status + plan + expiry', () => {
    syncSubscriptionPerson({
      isPro: true,
      source: 'subscription',
      plan: 'annual',
      expiresAt: Date.UTC(2027, 0, 1),
    });
    expect(setPerson).toHaveBeenCalledWith(
      expect.objectContaining({
        is_pro: true,
        subscription_status: 'subscription',
        plan: 'annual',
        subscription_expires_at: new Date(Date.UTC(2027, 0, 1)).toISOString(),
      }),
    );
  });

  it('a free user resolves subscription_status to "free"', () => {
    syncSubscriptionPerson({ isPro: false, source: 'none', expiresAt: null });
    const props = setPerson.mock.calls[0][0] as Record<string, unknown>;
    expect(props.is_pro).toBe(false);
    expect(props.subscription_status).toBe('free');
    expect(props.subscription_expires_at).toBeNull();
    expect(props).not.toHaveProperty('plan');
  });
});

describe('billingAnalytics — free-tier upgrade pressure', () => {
  it('free_puzzle_limit_reached fires bare', () => {
    trackFreePuzzleLimitReached();
    expect(capture).toHaveBeenCalledWith(BILLING_EVENT.freePuzzleLimitReached);
  });

  it('free_opening_claimed carries the opening id', () => {
    trackFreeOpeningClaimed('caro-kann');
    expect(capture).toHaveBeenCalledWith(BILLING_EVENT.freeOpeningClaimed, {
      opening_id: 'caro-kann',
    });
  });

  it('second_opening_walled carries both openings', () => {
    trackSecondOpeningWalled('vienna-game', 'caro-kann');
    expect(capture).toHaveBeenCalledWith(BILLING_EVENT.secondOpeningWalled, {
      attempted_opening_id: 'vienna-game',
      claimed_opening_id: 'caro-kann',
    });
  });
});
