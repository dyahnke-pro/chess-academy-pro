import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '../../test/utils';
import { OpeningExplorerPage } from './OpeningExplorerPage';

// Mock the service and data loader
vi.mock('../../services/openingService', () => ({
  getRepertoireOpenings: vi.fn().mockResolvedValue([
    {
      id: 'vienna-game',
      eco: 'C25',
      name: 'Vienna Game',
      pgn: 'e4 e5 Nc3',
      color: 'white',
      style: 'Classical, Flexible',
      isRepertoire: true,
      overview: 'Flexible opening.',
      keyIdeas: ['Central control'],
      traps: [],
      warnings: [],
      variations: [],
      drillAccuracy: 0.75,
      drillAttempts: 10,
      lastStudied: null,
      woodpeckerReps: 0,
      woodpeckerSpeed: null,
      woodpeckerLastDate: null,
    },
    {
      id: 'sicilian-najdorf',
      eco: 'B90',
      name: 'Sicilian Najdorf',
      pgn: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6',
      color: 'black',
      style: 'Aggressive, Tactical',
      isRepertoire: true,
      overview: 'Sharp defence.',
      keyIdeas: [],
      traps: [],
      warnings: [],
      variations: [],
      drillAccuracy: 0,
      drillAttempts: 0,
      lastStudied: null,
      woodpeckerReps: 0,
      woodpeckerSpeed: null,
      woodpeckerLastDate: null,
    },
  ]),
  searchOpenings: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../services/dataLoader', () => ({
  seedDatabase: vi.fn().mockResolvedValue(undefined),
}));

describe('OpeningExplorerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', async () => {
    render(<OpeningExplorerPage />);
    await waitFor(() => {
      expect(screen.getByText('Opening Explorer')).toBeInTheDocument();
    });
  });

  it('renders opening cards after loading', async () => {
    render(<OpeningExplorerPage />);
    await waitFor(() => {
      expect(screen.getByTestId('opening-card-vienna-game')).toBeInTheDocument();
      expect(screen.getByTestId('opening-card-sicilian-najdorf')).toBeInTheDocument();
    });
  });

  it('shows search input', async () => {
    render(<OpeningExplorerPage />);
    await waitFor(() => {
      expect(screen.getByTestId('opening-search')).toBeInTheDocument();
    });
  });

  it('shows color filter buttons', async () => {
    render(<OpeningExplorerPage />);
    await waitFor(() => {
      expect(screen.getByTestId('filter-all')).toBeInTheDocument();
      expect(screen.getByTestId('filter-white')).toBeInTheDocument();
      expect(screen.getByTestId('filter-black')).toBeInTheDocument();
    });
  });

  it('shows accuracy for openings that have been drilled', async () => {
    render(<OpeningExplorerPage />);
    await waitFor(() => {
      expect(screen.getByText('75%')).toBeInTheDocument();
    });
  });

  it('shows opening count', async () => {
    render(<OpeningExplorerPage />);
    await waitFor(() => {
      expect(screen.getByText('2 openings')).toBeInTheDocument();
    });
  });
});
