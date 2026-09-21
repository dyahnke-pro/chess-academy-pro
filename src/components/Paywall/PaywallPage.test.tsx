import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PaywallPage, type PaywallFeature } from './PaywallPage';

vi.mock('../../hooks/useEntitlement', () => ({
  useEntitlement: () => ({ isResolving: false }),
}));
// Billing stays keyless in tests → getBillingPackages resolves [] with no SDK.
vi.mock('../../services/billingService', () => ({
  getBillingPackages: async () => [],
  purchasePackage: async () => false,
  restorePurchases: async () => false,
  isBillingConfigured: () => false,
  clearBillingError: () => {},
}));

// Name the exported union rather than inferring it out of `Parameters<>`: the
// component's props object has a DEFAULT, so `Parameters<typeof PaywallPage>[0]`
// includes `undefined`, the conditional's `extends` fails on that member, and
// the whole thing collapsed to `never` — so every call below was passing a
// string to a parameter typed `undefined`.
function renderPaywall(feature?: PaywallFeature) {
  return render(
    <MemoryRouter>
      <PaywallPage feature={feature} />
    </MemoryRouter>,
  );
}

describe('PaywallPage — contextual copy', () => {
  it('shows the puzzles prompt for feature="puzzles"', () => {
    renderPaywall('puzzles');
    expect(screen.getByText(/used all 20 free puzzles/i)).toBeTruthy();
  });
  it('shows the opening prompt for feature="opening"', () => {
    renderPaywall('opening');
    expect(screen.getByText(/one free masterclass/i)).toBeTruthy();
  });
  it('shows the kid prompt for feature="kid"', () => {
    renderPaywall('kid');
    expect(screen.getByText(/free week of Kids mode/i)).toBeTruthy();
  });
  it('shows no context banner for feature="app" and always offers a way back', () => {
    renderPaywall('app');
    // No feature prompt text, but the back-to-free link is always present.
    expect(screen.queryByText(/used all 20 free puzzles/i)).toBeNull();
    expect(screen.getByTestId('paywall-back-free')).toBeTruthy();
  });
  it('describes the free plan at the top', () => {
    renderPaywall('app');
    expect(screen.getByText(/free plan includes/i)).toBeTruthy();
    expect(screen.getByText(/20 free tactics puzzles/i)).toBeTruthy();
    expect(screen.getByText(/Kids mode free for a week/i)).toBeTruthy();
  });
});
