import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SubscriptionPanel, subscriptionStatusLine } from './SubscriptionPanel';
import { useEntitlementStore } from '../../stores/entitlementStore';

const billing = vi.hoisted(() => ({
  configured: true,
  restore: vi.fn<() => Promise<boolean>>(),
}));

vi.mock('../../services/billingService', () => ({
  isBillingConfigured: () => billing.configured,
  restorePurchases: () => billing.restore(),
  clearBillingError: () => {},
}));

const DAY = 24 * 60 * 60 * 1000;

function renderPanel(): void {
  render(
    <MemoryRouter initialEntries={['/settings']}>
      <Routes>
        <Route path="/settings" element={<SubscriptionPanel />} />
        <Route path="/pro" element={<div data-testid="plans-route" />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('subscriptionStatusLine', () => {
  const now = Date.UTC(2026, 9, 22);
  it('says what the plan is, per source', () => {
    expect(subscriptionStatusLine('none', null, now)).toBe('Free plan');
    expect(subscriptionStatusLine('subscription', now + 30 * DAY, now)).toBe('Pro — subscribed');
    expect(subscriptionStatusLine('promo', null, now)).toBe('Pro — complimentary access');
    expect(subscriptionStatusLine('trial', now + 3 * DAY, now)).toBe('Pro — free trial, 3 days left');
    expect(subscriptionStatusLine('trial', now + DAY, now)).toBe('Pro — free trial, 1 day left');
    expect(subscriptionStatusLine('trial', null, now)).toBe('Pro — free trial');
  });
  it('has nothing to say where billing is not configured', () => {
    expect(subscriptionStatusLine('unconfigured', null, now)).toBeNull();
  });
});

describe('SubscriptionPanel', () => {
  beforeEach(() => {
    billing.configured = true;
    billing.restore.mockReset();
    useEntitlementStore.getState().reset();
  });

  it('renders nothing where billing is not configured (the free web app)', () => {
    billing.configured = false;
    useEntitlementStore.getState().setEntitlement({ isPro: true, source: 'unconfigured' });
    renderPanel();
    expect(screen.queryByTestId('subscription-panel')).toBeNull();
  });

  it('shows a loading line while the plan resolves — never a wrong status', () => {
    renderPanel();
    expect(screen.getByTestId('subscription-status-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('subscription-status')).toBeNull();
  });

  it('a free user sees "Free plan", a way to the plans, and Restore Purchases', () => {
    useEntitlementStore.getState().setEntitlement({ isPro: false, source: 'none' });
    renderPanel();
    expect(screen.getByTestId('subscription-status')).toHaveTextContent('Free plan');
    expect(screen.queryByTestId('subscription-manage-btn')).toBeNull();
    expect(screen.getByTestId('subscription-restore-btn')).toHaveTextContent('Restore Purchases');
    fireEvent.click(screen.getByTestId('subscription-see-plans-btn'));
    expect(screen.getByTestId('plans-route')).toBeInTheDocument();
  });

  it('a subscriber sees their plan and Manage subscription, never See plans', () => {
    useEntitlementStore.getState().setEntitlement({ isPro: true, source: 'subscription', expiresAt: Date.now() + 30 * DAY });
    renderPanel();
    expect(screen.getByTestId('subscription-status')).toHaveTextContent('Pro — subscribed');
    expect(screen.queryByTestId('subscription-see-plans-btn')).toBeNull();
    expect(screen.getByTestId('subscription-manage-btn')).toHaveAttribute('href', 'https://apps.apple.com/account/subscriptions');
  });

  it('Restore Purchases runs the store restore and says what it found', async () => {
    useEntitlementStore.getState().setEntitlement({ isPro: false, source: 'none' });
    billing.restore.mockResolvedValueOnce(false);
    renderPanel();
    fireEvent.click(screen.getByTestId('subscription-restore-btn'));
    await waitFor(() => expect(screen.getByTestId('subscription-notice')).toHaveTextContent('No purchases found'));
    expect(billing.restore).toHaveBeenCalledTimes(1);

    billing.restore.mockResolvedValueOnce(true);
    fireEvent.click(screen.getByTestId('subscription-restore-btn'));
    await waitFor(() => expect(screen.getByTestId('subscription-notice')).toHaveTextContent('Purchases restored.'));
  });

  it('a store error shows a calm line and keeps Restore available', () => {
    useEntitlementStore.getState().setEntitlement({ isPro: false, source: 'none' });
    useEntitlementStore.getState().setError('network down');
    renderPanel();
    expect(screen.getByTestId('subscription-error')).toBeInTheDocument();
    expect(screen.getByTestId('subscription-restore-btn')).not.toBeDisabled();
  });
});
