import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test/utils';
import { OpeningExplorerPage } from './OpeningExplorerPage';

// Capture mock references
const mockGetRepertoireOpenings = vi.fn();
const mockSearchOpenings = vi.fn();
const mockGetOpeningsByEcoLetter = vi.fn();
const mockToggleFavorite = vi.fn();

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
  getMasteryPercent: (o: typeof whiteOpening) => Math.round(o.drillAccuracy * 100),
  needsReview: (o: typeof whiteOpening) => o.drillAttempts > 0 && o.drillAccuracy < 0.7,
  toggleFavorite: (...args: unknown[]): unknown => mockToggleFavorite(...args),
}));

vi.mock('../../services/dataLoader', () => ({
  seedDatabase: vi.fn().mockResolvedValue(undefined),
  // The "All Openings" tab awaits whenFullySeeded() before reading
  // the ECO catalog (the heavy backfill now streams in behind the
  // critical repertoire seed). Resolve immediately in tests.
  whenFullySeeded: vi.fn().mockResolvedValue(undefined),
}));

// Stub the sibling tab components so this page's unit test stays focused on
// its own structure (tab toggle + All Openings ECO catalog) without pulling
// each tab's full data/service tree in.
vi.mock('./MasterclassesTab', () => ({
  MasterclassesTab: () => <div data-testid="masterclasses-tab-stub">Masterclasses</div>,
}));
vi.mock('./ProRepertoiresTab', () => ({
  ProRepertoiresTab: () => <div data-testid="pro-tab-stub">Pro</div>,
}));
vi.mock('./GambitsTab', () => ({
  GambitsTab: () => <div data-testid="gambits-tab-stub">Gambits</div>,
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
    mockToggleFavorite.mockResolvedValue(true);
  });

  it('renders the page title', async () => {
    render(<OpeningExplorerPage />);
    await waitFor(() => {
      expect(screen.getByText('Openings')).toBeInTheDocument();
    });
  });

  it('shows search input', async () => {
    render(<OpeningExplorerPage />);
    await waitFor(() => {
      expect(screen.getByTestId('smart-search-input')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    render(<OpeningExplorerPage />);
    expect(screen.getByText('Loading openings...')).toBeInTheDocument();
  });

  // ─── Tab toggle tests ──────────────────────────────────────────────────────

  // David asked (three times) to remove the generic "Most Common" repertoire
  // tab from the Openings page. The page now opens on Masterclasses and never
  // surfaces a `tab-repertoire` toggle.
  it('does not render a Most Common / repertoire tab', async () => {
    render(<OpeningExplorerPage />);
    await waitFor(() => {
      expect(screen.getByTestId('tab-masterclasses')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('tab-repertoire')).not.toBeInTheDocument();
    expect(screen.queryByText('My White Openings')).not.toBeInTheDocument();
    expect(screen.queryByText('My Black Openings')).not.toBeInTheDocument();
  });

  it('renders the remaining tab toggle entries', async () => {
    render(<OpeningExplorerPage />);
    await waitFor(() => {
      expect(screen.getByTestId('tab-masterclasses')).toBeInTheDocument();
      expect(screen.getByTestId('tab-pro')).toBeInTheDocument();
      expect(screen.getByTestId('tab-gambits')).toBeInTheDocument();
      expect(screen.getByTestId('tab-all')).toBeInTheDocument();
    });
  });

  it('defaults to the Masterclasses tab', async () => {
    render(<OpeningExplorerPage />);
    await waitFor(() => {
      expect(screen.getByTestId('masterclasses-tab-stub')).toBeInTheDocument();
    });
  });

  it('switches to the Pro tab', async () => {
    const user = userEvent.setup();
    render(<OpeningExplorerPage />);
    await waitFor(() => {
      expect(screen.getByTestId('tab-pro')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('tab-pro'));
    await waitFor(() => {
      expect(screen.getByTestId('pro-tab-stub')).toBeInTheDocument();
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

  it('shows a favorite heart on list cards and toggles it (David 2026-06-06)', async () => {
    const user = userEvent.setup();
    render(<OpeningExplorerPage />);

    await waitFor(() => expect(screen.getByTestId('tab-all')).toBeInTheDocument());
    await user.click(screen.getByTestId('tab-all'));
    await waitFor(() => expect(screen.getByTestId('eco-toggle-A')).toBeInTheDocument());
    await user.click(screen.getByTestId('eco-toggle-A'));

    // The heart must be on the LIST card now — no need to open the detail page.
    const heart = await screen.findByTestId('favorite-toggle-a00-amar-opening');
    expect(heart).toBeInTheDocument();

    await user.click(heart);
    expect(mockToggleFavorite).toHaveBeenCalledWith('a00-amar-opening');
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
});
