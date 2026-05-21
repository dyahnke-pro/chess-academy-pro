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

function renderSection(
  openingId: string,
  onSelect = vi.fn(),
  studentColor: 'white' | 'black' = 'white',
): ReturnType<typeof render> {
  return render(
    <MotionConfig transition={{ duration: 0 }}>
      <ModelGamesSection openingId={openingId} studentColor={studentColor} onSelectGame={onSelect} />
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
      buildModelGame({ id: 'g1', white: 'Morphy', black: 'Duke', event: 'Paris Opera', year: 1858, result: '1-0' }),
      buildModelGame({ id: 'g2', white: 'Fischer', black: 'Spassky', event: 'WCh', year: 1972, result: '1-0' }),
    ];
    mockGetGames.mockResolvedValue(games);
    renderSection('italian-game', vi.fn(), 'white');

    await waitFor(() => {
      expect(screen.getByTestId('model-games-section')).toBeInTheDocument();
    });

    expect(screen.getByText(/Morphy vs Duke/)).toBeInTheDocument();
    expect(screen.getByText(/Fischer vs Spassky/)).toBeInTheDocument();
    expect(screen.getByText(/Model Games \(2\)/)).toBeInTheDocument();
  });

  it('hides games where the student\'s side lost (never showcase the opening losing)', async () => {
    // A Black-oriented opening (e.g. Pirc) must NOT show a White-win game.
    const games = [
      buildModelGame({ id: 'wwin', white: 'Kasparov', black: 'Topalov', result: '1-0' }),
      buildModelGame({ id: 'bwin', white: 'X', black: 'Y', result: '0-1' }),
    ];
    mockGetGames.mockResolvedValue(games);
    renderSection('pirc-defence', vi.fn(), 'black');

    await waitFor(() => {
      expect(screen.getByTestId('model-games-section')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('model-game-card-wwin')).not.toBeInTheDocument();
    expect(screen.getByTestId('model-game-card-bwin')).toBeInTheDocument();
    expect(screen.getByText(/Model Games \(1\)/)).toBeInTheDocument();
  });

  it('hides ALL games when every one is a loss for the student (section empty)', async () => {
    mockGetGames.mockResolvedValue([
      buildModelGame({ id: 'wwin', result: '1-0' }),
    ]);
    renderSection('pirc-defence', vi.fn(), 'black');
    await waitFor(() => {
      expect(screen.getByTestId('model-games-empty')).toBeInTheDocument();
    });
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
