import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionConfig } from 'framer-motion';
import { EndgamePlansSection } from './EndgamePlansSection';
import { buildMiddlegamePlan } from '../../test/factories';
import type { MiddlegamePlan } from '../../types';
import type { MiddlegameAction } from './MiddlegamePlansSection';

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
      <EndgamePlansSection openingId={openingId} boardOrientation="white" onAction={onAction} />
    </MotionConfig>,
  );
}

describe('EndgamePlansSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('self-hides when no -endgame plans exist (per playbook §4 — empty > generic)', async () => {
    mockGetPlans.mockResolvedValue([
      buildMiddlegamePlan({ id: 'mp-vienna-classical-plan' }),
    ]);
    renderSection('vienna-game');

    await waitFor(() => {
      expect(screen.getByTestId('endgame-plans-empty')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('endgame-plans-section')).not.toBeInTheDocument();
  });

  it('renders only plans whose id ends in -endgame', async () => {
    const plans = [
      buildMiddlegamePlan({ id: 'mp-ruylopez-mainline', title: 'Mainline Plan' }),
      buildMiddlegamePlan({ id: 'mp-ruylopez-exchange-endgame', title: 'Fischer Endgame' }),
      buildMiddlegamePlan({ id: 'mp-ruylopez-berlin-endgame', title: 'Berlin Wall Endgame' }),
    ];
    mockGetPlans.mockResolvedValue(plans);
    renderSection('ruy-lopez');

    await waitFor(() => {
      expect(screen.getByTestId('endgame-plans-section')).toBeInTheDocument();
    });

    expect(screen.getByText('Fischer Endgame')).toBeInTheDocument();
    expect(screen.getByText('Berlin Wall Endgame')).toBeInTheDocument();
    expect(screen.queryByText('Mainline Plan')).not.toBeInTheDocument();
    expect(screen.getByText(/Endgame Plans \(2\)/)).toBeInTheDocument();
  });

  it('exposes the WLPP action row for each endgame plan', async () => {
    const plan = buildMiddlegamePlan({ id: 'mp-ruylopez-exchange-endgame', title: 'Fischer Endgame' });
    mockGetPlans.mockResolvedValue([plan]);
    renderSection('ruy-lopez');

    await waitFor(() => {
      expect(screen.getByTestId('endgame-plans-section')).toBeInTheDocument();
    });

    for (const action of ['watch', 'learn', 'practice', 'play']) {
      expect(screen.getByTestId(`plan-${action}-mp-ruylopez-exchange-endgame`)).toBeInTheDocument();
    }
  });

  it('calls onAction with the chosen mode', async () => {
    const plan = buildMiddlegamePlan({ id: 'mp-ruylopez-exchange-endgame' });
    mockGetPlans.mockResolvedValue([plan]);
    const onAction = vi.fn();
    renderSection('ruy-lopez', onAction);

    await waitFor(() => {
      expect(screen.getByTestId('plan-line-mp-ruylopez-exchange-endgame')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('plan-watch-mp-ruylopez-exchange-endgame'));
    expect(onAction).toHaveBeenCalledWith(plan, 'watch');
  });
});
