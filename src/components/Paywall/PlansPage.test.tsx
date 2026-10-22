import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PlansPage } from './PlansPage';
import { useEntitlementStore } from '../../stores/entitlementStore';

vi.mock('../../services/billingService', () => ({
  getBillingPackages: async () => [],
  purchasePackage: async () => false,
  restorePurchases: async () => false,
  isBillingConfigured: () => true,
  clearBillingError: () => {},
}));

function renderAt(path: string): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/pro" element={<PlansPage />} />
        <Route path="/settings" element={<div data-testid="settings-route" />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PlansPage — the plans, opened on purpose', () => {
  beforeEach(() => useEntitlementStore.getState().reset());

  it('a free user sees the plans with Restore Purchases and no "you used up…" line', () => {
    useEntitlementStore.getState().setEntitlement({ isPro: false, source: 'none' });
    renderAt('/pro');
    expect(screen.getByText(/free plan includes/i)).toBeInTheDocument();
    expect(screen.getByText('Restore Purchases')).toBeInTheDocument();
    expect(screen.queryByText(/used all 20 free puzzles|used up your free coaching|one free masterclass/i)).toBeNull();
  });

  it('a subscriber has nothing to buy and goes back to Settings', () => {
    useEntitlementStore.getState().setEntitlement({ isPro: true, source: 'subscription' });
    renderAt('/pro');
    expect(screen.getByTestId('settings-route')).toBeInTheDocument();
  });
});
