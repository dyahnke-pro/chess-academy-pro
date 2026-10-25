import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PaywallPage } from './PaywallPage';
import type { ComponentProps } from 'react';

vi.mock('../../hooks/useEntitlement', () => ({
  useEntitlement: () => ({ isResolving: false }),
}));
// Billing stays keyless in tests → getBillingPackages resolves [] with no SDK.
const billing = vi.hoisted(() => ({
  getOpeningOffer: vi.fn(async (_id: string): Promise<unknown> => null),
  purchaseOpening: vi.fn(async (_offer: unknown): Promise<boolean> => false),
}));
vi.mock('../../services/billingService', () => ({
  getBillingPackages: async () => [],
  purchasePackage: async () => false,
  restorePurchases: async () => false,
  isBillingConfigured: () => false,
  clearBillingError: () => {},
  getOpeningOffer: billing.getOpeningOffer,
  purchaseOpening: billing.purchaseOpening,
}));

beforeEach(() => {
  billing.getOpeningOffer.mockReset().mockResolvedValue(null);
  billing.purchaseOpening.mockReset().mockResolvedValue(false);
});

type Props = ComponentProps<typeof PaywallPage>;

function renderPaywall(feature?: Exclude<NonNullable<Props>['feature'], 'opening'>) {
  return render(
    <MemoryRouter>
      <PaywallPage feature={feature} />
    </MemoryRouter>,
  );
}

function renderOpeningWall() {
  return render(
    <MemoryRouter>
      <PaywallPage feature="opening" opening={{ id: 'caro-kann', name: 'Caro-Kann Defense' }} />
    </MemoryRouter>,
  );
}

const OFFER = {
  openingId: 'caro-kann',
  productId: 'opening.caro_kann',
  priceString: '$0.99',
  priceAmount: 0.99,
  currency: 'USD',
  title: 'Caro-Kann Defense',
};

describe('PaywallPage — one opening, à la carte (David 2026-10-25)', () => {
  it('leads with "Unlock for <store price>" for the opening it stands in front of', async () => {
    billing.getOpeningOffer.mockResolvedValue(OFFER);
    renderOpeningWall();
    expect(await screen.findByTestId('opening-offer-buy')).toHaveTextContent('Unlock for $0.99');
    expect(screen.getByText('Caro-Kann Defense')).toBeTruthy();
    expect(screen.getByText(/yours to keep/i)).toBeTruthy();
    expect(billing.getOpeningOffer).toHaveBeenCalledWith('caro-kann');
  });

  it('buys exactly that opening when tapped, and says so calmly when it does not complete', async () => {
    billing.getOpeningOffer.mockResolvedValue(OFFER);
    renderOpeningWall();
    fireEvent.click(await screen.findByTestId('opening-offer-buy'));
    await waitFor(() => expect(billing.purchaseOpening).toHaveBeenCalledWith(OFFER));
    expect(await screen.findByText(/No charge was made/i)).toBeTruthy();
  });

  it('shows no offer when the product is not for sale here — the plans stand as before', async () => {
    renderOpeningWall();
    await waitFor(() => expect(billing.getOpeningOffer).toHaveBeenCalled());
    expect(screen.queryByTestId('opening-offer')).toBeNull();
    expect(screen.getByText(/used your free opening/i)).toBeTruthy();
  });

  it('never asks for an offer on a wall that is not an opening', () => {
    renderPaywall('puzzles');
    expect(billing.getOpeningOffer).not.toHaveBeenCalled();
  });
});

describe('PaywallPage — contextual copy', () => {
  it('shows the puzzles prompt for feature="puzzles"', () => {
    renderPaywall('puzzles');
    expect(screen.getByText(/used all 20 free puzzles/i)).toBeTruthy();
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
