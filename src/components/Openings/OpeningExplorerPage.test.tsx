import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test/utils';
import { OpeningExplorerPage } from './OpeningExplorerPage';

// Capture mock references
const mockGetRepertoireOpenings = vi.fn();
const mockSearchOpenings = vi.fn();
const mockGetOpeningsByEcoLetter = vi.fn();

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
  lastStudied: new Date().toISOString(),
  woodpeckerReps: 3,
  woodpeckerSpeed: 25,
  woodpeckerLastDate: '2026-03-01',
  isFavorite: false,
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
  drillAccuracy: 0.4,
  drillAttempts: 5,
  lastStudied: null,
  woodpeckerReps: 0,
  woodpeckerSpeed: null,
  woodpeckerLastDate: null,
  isFavorite: false,
};

const ecoOpening = {
  id: 'a00-amar-opening',
  eco: 'A00',
  name: 'Amar Opening',
  pgn: 'Nh3',
  uci: 'g1h3',
  fen: 'rnbqkbnr/pppppppp/8/8/8/7N/PPPPPPPP/RNBQKB1R b KQkq - 1 1',
  color: 'white' as const,
  style: '',
  isRepertoire: false,
  overview: null,
  keyIdeas: null,
  traps: null,
  warnings: null,
  variations: null,
  drillAccuracy: 0,
  drillAttempts: 0,
  lastStudied: null,
  woodpeckerReps: 0,
  woodpeckerSpeed: null,
  woodpeckerLastDate: null,
  isFavorite: false,
};

vi.mock('../../services/openingService', () => ({
  getRepertoireOpenings: (...args: unknown[]): unknown => mockGetRepertoireOpenings(...args),
  searchOpenings: (...args: unknown[]): unknown => mockSearchOpenings(...args),
  getOpeningsByEcoLetter: (...args: unknown[]): unknown => mockGetOpeningsByEcoLetter(...args),
  toggleFavorite: vi.fn().mockResolvedValue(true),
  getMasteryPercent: (o: typeof whiteOpening) => Math.round(o.drillAccuracy * 100),
  needsReview: (o: typeof whiteOpening) => o.drillAttempts > 0 && o.drillAccuracy < 0.7,
}));

vi.mock('../../services/dataLoader', () => ({
  seedDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../services/coachApi', () => ({
  getCoachChatResponse: vi.fn().mockResolvedValue(''),
}));

