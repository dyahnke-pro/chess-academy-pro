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

vi.mock('../../services/openingService', () => ({
  getOpeningById: (...args: unknown[]): unknown => mockGetOpeningById(...args),
  getMasteryPercent: (o: OpeningRecord) => Math.round(o.drillAccuracy * 100),
  needsReview: (o: OpeningRecord) => o.drillAttempts > 0 && o.drillAccuracy < 0.7,
  updateDrillProgress: vi.fn().mockResolvedValue(undefined),
  updateWoodpecker: vi.fn().mockResolvedValue(undefined),
  recordDrillAttempt: vi.fn().mockResolvedValue(undefined),
  updateVariationProgress: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../Board/ChessBoard', () => ({
  ChessBoard: ({ initialFen }: { initialFen?: string }) => (
    <div data-testid="chess-board" data-fen={initialFen}>Board</div>
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

  it('shows DRILL and PLAY buttons', async () => {
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByTestId('drill-btn')).toBeInTheDocument();
      expect(screen.getByTestId('play-btn')).toBeInTheDocument();
    });
  });

  it('DRILL button has correct text', async () => {
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByTestId('drill-btn')).toHaveTextContent('Drill');
    });
  });

  it('PLAY button has correct text', async () => {
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByTestId('play-btn')).toHaveTextContent('Play');
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

  it('shows variations list with mastery rings', async () => {
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByText('Variations')).toBeInTheDocument();
      expect(screen.getByTestId('variation-0')).toBeInTheDocument();
      expect(screen.getByTestId('variation-1')).toBeInTheDocument();
      expect(screen.getByText('Vienna Gambit')).toBeInTheDocument();
      expect(screen.getByText('Copycat')).toBeInTheDocument();
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

  it('clicking DRILL enters drill mode', async () => {
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByTestId('drill-btn')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('drill-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('drill-mode')).toBeInTheDocument();
    });
  });

  it('clicking a variation enters variation drill', async () => {
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByTestId('variation-0')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('variation-0'));
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
});
