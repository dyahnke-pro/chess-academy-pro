import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionConfig } from 'framer-motion';
import { MiddlegamePlansSection } from './MiddlegamePlansSection';
import { buildMiddlegamePlan } from '../../test/factories';

vi.mock('../../services/middlegamePlanService', () => ({
  getPlansForOpening: vi.fn(),
}));

import { getPlansForOpening } from '../../services/middlegamePlanService';

const mockGetPlans = vi.mocked(getPlansForOpening);

function renderSection(openingId: string, onSelect = vi.fn()): ReturnType<typeof render> {
  return render(
    <MotionConfig transition={{ duration: 0 }}>
      <MiddlegamePlansSection openingId={openingId} onSelectPlan={onSelect} />
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

  it('renders plan cards when plans exist', async () => {
    const plans = [
      buildMiddlegamePlan({ id: 'p1', title: 'Central Expansion', pawnBreaks: [{ move: 'd3-d4', explanation: 'Open the center', fen: 'start' }] }),
      buildMiddlegamePlan({ id: 'p2', title: 'Kingside Attack', pawnBreaks: [{ move: 'f2-f4', explanation: 'Kingside expansion', fen: 'start' }] }),
    ];
    mockGetPlans.mockResolvedValue(plans);
    renderSection('italian-game');

    await waitFor(() => {
      expect(screen.getByTestId('middlegame-plans-section')).toBeInTheDocument();
    });

    expect(screen.getByText('Central Expansion')).toBeInTheDocument();
    expect(screen.getByText('Kingside Attack')).toBeInTheDocument();
    expect(screen.getByText(/Middlegame Plans \(2\)/)).toBeInTheDocument();
    expect(screen.getByText('d3-d4')).toBeInTheDocument();
  });

  it('calls onSelectPlan when a plan card is clicked', async () => {
    const plan = buildMiddlegamePlan({ id: 'p1' });
    mockGetPlans.mockResolvedValue([plan]);
    const onSelect = vi.fn();
    renderSection('italian-game', onSelect);

    await waitFor(() => {
      expect(screen.getByTestId('plan-card-p1')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('plan-card-p1'));
    expect(onSelect).toHaveBeenCalledWith(plan);
  });
});
