import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { render as rtlRender } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { OpeningDetailPage } from './OpeningDetailPage';
import { buildOpeningRecord } from '../../test/factories';
import type { OpeningRecord } from '../../types';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetOpeningById = vi.fn();

const mockToggleFavorite = vi.fn();

vi.mock('../../services/openingService', () => ({
  getOpeningById: (...args: unknown[]): unknown => mockGetOpeningById(...args),
  getMasteryPercent: (o: OpeningRecord) => Math.round(o.drillAccuracy * 100),
  needsReview: (o: OpeningRecord) => o.drillAttempts > 0 && o.drillAccuracy < 0.7,
  getLinesDiscovered: (o: OpeningRecord) => o.linesDiscovered?.length ?? 0,
  getLinesPerfected: (o: OpeningRecord) => o.linesPerfected?.length ?? 0,
  getTotalLines: (o: OpeningRecord) => o.variations?.length ?? 0,
  toggleFavorite: (...args: unknown[]): unknown => mockToggleFavorite(...args),
  updateDrillProgress: vi.fn().mockResolvedValue(undefined),
  updateWoodpecker: vi.fn().mockResolvedValue(undefined),
  recordDrillAttempt: vi.fn().mockResolvedValue(undefined),
  updateVariationProgress: vi.fn().mockResolvedValue(undefined),
  markLineDiscovered: vi.fn().mockResolvedValue(undefined),
  markLinePerfected: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../Board/ChessBoard', () => ({
  ChessBoard: ({ initialFen }: { initialFen?: string }) => (
    <div data-testid="chess-board" data-fen={initialFen}>Board</div>
  ),
}));

vi.mock('../Board/MiniBoard', () => ({
  MiniBoard: ({ fen, size }: { fen: string; size?: number }) => (
    <div data-testid="mini-board" data-fen={fen} data-size={String(size ?? 56)}>MiniBoard</div>
  ),
}));

vi.mock('../../hooks/usePieceSound', () => ({
  usePieceSound: () => ({
    playMoveSound: vi.fn(),
    playCelebration: vi.fn(),
    playEncouragement: vi.fn(),
  }),
}));