describe('OpeningExplorerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRepertoireOpenings.mockResolvedValue([whiteOpening, blackOpening]);
    mockSearchOpenings.mockResolvedValue([]);
    mockGetOpeningsByEcoLetter.mockImplementation((letter: string) => {
      if (letter === 'A') return Promise.resolve([ecoOpening]);
      return Promise.resolve([]);
    });
  });

  it('renders the page title', async () => {
    render(<OpeningExplorerPage />);
    await waitFor(() => {
      expect(screen.getByText('Openings')).toBeInTheDocument();
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
      expect(screen.getByTestId('smart-search-input')).toBeInTheDocument();
    });
  });

  it('shows mastery ring with percentage on drilled openings', async () => {
    render(<OpeningExplorerPage />);
    await waitFor(() => {
      const percents = screen.getAllByTestId('mastery-percent');
      const values = percents.map((el) => el.textContent);
      expect(values).toContain('75');
    });
  });

  it('shows needs-review indicator for weak openings', async () => {
    render(<OpeningExplorerPage />);
    await waitFor(() => {
      expect(screen.getByTestId('needs-review')).toBeInTheDocument();
    });
  });

  it('shows woodpecker reps on card when reps > 0', async () => {
    render(<OpeningExplorerPage />);
    await waitFor(() => {
      expect(screen.getByText('3 reps')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    render(<OpeningExplorerPage />);
    expect(screen.getByText('Loading openings...')).toBeInTheDocument();
  });

  it('shows "No openings found" when repertoire is empty', async () => {
    mockGetRepertoireOpenings.mockResolvedValue([]);
    render(<OpeningExplorerPage />);
    await waitFor(() => {
      expect(screen.getByText('No openings found.')).toBeInTheDocument();
    });
  });

  it('shows My White Openings and My Black Openings section headings', async () => {
    render(<OpeningExplorerPage />);
    await waitFor(() => {
      expect(screen.getByText('My White Openings')).toBeInTheDocument();
      expect(screen.getByText('My Black Openings')).toBeInTheDocument();
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

  it('displays style tag in opening cards', async () => {
    render(<OpeningExplorerPage />);
    await waitFor(() => {
      expect(screen.getByText('Classical, Flexible')).toBeInTheDocument();
      expect(screen.getByText('Aggressive, Tactical')).toBeInTheDocument();
    });
  });

  it('search query calls searchOpenings after debounce', async () => {
    const user = userEvent.setup();
    mockSearchOpenings.mockResolvedValue([whiteOpening]);

    render(<OpeningExplorerPage />);
    await waitFor(() => {
      expect(screen.getByTestId('smart-search-input')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('smart-search-input');
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
    });

    const searchInput = screen.getByTestId('smart-search-input');
    await user.type(searchInput, 'Vienna');

    await waitFor(() => {
      expect(screen.getByTestId('opening-card-vienna-game')).toBeInTheDocument();
      expect(screen.queryByTestId('opening-card-sicilian-najdorf')).not.toBeInTheDocument();
    });
  });

  it('displays last studied date on card', async () => {
    render(<OpeningExplorerPage />);
    await waitFor(() => {
      expect(screen.getByText('Today')).toBeInTheDocument();
    });
  });

  it('shows "Not studied" when lastStudied is null', async () => {
    render(<OpeningExplorerPage />);
    await waitFor(() => {
      expect(screen.getByText('Not studied')).toBeInTheDocument();
    });
  });

  // ─── Favorites section tests ────────────────────────────────────────────────

  it('shows Favorites section when a repertoire opening is favorited', async () => {
    mockGetRepertoireOpenings.mockResolvedValue([
      { ...whiteOpening, isFavorite: true },
      blackOpening,
    ]);
    render(<OpeningExplorerPage />);
    await waitFor(() => {
      expect(screen.getByText('Favorites')).toBeInTheDocument();
      expect(screen.getByTestId('opening-card-vienna-game')).toBeInTheDocument();
    });
  });

  it('does not show favorited opening under its color section', async () => {
    mockGetRepertoireOpenings.mockResolvedValue([
      { ...whiteOpening, isFavorite: true },
      blackOpening,
    ]);
    render(<OpeningExplorerPage />);
    await waitFor(() => {
      expect(screen.getByText('Favorites')).toBeInTheDocument();
      // White section should not appear since the only white opening is favorited
      expect(screen.queryByText('My White Openings')).not.toBeInTheDocument();
      // Black section still appears
      expect(screen.getByText('My Black Openings')).toBeInTheDocument();
    });
  });

  it('does not show Favorites section when no openings are favorited', async () => {
    render(<OpeningExplorerPage />);
    await waitFor(() => {
      expect(screen.getByText('My White Openings')).toBeInTheDocument();
      expect(screen.queryByText('Favorites')).not.toBeInTheDocument();
    });
  });

  // ─── Tab toggle tests ──────────────────────────────────────────────────────

  it('shows tab toggle with "My Repertoire" and "All Openings"', async () => {
    render(<OpeningExplorerPage />);
    await waitFor(() => {
      expect(screen.getByTestId('tab-repertoire')).toBeInTheDocument();
      expect(screen.getByTestId('tab-all')).toBeInTheDocument();
    });
  });

  it('defaults to Repertoire tab', async () => {
    render(<OpeningExplorerPage />);
    await waitFor(() => {
      expect(screen.getByText('My White Openings')).toBeInTheDocument();
    });
  });

  it('switches to All Openings tab and shows ECO groups', async () => {
    const user = userEvent.setup();
    render(<OpeningExplorerPage />);

    await waitFor(() => {
      expect(screen.getByTestId('tab-all')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('tab-all'));

    await waitFor(() => {
      expect(screen.getByTestId('eco-group-A')).toBeInTheDocument();
      expect(screen.getByText('Flank Openings')).toBeInTheDocument();
    });
  });

  it('ECO group toggle expands to show openings', async () => {
    const user = userEvent.setup();
    render(<OpeningExplorerPage />);

    await waitFor(() => {
      expect(screen.getByTestId('tab-all')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('tab-all'));

    await waitFor(() => {
      expect(screen.getByTestId('eco-toggle-A')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('eco-toggle-A'));

    await waitFor(() => {
      expect(screen.getByText('Amar Opening')).toBeInTheDocument();
    });
  });
});
