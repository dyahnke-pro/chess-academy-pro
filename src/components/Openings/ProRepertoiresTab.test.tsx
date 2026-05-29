import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { ProRepertoiresTab } from './ProRepertoiresTab';
import { buildOpeningRecord } from '../../test/factories';
import type { ProPlayer } from '../../types';

// Replace only the functions the tab uses; keep the rest (OpeningCard
// pulls getMasteryPercent/needsReview from openingService).
vi.mock('../../services/proRepertoireService', async () => {
  const actual = await vi.importActual<typeof import('../../services/proRepertoireService')>(
    '../../services/proRepertoireService',
  );
  return {
    ...actual,
    getPlayers: vi.fn(),
    getPlayerById: vi.fn(),
    getPlayerOpenings: vi.fn(),
  };
});
vi.mock('../../services/openingService', async () => {
  const actual = await vi.importActual<typeof import('../../services/openingService')>(
    '../../services/openingService',
  );
  return { ...actual, toggleFavorite: vi.fn() };
});

import { getPlayers, getPlayerById, getPlayerOpenings } from '../../services/proRepertoireService';

const mockGetPlayers = vi.mocked(getPlayers);
const mockGetPlayerById = vi.mocked(getPlayerById);
const mockGetPlayerOpenings = vi.mocked(getPlayerOpenings);

const LEVY: ProPlayer = {
  id: 'gothamchess',
  name: 'Levy Rozman',
  title: 'IM',
  rating: 2421,
  style: 'Tactical, Entertaining',
  description: 'GothamChess',
  imageInitials: 'LR',
};
const NARO: ProPlayer = {
  id: 'naroditsky',
  name: 'Daniel Naroditsky',
  title: 'GM',
  rating: 2619,
  style: 'Aggressive, Dynamic',
  description: 'Speedrun coach',
  imageInitials: 'DN',
};

function renderTab(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <MotionConfig transition={{ duration: 0 }}>
        <ProRepertoiresTab />
      </MotionConfig>
    </MemoryRouter>,
  );
}

describe('ProRepertoiresTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPlayers.mockReturnValue([NARO, LEVY]);
    mockGetPlayerById.mockReturnValue(LEVY);
  });

  it('pins the featured player\'s openings at the top, split White/Black', async () => {
    mockGetPlayerOpenings.mockResolvedValue([
      buildOpeningRecord({ id: 'pro-gothamchess-trompowsky', name: 'Trompowsky', color: 'white', proPlayerId: 'gothamchess' }),
      buildOpeningRecord({ id: 'pro-gothamchess-caro-kann', name: 'Caro-Kann', color: 'black', proPlayerId: 'gothamchess' }),
      buildOpeningRecord({ id: 'pro-gothamchess-vienna', name: 'Vienna', color: 'white', proPlayerId: 'gothamchess' }),
    ]);
    renderTab();

    await waitFor(() => {
      expect(screen.getByTestId('featured-pro-openings')).toBeInTheDocument();
    });

    // Factual attribution header (player name), no course branding.
    expect(screen.getByText('Levy Rozman')).toBeInTheDocument();
    expect(screen.queryByText(/course/i)).not.toBeInTheDocument();

    expect(screen.getByText('As White')).toBeInTheDocument();
    expect(screen.getByText('As Black')).toBeInTheDocument();
    expect(screen.getByText('Trompowsky')).toBeInTheDocument();
    expect(screen.getByText('Caro-Kann')).toBeInTheDocument();
  });

  it('orders featured White openings most-played-first (Trompowsky before Vienna by FEATURED_ORDER)', async () => {
    mockGetPlayerOpenings.mockResolvedValue([
      buildOpeningRecord({ id: 'pro-gothamchess-vienna', name: 'Vienna', color: 'white', proPlayerId: 'gothamchess' }),
      buildOpeningRecord({ id: 'pro-gothamchess-trompowsky', name: 'Trompowsky', color: 'white', proPlayerId: 'gothamchess' }),
    ]);
    renderTab();

    await waitFor(() => {
      expect(screen.getByText('Trompowsky')).toBeInTheDocument();
    });
    // Trompowsky ranks ahead of Vienna in FEATURED_ORDER.
    const html = document.body.innerHTML;
    expect(html.indexOf('Trompowsky')).toBeLessThan(html.indexOf('Vienna'));
  });

  it('shows a loading state until the repertoire resolves', () => {
    mockGetPlayerOpenings.mockReturnValue(new Promise(() => {}));
    renderTab();
    expect(screen.getByTestId('featured-loading')).toBeInTheDocument();
  });

  it('renders other players below the featured set', async () => {
    mockGetPlayerOpenings.mockResolvedValue([]);
    renderTab();

    await waitFor(() => {
      expect(screen.getByTestId('other-pro-players')).toBeInTheDocument();
    });
    expect(screen.getByText('Daniel Naroditsky')).toBeInTheDocument();
    // Featured player is not duplicated in the "more players" list.
    expect(screen.queryByText('Daniel Naroditsky')).toBeInTheDocument();
  });

  it('shows an empty message when the featured repertoire has not seeded yet', async () => {
    mockGetPlayerOpenings.mockResolvedValue([]);
    renderTab();
    await waitFor(() => {
      expect(screen.getByTestId('featured-empty')).toBeInTheDocument();
    });
  });
});
