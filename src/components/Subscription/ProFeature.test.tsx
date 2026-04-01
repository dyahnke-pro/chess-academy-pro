import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '../../test/utils';
import { ProFeature } from './ProFeature';
import { useSubscriptionStore } from '../../stores/subscriptionStore';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

describe('ProFeature', () => {
  beforeEach(() => {
    useSubscriptionStore.getState().reset();
  });

  it('renders children when user is pro', () => {
    useSubscriptionStore.getState().setTier('pro');

    render(
      <ProFeature feature="aiCoach">
        <div data-testid="coach-content">Coach Content</div>
      </ProFeature>,
    );

    expect(screen.getByTestId('coach-content')).toBeInTheDocument();
  });

  it('renders upgrade prompt when user is free', () => {
    render(
      <ProFeature feature="aiCoach">
        <div data-testid="coach-content">Coach Content</div>
      </ProFeature>,
    );

    expect(screen.queryByTestId('coach-content')).not.toBeInTheDocument();
    expect(screen.getByText(/upgrade to pro/i)).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    render(
      <ProFeature feature="aiCoach" fallback={<div>Custom fallback</div>}>
        <div data-testid="coach-content">Coach Content</div>
      </ProFeature>,
    );

    expect(screen.queryByTestId('coach-content')).not.toBeInTheDocument();
    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
  });
});
