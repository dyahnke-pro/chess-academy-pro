import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test/utils';
import { OpeningExplorerPage } from './OpeningExplorerPage';

// Capture mock references so we can manipulate them per-test
const mockGetRepertoireOpenings = vi.fn();
const mockSearchOpenings = vi.fn();

const whiteOpening = {
  id: 'vienna-game',
  eco: 'C25',
  name: 'Vienna Game',
  pgn: 'e4 e5 Nc3',
  uci: 'e2e4 e7e5 b1c3',
  fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR b KQkq - 1 2',
  color: 'white' as const,
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
};

const blackOpening = {
  id: 'sicilian-najdorf',
  eco: 'B90',
  name: 'Sicilian Najdorf',
  pgn: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6',
  uci: 'e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6',
  fen: 'rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQ - 0 6',
  color: 'black' as const,
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
};

// Mock the service and data loader
vi.mock('../../services/openingService', () => ({
  getRepertoireOpenings: (...args: unknown[]) => mockGetRepertoireOpenings(...args),
  searchOpenings: (...args: unknown[]) => mockSearchOpenings(...args),
}));

vi.mock('../../services/dataLoader', () => ({
  seedDatabase: vi.fn().mockResolvedValue(undefined),
}));

describe('OpeningExplorerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRepertoireOpenings.mockResolvedValue([whiteOpening, blackOpening]);
    mockSearchOpenings.mockResolvedValue([]);
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

  it('search input renders with correct placeholder', async () => {
    render(<OpeningExplorerPage />);
    await waitFor(() => {
      const searchInput = screen.getByTestId('opening-search');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('type', 'text');
      expect(searchInput).toHaveAttribute(
        'placeholder',
        'Search openings by name or ECO code...',
      );
    });
  });

  it('color filter buttons render with correct labels', async () => {
    render(<OpeningExplorerPage />);
    await waitFor(() => {
      expect(screen.getByTestId('filter-all')).toHaveTextContent('All');
      expect(screen.getByTestId('filter-white')).toHaveTextContent('White');
      expect(screen.getByTestId('filter-black')).toHaveTextContent('Black');
    });
  });

  it('search query calls searchOpenings after debounce', async () => {
    const user = userEvent.setup();
    mockSearchOpenings.mockResolvedValue([whiteOpening]);

    render(<OpeningExplorerPage />);

    await waitFor(() => {
      expect(screen.getByTestId('opening-search')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('opening-search');
    await user.type(searchInput, 'Vienna');

    await waitFor(() => {
      expect(mockSearchOpenings).toHaveBeenCalledWith('Vienna');
    });
  });

  it('search results filter displayed openings', async () => {
    const user = userEvent.setup();
    mockSearchOpenings.mockResolvedValue([whiteOpening]);

    render(<OpeningExplorerPage />);

    await waitFor(() => {
      expect(screen.getByTestId('opening-card-vienna-game')).toBeInTheDocument();
      expect(screen.getByTestId('opening-card-sicilian-najdorf')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('opening-search');
    await user.type(searchInput, 'Vienna');

    await waitFor(() => {
      expect(screen.getByTestId('opening-card-vienna-game')).toBeInTheDocument();
      expect(screen.queryByTestId('opening-card-sicilian-najdorf')).not.toBeInTheDocument();
    });
  });

  it('clicking White filter hides black openings', async () => {
    render(<OpeningExplorerPage />);

    await waitFor(() => {
      expect(screen.getByTestId('opening-card-vienna-game')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('filter-white'));

    await waitFor(() => {
      expect(screen.getByTestId('opening-card-vienna-game')).toBeInTheDocument();
      expect(screen.queryByTestId('opening-card-sicilian-najdorf')).not.toBeInTheDocument();
    });
  });

  it('clicking Black filter hides white openings', async () => {
    render(<OpeningExplorerPage />);

    await waitFor(() => {
      expect(screen.getByTestId('opening-card-sicilian-najdorf')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('filter-black'));

    await waitFor(() => {
      expect(screen.queryByTestId('opening-card-vienna-game')).not.toBeInTheDocument();
      expect(screen.getByTestId('opening-card-sicilian-najdorf')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    render(<OpeningExplorerPage />);
    expect(screen.getByText('Loading openings...')).toBeInTheDocument();
  });

  it('shows "No openings found" when list is empty', async () => {
    mockGetRepertoireOpenings.mockResolvedValue([]);

    render(<OpeningExplorerPage />);

    await waitFor(() => {
      expect(screen.getByText('No openings found.')).toBeInTheDocument();
    });
  });

  it('shows White Repertoire and Black Repertoire section headings', async () => {
    render(<OpeningExplorerPage />);

    await waitFor(() => {
      expect(screen.getByText(/White Repertoire/)).toBeInTheDocument();
      expect(screen.getByText(/Black Repertoire/)).toBeInTheDocument();
    });
  });

  it('displays ECO code and opening name in each card', async () => {
    render(<OpeningExplorerPage />);

    await waitFor(() => {
      expect(screen.getByText('C25')).toBeInTheDocument();
      expect(screen.getByText('Vienna Game')).toBeInTheDocument();
      expect(screen.getByText('B90')).toBeInTheDocument();
      expect(screen.getByText('Sicilian Najdorf')).toBeInTheDocument();
    });
  });

  it('displays style info in opening cards', async () => {
    render(<OpeningExplorerPage />);

    await waitFor(() => {
      expect(screen.getByText('Classical, Flexible')).toBeInTheDocument();
      expect(screen.getByText('Aggressive, Tactical')).toBeInTheDocument();
    });
  });
});
