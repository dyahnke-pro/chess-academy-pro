import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionConfig } from 'framer-motion';
import { ModelGamesSection } from './ModelGamesSection';
import { buildModelGame } from '../../test/factories';

vi.mock('../../services/modelGameService', () => ({
  getModelGamesForOpening: vi.fn(),
}));

import { getModelGamesForOpening } from '../../services/modelGameService';

const mockGetGames = vi.mocked(getModelGamesForOpening);

function renderSection(openingId: string, onSelect = vi.fn()): ReturnType<typeof render> {
  return render(
    <MotionConfig transition={{ duration: 0 }}>
      <ModelGamesSection openingId={openingId} onSelectGame={onSelect} />
    </MotionConfig>,
  );
}

describe('ModelGamesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty when no games exist', async () => {
    mockGetGames.mockResolvedValue([]);
    renderSection('italian-game');

    await waitFor(() => {
      expect(screen.getByTestId('model-games-empty')).toBeInTheDocument();
    });
  });

  it('renders game cards when games exist', async () => {
    const games = [
      buildModelGame({ id: 'g1', white: 'Morphy', black: 'Duke', event: 'Paris Opera', year: 1858 }),
      buildModelGame({ id: 'g2', white: 'Fischer', black: 'Spassky', event: 'WCh', year: 1972 }),
    ];
    mockGetGames.mockResolvedValue(games);
    renderSection('italian-game');

    await waitFor(() => {
      expect(screen.getByTestId('model-games-section')).toBeInTheDocument();
    });

    expect(screen.getByText(/Morphy vs Duke/)).toBeInTheDocument();
    expect(screen.getByText(/Fischer vs Spassky/)).toBeInTheDocument();
    expect(screen.getByText(/Model Games \(2\)/)).toBeInTheDocument();
  });

  it('calls onSelectGame when a game card is clicked', async () => {
    const game = buildModelGame({ id: 'g1' });
    mockGetGames.mockResolvedValue([game]);
    const onSelect = vi.fn();
    renderSection('italian-game', onSelect);

    await waitFor(() => {
      expect(screen.getByTestId('model-game-card-g1')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('model-game-card-g1'));
    expect(onSelect).toHaveBeenCalledWith(game);
  });
});
