import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '../../test/utils';
import { ProRoute } from './ProRoute';
import { useSubscriptionStore } from '../../stores/subscriptionStore';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

describe('ProRoute', () => {
  beforeEach(() => {
    useSubscriptionStore.getState().reset();
  });

  it('renders children for ungated routes', () => {
    render(
      <ProRoute pathname="/openings">
        <div data-testid="page">Openings</div>
      </ProRoute>,
    );

    expect(screen.getByTestId('page')).toBeInTheDocument();
  });

  it('blocks coach route for free users', () => {
    render(
      <ProRoute pathname="/coach">
        <div data-testid="coach">Coach</div>
      </ProRoute>,
    );

    expect(screen.queryByTestId('coach')).not.toBeInTheDocument();
    expect(screen.getByText(/upgrade to pro/i)).toBeInTheDocument();
  });

  it('allows coach route for pro users', () => {
    useSubscriptionStore.getState().setTier('pro');

    render(
      <ProRoute pathname="/coach">
        <div data-testid="coach">Coach</div>
      </ProRoute>,
    );

    expect(screen.getByTestId('coach')).toBeInTheDocument();
  });

  it('blocks weakness route for free users', () => {
    render(
      <ProRoute pathname="/weaknesses">
        <div data-testid="weaknesses">Weaknesses</div>
      </ProRoute>,
    );

    expect(screen.queryByTestId('weaknesses')).not.toBeInTheDocument();
    expect(screen.getByText(/weakness detection/i)).toBeInTheDocument();
  });

  it('allows weakness route for pro users', () => {
    useSubscriptionStore.getState().setTier('pro');

    render(
      <ProRoute pathname="/weaknesses">
        <div data-testid="weaknesses">Weaknesses</div>
      </ProRoute>,
    );

    expect(screen.getByTestId('weaknesses')).toBeInTheDocument();
  });
});
