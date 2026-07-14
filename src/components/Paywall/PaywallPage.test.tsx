import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PaywallPage } from './PaywallPage';

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

function renderPaywall(feature?: Parameters<typeof PaywallPage>[0] extends { feature?: infer F } ? F : never) {
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
});
