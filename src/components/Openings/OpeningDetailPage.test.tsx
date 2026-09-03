import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import { render as rtlRender } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { OpeningDetailPage } from './OpeningDetailPage';
import { buildOpeningRecord } from '../../test/factories';
import type { OpeningRecord } from '../../types';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetOpeningById = vi.fn();

const mockToggleFavorite = vi.fn();

const mockHasLessonScript = vi.fn((): boolean => true);

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

// These tests render the BUILT opening detail page. Since 2026-07-16 the page
// reroutes a NON-built opening (no LessonScript) to the coach, so treat the
// mock `test-opening` as built by forcing hasLessonScript true; the rest of the
// lessons module stays real (getLessonScript still returns null for the mock,
// so the Watch view falls to WalkthroughMode exactly as before).
vi.mock('../../data/lessons', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../data/lessons')>()),
  hasLessonScript: (): boolean => mockHasLessonScript(),
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

vi.mock('../../services/speechService', () => ({
  speechService: {
    speak: vi.fn(),
    stop: vi.fn(),
    setEnabled: vi.fn(),
    setRate: vi.fn(),
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
          <Route path="/coach/teach" element={<div data-testid="coach-teach-page">Coach Teach</div>} />
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
    mockHasLessonScript.mockReturnValue(true);
  });

  it('reroutes a NON-built opening (no lesson script) to the coach auto-teach', async () => {
    // A raw Lichess ECO name with no hand-built course must not render the
    // half-built bare page — it hands off to the coach with ?teach=&auto=1
    // (David 2026-07-16). Grob (`g4`) is non-built and matches no masterclass
    // line, so it neither redirects nor renders — it reroutes.
    mockHasLessonScript.mockReturnValue(false);
    mockGetOpeningById.mockResolvedValue(
      buildOpeningRecord({ id: 'grob', name: 'Grob Opening', pgn: 'g4' }),
    );
    renderWithRoute('grob');
    await waitFor(() => {
      expect(screen.getByTestId('coach-teach-page')).toBeInTheDocument();
    });
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

  it('shows warnings panel', async () => {
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByText('Watch Out For')).toBeInTheDocument();
      expect(screen.getByText('Watch for early d5 break')).toBeInTheDocument();
    });
  });

  it('deep-links a variation via the ?line= query param', async () => {
    renderWithRoute('vienna-game?line=copycat');
    await waitFor(() => {
      expect(screen.getByTestId('variation-tab-1')).toHaveAttribute('aria-selected', 'true');
    });
    expect(screen.getByTestId('variation-tab-main')).toHaveAttribute('aria-selected', 'false');
  });

  it('renders a variation tab per variation', async () => {
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByTestId('variation-tabs')).toBeInTheDocument();
    });
    // One tab per variation, plus the leading "Main line" tab.
    expect(screen.getByTestId('variation-tab-0')).toBeInTheDocument();
    expect(screen.getByTestId('variation-tab-1')).toBeInTheDocument();
    expect(screen.getByTestId('variation-tab-main')).toBeInTheDocument();
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
    // loadOpening retries 10 × 400ms before giving up — wait long enough.
    await waitFor(() => {
      expect(screen.getByText('Opening not found.')).toBeInTheDocument();
    }, { timeout: 6000 });
  });

  it('clicking LEARN enters learn/drill mode', async () => {
    // WLPP ladder forward-locks Learn behind Watch — mark the main line
    // (MAIN_LINE_INDEX = -1) discovered so the Learn rung is unlocked.
    mockGetOpeningById.mockResolvedValue({ ...testOpening, linesDiscovered: [-1, 0] });
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
    // Practice is forward-locked behind Learn — mark the main line discovered
    // AND learned so the Practice rung is unlocked.
    mockGetOpeningById.mockResolvedValue({ ...testOpening, linesDiscovered: [-1, 0], linesLearned: [-1, 0] });
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByTestId('practice-btn')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('practice-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('practice-mode')).toBeInTheDocument();
    });
  });

  it('selecting a variation tab then Learn enters variation learn mode', async () => {
    // Watch already finished (MAIN_LINE_INDEX = -1), i.e. a RETURNING student.
    // The detail page auto-starts the main-line walkthrough for anyone who has
    // not watched it yet, so a first-time fixture never renders these controls —
    // and, worse, races them. This test is about the detail page itself, so it
    // states the state it needs instead of depending on that timing.
    mockGetOpeningById.mockResolvedValue({ ...testOpening, linesDiscovered: [-1, 0] });
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByTestId('variation-tab-0')).toBeInTheDocument();
    });
    // Select the variation tab, then the main Learn button rescopes to it.
    fireEvent.click(screen.getByTestId('variation-tab-0'));
    fireEvent.click(screen.getByTestId('learn-btn'));
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
    it('renders a Listen control on the overview section', async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByTestId('listenable-overview-play')).toBeInTheDocument();
      });
    });

    it('renders a Listen control on the key ideas section', async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByTestId('listenable-keyIdeas-play')).toBeInTheDocument();
      });
    });

    it('renders narration button on warnings section', async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByTestId('narrate-warnings')).toBeInTheDocument();
      });
    });

    it('Listen control has "Listen to this section" aria-label initially', async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByTestId('listenable-overview-play')).toHaveAttribute(
          'aria-label',
          'Listen to this section',
        );
      });
    });

    it('changes aria-label to "Pause reading" while reading', async () => {
    // Watch already finished (MAIN_LINE_INDEX = -1), i.e. a RETURNING student.
      // The detail page auto-starts the main-line walkthrough for anyone who has
      // not watched it yet, so a first-time fixture never renders these controls —
      // and, worse, races them. This test is about the detail page itself, so it
      // states the state it needs instead of depending on that timing.
      mockGetOpeningById.mockResolvedValue({ ...testOpening, linesDiscovered: [-1, 0] });
      renderWithRoute();
      await waitFor(() => {
        expect(screen.getByTestId('listenable-overview-play')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('listenable-overview-play'));

      // After click, playback starts and the toggle flips to pause.
      expect(screen.getByTestId('listenable-overview-play')).toHaveAttribute('aria-label', 'Pause reading');
    });
  });

  describe('train buttons', () => {
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
  });

  describe('variation tabs', () => {
    it('shows each variation as a gold-glow tab', async () => {
      renderWithRoute();
      await waitFor(() => {
        expect(within(screen.getByTestId('variation-tabs')).getByText('Vienna Gambit')).toBeInTheDocument();
      });
      expect(within(screen.getByTestId('variation-tabs')).getByText('Copycat')).toBeInTheDocument();
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
