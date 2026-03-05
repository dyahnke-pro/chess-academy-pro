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
  getOpeningById: (...args: unknown[]) => mockGetOpeningById(...args),
  updateDrillProgress: vi.fn().mockResolvedValue(undefined),
  updateWoodpecker: vi.fn().mockResolvedValue(undefined),
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
  ],
  drillAccuracy: 0.8,
  drillAttempts: 5,
  lastStudied: '2026-03-01',
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
    mockGetOpeningById.mockReturnValue(new Promise(() => {})); // never resolves
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

  it('renders the opening color', async () => {
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByText('white')).toBeInTheDocument();
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
      expect(screen.getByText('Traps to Know')).toBeInTheDocument();
      expect(screen.getByText('Vienna Gambit trap')).toBeInTheDocument();
    });
  });

  it('shows warnings panel', async () => {
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByText('Watch Out')).toBeInTheDocument();
      expect(screen.getByText('Watch for early d5 break')).toBeInTheDocument();
    });
  });

  it('back navigation element renders', async () => {
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByTestId('back-button')).toBeInTheDocument();
      expect(screen.getByLabelText('Back to openings')).toBeInTheDocument();
    });
  });

  it('renders study and drill mode toggle buttons', async () => {
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByTestId('study-mode-btn')).toBeInTheDocument();
      expect(screen.getByTestId('drill-mode-btn')).toBeInTheDocument();
    });
  });

  it('renders chess board in study mode', async () => {
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByTestId('chess-board')).toBeInTheDocument();
    });
  });

  it('renders navigation controls in study mode', async () => {
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByTestId('nav-first')).toBeInTheDocument();
      expect(screen.getByTestId('nav-prev')).toBeInTheDocument();
      expect(screen.getByTestId('nav-next')).toBeInTheDocument();
      expect(screen.getByTestId('nav-last')).toBeInTheDocument();
    });
  });

  it('shows "Opening not found" when the opening does not exist', async () => {
    mockGetOpeningById.mockResolvedValue(undefined);
    renderWithRoute('nonexistent-id');
    await waitFor(() => {
      expect(screen.getByText('Opening not found.')).toBeInTheDocument();
    });
  });

  it('displays drill progress stats when drillAttempts > 0', async () => {
    renderWithRoute();
    await waitFor(() => {
      expect(screen.getByText('Accuracy: 80%')).toBeInTheDocument();
      expect(screen.getByText('Attempts: 5')).toBeInTheDocument();
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
