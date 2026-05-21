import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionConfig } from 'framer-motion';
import { MiddlegamePlansSection, type MiddlegameAction } from './MiddlegamePlansSection';
import { buildMiddlegamePlan } from '../../test/factories';
import type { MiddlegamePlan } from '../../types';

vi.mock('../../services/middlegamePlanService', () => ({
  getPlansForOpening: vi.fn(),
}));

import { getPlansForOpening } from '../../services/middlegamePlanService';

const mockGetPlans = vi.mocked(getPlansForOpening);

function renderSection(
  openingId: string,
  onAction: (plan: MiddlegamePlan, action: MiddlegameAction) => void = vi.fn(),
): ReturnType<typeof render> {
  return render(
    <MotionConfig transition={{ duration: 0 }}>
      <MiddlegamePlansSection openingId={openingId} boardOrientation="white" onAction={onAction} />
    </MotionConfig>,
  );
}

describe('MiddlegamePlansSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty when no plans exist', async () => {
    mockGetPlans.mockResolvedValue([]);
    renderSection('italian-game');

    await waitFor(() => {
      expect(screen.getByTestId('middlegame-plans-empty')).toBeInTheDocument();
    });
  });

  it('renders a WLPP line per plan', async () => {
    const plans = [
      buildMiddlegamePlan({ id: 'p1', title: 'Central Expansion' }),
      buildMiddlegamePlan({ id: 'p2', title: 'Kingside Attack' }),
    ];
    mockGetPlans.mockResolvedValue(plans);
    renderSection('italian-game');

    await waitFor(() => {
      expect(screen.getByTestId('middlegame-plans-section')).toBeInTheDocument();
    });

    expect(screen.getByText('Central Expansion')).toBeInTheDocument();
    expect(screen.getByText('Kingside Attack')).toBeInTheDocument();
    expect(screen.getByText(/Middlegame Plans \(2\)/)).toBeInTheDocument();
    // Each plan exposes the four WLPP actions.
    for (const action of ['watch', 'learn', 'practice', 'play']) {
      expect(screen.getByTestId(`plan-${action}-p1`)).toBeInTheDocument();
    }
  });

  it('calls onAction with the chosen mode', async () => {
    const plan = buildMiddlegamePlan({ id: 'p1' });
    mockGetPlans.mockResolvedValue([plan]);
    const onAction = vi.fn();
    renderSection('italian-game', onAction);

    await waitFor(() => {
      expect(screen.getByTestId('plan-line-p1')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('plan-learn-p1'));
    expect(onAction).toHaveBeenCalledWith(plan, 'learn');

    await userEvent.click(screen.getByTestId('plan-play-p1'));
    expect(onAction).toHaveBeenCalledWith(plan, 'play');
  });
});
