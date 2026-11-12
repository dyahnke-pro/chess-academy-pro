import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

function renderAt(path: string, from?: string): void {
  render(
    <MemoryRouter initialEntries={[from ? { pathname: path, state: { from } } : path]}>
      <Routes>
        <Route path="/pro" element={<PlansPage />} />
        <Route path="/" element={<div data-testid="home-route" />} />
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

describe('PlansPage — "Not now" goes back where it was opened from (2026-11-12)', () => {
  beforeEach(() => useEntitlementStore.getState().reset());

  it('opened from Home, it returns Home', () => {
    useEntitlementStore.getState().setEntitlement({ isPro: false, source: 'none' });
    renderAt('/pro', '/');
    fireEvent.click(screen.getByTestId('paywall-back-free'));
    fireEvent.click(screen.getByTestId('decline-skip'));
    expect(screen.getByTestId('home-route')).toBeInTheDocument();
  });

  it('opened with no origin (Settings), it returns to Settings as before', () => {
    useEntitlementStore.getState().setEntitlement({ isPro: false, source: 'none' });
    renderAt('/pro');
    fireEvent.click(screen.getByTestId('paywall-back-free'));
    fireEvent.click(screen.getByTestId('decline-skip'));
    expect(screen.getByTestId('settings-route')).toBeInTheDocument();
  });
});
