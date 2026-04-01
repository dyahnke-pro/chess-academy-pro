import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { PaywallPage } from './PaywallPage';
import { useSubscriptionStore } from '../../stores/subscriptionStore';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('PaywallPage', () => {
  beforeEach(() => {
    useSubscriptionStore.getState().reset();
    mockNavigate.mockClear();
  });

  it('renders the upgrade page for free users', () => {
    render(<PaywallPage />);

    expect(screen.getByText('Upgrade to Pro')).toBeInTheDocument();
    expect(screen.getByText('Start Free Trial')).toBeInTheDocument();
  });

  it('renders the annual price by default', () => {
    render(<PaywallPage />);

    expect(screen.getByText('$34.99')).toBeInTheDocument();
    expect(screen.getByText(/per year/)).toBeInTheDocument();
  });

  it('switches to monthly pricing', () => {
    render(<PaywallPage />);

    fireEvent.click(screen.getByText('Monthly'));

    expect(screen.getByText('$4.99')).toBeInTheDocument();
    expect(screen.getByText('per month')).toBeInTheDocument();
  });

  it('shows feature comparison table', () => {
    render(<PaywallPage />);

    expect(screen.getByText('Stockfish analysis')).toBeInTheDocument();
    expect(screen.getByText('AI Chess Coach')).toBeInTheDocument();
    expect(screen.getByText('Weakness detection')).toBeInTheDocument();
    expect(screen.getByText('Voice coaching')).toBeInTheDocument();
    expect(screen.getByText('Cloud sync & backup')).toBeInTheDocument();
  });

  it('shows already-pro state', () => {
    useSubscriptionStore.getState().setTier('pro');

    render(<PaywallPage />);

    expect(screen.getByText("You're a Pro!")).toBeInTheDocument();
    expect(screen.queryByText('Start Free Trial')).not.toBeInTheDocument();
  });

  it('has a restore purchases button', () => {
    render(<PaywallPage />);

    expect(screen.getByText('Restore Purchases')).toBeInTheDocument();
  });

  it('navigates back on back button click', () => {
    render(<PaywallPage />);

    const backButton = screen.getByLabelText('Go back');
    backButton.click();

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
