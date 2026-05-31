import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { ProRepertoiresTab } from './ProRepertoiresTab';
import type { ProPlayer } from '../../types';

// Replace only getPlayers; ProPlayerCard pulls nothing else from the service.
vi.mock('../../services/proRepertoireService', async () => {
  const actual = await vi.importActual<typeof import('../../services/proRepertoireService')>(
    '../../services/proRepertoireService',
  );
  return { ...actual, getPlayers: vi.fn() };
});

import { getPlayers } from '../../services/proRepertoireService';

const mockGetPlayers = vi.mocked(getPlayers);

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
  });

  it('renders every player as a standard player card — no featured/front-and-center treatment', () => {
    renderTab();
    expect(screen.getByTestId('pro-repertoires-tab')).toBeInTheDocument();
    // Both players surface as cards, equal footing.
    expect(screen.getByText('Daniel Naroditsky')).toBeInTheDocument();
    expect(screen.getByText('Levy Rozman')).toBeInTheDocument();
    // No featured section, no inline As White / As Black expansion.
    expect(screen.queryByTestId('featured-pro-openings')).not.toBeInTheDocument();
    expect(screen.queryByText('As White')).not.toBeInTheDocument();
    expect(screen.queryByText('As Black')).not.toBeInTheDocument();
    expect(screen.queryByText(/more players/i)).not.toBeInTheDocument();
  });

  it('preserves the order getPlayers returns (no special pinning of any player)', () => {
    renderTab();
    const html = document.body.innerHTML;
    // NARO is first in the mocked list → appears before LEVY.
    expect(html.indexOf('Daniel Naroditsky')).toBeLessThan(html.indexOf('Levy Rozman'));
  });

  it('renders no card when there are no players', () => {
    mockGetPlayers.mockReturnValue([]);
    renderTab();
    expect(screen.getByTestId('pro-repertoires-tab')).toBeInTheDocument();
    expect(screen.queryByText('Levy Rozman')).not.toBeInTheDocument();
  });
});