vi.mock('../../services/voiceService', () => ({
  voiceService: {
    speak: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    isPlaying: vi.fn().mockReturnValue(false),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const testOpening: OpeningRecord = buildOpeningRecord({
  id: 'test-opening',
  eco: 'C25',
  name: 'Vienna Game',
  pgn: 'e4 e5 Nc3',
  uci: 'e2e4 e7e5 b1c3',
  fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR b KQkq - 1 2',
  color: 'white',
  style: 'Classical, Flexible',
  overview: 'A flexible opening that delays d4.',
  keyIdeas: ['Control the center', 'Develop knights early'],
  traps: ['Vienna Gambit trap'],
  warnings: ['Watch for early d5 break'],
  variations: [
    { name: 'Vienna Gambit', pgn: 'e4 e5 Nc3 Nf6 f4', explanation: 'Sharp gambit play' },
    { name: 'Copycat', pgn: 'e4 e5 Nc3 Nc6', explanation: 'Mirror variation' },
  ],
  drillAccuracy: 0.8,
  drillAttempts: 5,
  lastStudied: '2026-03-01',
  woodpeckerReps: 7,
  woodpeckerSpeed: 18,
  woodpeckerLastDate: '2026-03-03',
  linesDiscovered: [0],
  linesPerfected: [],
});

function renderWithRoute(openingId: string = 'test-opening'): void {
  rtlRender(
    <MemoryRouter initialEntries={[`/openings/${openingId}`]}>
      <MotionConfig transition={{ duration: 0 }}>
        <Routes>
          <Route path="/openings/:id" element={<OpeningDetailPage />} />
          <Route path="/openings" element={<div data-testid="explorer-page">Explorer</div>} />
        </Routes>
      </MotionConfig>
    </MemoryRouter>,
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('OpeningDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOpeningById.mockResolvedValue(testOpening);
    mockToggleFavorite.mockResolvedValue(true);
  });

  it('renders loading state initially', () => {
    mockGetOpeningById.mockReturnValue(new Promise(() => {}));
    renderWithRoute();
    expect(screen.getByText('Loading opening...')).toBeInTheDocument();
  });

  it('renders opening name when data loads', async () => {
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByText('Vienna Game')).toBeInTheDocument();
    });
  });

  it('renders ECO code after loading', async () => {
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByText('C25')).toBeInTheDocument();
    });
  });

  it('shows LEARN, PRACTICE, and PLAY buttons', async () => {
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByTestId('learn-btn')).toBeInTheDocument();
      expect(screen.getByTestId('practice-btn')).toBeInTheDocument();
      expect(screen.getByTestId('play-btn')).toBeInTheDocument();
    });
  });

  it('LEARN button has correct text', async () => {
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByTestId('learn-btn')).toHaveTextContent('Learn');
    });
  });

  it('PRACTICE button has correct text', async () => {
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByTestId('practice-btn')).toHaveTextContent('Practice');
    });
  });

  it('PLAY button has correct text', async () => {
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByTestId('play-btn')).toHaveTextContent('Play');
    });
  });

  it('shows lines discovered count', async () => {
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByTestId('lines-discovered')).toHaveTextContent('1/2 lines discovered');
    });
  });

  it('shows lines perfected count', async () => {
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByTestId('lines-perfected')).toHaveTextContent('0/2 lines perfected');
    });
  });

  it('shows overview panel', async () => {
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('A flexible opening that delays d4.')).toBeInTheDocument();
    });
  });

  it('shows key ideas panel', async () => {
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByText('Key Ideas')).toBeInTheDocument();
      expect(screen.getByText('Control the center')).toBeInTheDocument();
      expect(screen.getByText('Develop knights early')).toBeInTheDocument();
    });
  });

  it('shows traps panel', async () => {
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByText('Traps & Pitfalls')).toBeInTheDocument();
      expect(screen.getByText('Vienna Gambit trap')).toBeInTheDocument();
    });
  });

  it('shows warnings panel', async () => {
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByText('Watch Out For')).toBeInTheDocument();
      expect(screen.getByText('Watch for early d5 break')).toBeInTheDocument();
    });
  });

  it('shows variations list labeled as Lines', async () => {
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByText('Lines (2)')).toBeInTheDocument();
      expect(screen.getByTestId('variation-0')).toBeInTheDocument();
      expect(screen.getByTestId('variation-1')).toBeInTheDocument();
      expect(screen.getByText('Vienna Gambit')).toBeInTheDocument();
      expect(screen.getByText('Copycat')).toBeInTheDocument();
    });
  });

  it('variation rows have learn and practice buttons', async () => {
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByTestId('variation-learn-0')).toBeInTheDocument();
      expect(screen.getByTestId('variation-practice-0')).toBeInTheDocument();
    });
  });

  it('shows woodpecker stats when reps > 0', async () => {
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByText('Woodpecker Stats')).toBeInTheDocument();
      expect(screen.getByTestId('wp-reps')).toHaveTextContent('7');
      expect(screen.getByTestId('wp-speed')).toHaveTextContent('18s');
    });
  });

  it('shows mastery ring in header', async () => {
    renderWithRoute();
    await waitFor(() => {
      const percents = screen.getAllByTestId('mastery-percent');
      expect(percents.length).toBeGreaterThan(0);
    });
  });

  it('back button renders', async () => {
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByTestId('back-button')).toBeInTheDocument();
      expect(screen.getByLabelText('Back to openings')).toBeInTheDocument();
    });
  });

  it('shows "Opening not found" when opening does not exist', async () => {
    mockGetOpeningById.mockResolvedValue(undefined);
    renderWithRoute('nonexistent-id');
    await waitFor(() => {
      expect(screen.getByText('Opening not found.')).toBeInTheDocument();
    });
  });

  it('clicking LEARN enters learn/drill mode', async () => {
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByTestId('learn-btn')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('learn-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('drill-mode')).toBeInTheDocument();
    });
  });

  it('clicking PRACTICE enters practice mode', async () => {
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByTestId('practice-btn')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('practice-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('practice-mode')).toBeInTheDocument();
    });
  });

  it('clicking variation learn button enters variation learn mode', async () => {
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByTestId('variation-learn-0')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('variation-learn-0'));
    await waitFor(() => {
      expect(screen.getByTestId('drill-mode')).toBeInTheDocument();
    });
  });

  it('displays opening style', async () => {
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByText('Classical, Flexible')).toBeInTheDocument();
    });
  });

  it('fetches opening by the route id param', async () => {
    renderWithRoute('test-opening');
    await waitFor(() => {
      expect(mockGetOpeningById).toHaveBeenCalledWith('test-opening');
    });
  });

  describe('narration buttons', () => {
    it('renders narration button on overview section', async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByTestId('narrate-overview')).toBeInTheDocument();
      });
    });

    it('renders narration button on key ideas section', async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByTestId('narrate-keyIdeas')).toBeInTheDocument();
      });
    });

    it('renders narration button on traps section', async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByTestId('narrate-traps')).toBeInTheDocument();
      });
    });

    it('renders narration button on warnings section', async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByTestId('narrate-warnings')).toBeInTheDocument();
      });
    });

    it('narration button has "Narrate section" aria-label initially', async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByTestId('narrate-overview')).toHaveAttribute('aria-label', 'Narrate section');
      });
    });

    it('changes aria-label to "Stop narration" while narrating', async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByTestId('narrate-overview')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('narrate-overview'));

      // After click, the button should change aria-label to "Stop narration"
      expect(screen.getByTestId('narrate-overview')).toHaveAttribute('aria-label', 'Stop narration');
    });
  });

  describe('train buttons', () => {
    it('does not render train traps button when no trapLines', async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByText('Traps & Pitfalls')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('train-traps-btn')).not.toBeInTheDocument();
    });

    it('renders train traps button when trapLines exist', async () => {
      const openingWithTraps = {
        ...testOpening,
        trapLines: [
          { name: 'Trap 1', pgn: 'e4 e5 Nc3', explanation: 'A trap' },
        ],
      };
      mockGetOpeningById.mockResolvedValue(openingWithTraps);

      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByTestId('train-traps-btn')).toBeInTheDocument();
      });
    });

    it('does not render train warnings button when no warningLines', async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByText('Watch Out For')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('train-warnings-btn')).not.toBeInTheDocument();
    });

    it('renders train warnings button when warningLines exist', async () => {
      const openingWithWarnings = {
        ...testOpening,
        warningLines: [
          { name: 'Warning 1', pgn: 'e4 e5 d4', explanation: 'Be careful' },
        ],
      };
      mockGetOpeningById.mockResolvedValue(openingWithWarnings);

      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByTestId('train-warnings-btn')).toBeInTheDocument();
      });
    });

    it('clicking train traps button enters train-traps mode', async () => {
      const openingWithTraps = {
        ...testOpening,
        trapLines: [
          { name: 'Trap 1', pgn: 'e4 e5 Nc3', explanation: 'A trap' },
        ],
      };
      mockGetOpeningById.mockResolvedValue(openingWithTraps);

      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByTestId('train-traps-btn')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('train-traps-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('train-mode')).toBeInTheDocument();
      });
    });
  });

  describe('variation thumbnails', () => {
    it('renders MiniBoard thumbnails in variation rows', async () => {
      renderWithRoute();
      await waitFor(() => {
        const miniBoards = screen.getAllByTestId('mini-board');
        // 2 variations → 2 MiniBoard thumbnails
        expect(miniBoards).toHaveLength(2);
      });
    });

    it('MiniBoard receives computed FEN for variation', async () => {
      renderWithRoute();
      await waitFor(() => {
        const miniBoards = screen.getAllByTestId('mini-board');
        // Each MiniBoard should have a non-empty FEN
        for (const board of miniBoards) {
          expect(board.getAttribute('data-fen')).toBeTruthy();
          expect(board.getAttribute('data-fen')).not.toBe('');
        }
      });
    });

    it('MiniBoard uses 52 as size', async () => {
      renderWithRoute();
      await waitFor(() => {
        const miniBoards = screen.getAllByTestId('mini-board');
        for (const board of miniBoards) {
          expect(board.getAttribute('data-size')).toBe('52');
        }
      });
    });
  });

  describe('favorite button', () => {
    it('renders favorite button in header', async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByTestId('favorite-btn')).toBeInTheDocument();
      });
    });

    it('favorite button shows "Add to favorites" when not favorited', async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByTestId('favorite-btn')).toHaveAttribute('aria-label', 'Add to favorites');
      });
    });

    it('favorite button shows "Remove from favorites" when favorited', async () => {
      mockGetOpeningById.mockResolvedValue({ ...testOpening, isFavorite: true });
      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByTestId('favorite-btn')).toHaveAttribute('aria-label', 'Remove from favorites');
      });
    });

    it('clicking favorite button calls toggleFavorite', async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByTestId('favorite-btn')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId('favorite-btn'));
      await waitFor(() => {
        expect(mockToggleFavorite).toHaveBeenCalledWith('test-opening');
      });
    });
  });
});
