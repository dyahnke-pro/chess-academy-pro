import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { AdaptivePuzzlePage } from './AdaptivePuzzlePage';

const mockPuzzle = {
  id: 'p1',
  fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
  moves: 'e7e5 d2d4',
  rating: 1000,
  themes: ['fork'],
  openingTags: null,
  popularity: 80,
  nbPlays: 1000,
  srsInterval: 0,
  srsEaseFactor: 2.5,
  srsRepetitions: 0,
  srsDueDate: '2026-03-15',
  srsLastReview: null,
  userRating: 1200,
  attempts: 0,
  successes: 0,
};

// Mock puzzle service
vi.mock('../../services/puzzleService', () => ({
  seedPuzzles: vi.fn().mockResolvedValue(undefined),
  recordAttempt: vi.fn().mockResolvedValue({
    correct: true,
    newUserRating: 1216,
    ratingDelta: 16,
    newSrsDueDate: '2026-03-16',
  }),
  getPuzzleStats: vi.fn().mockResolvedValue({
    totalAttempted: 10,
    totalCorrect: 7,
    overallAccuracy: 0.7,
    averageRating: 1200,
    totalPuzzles: 1000,
    duePuzzles: 5,
  }),
}));

// Mock adaptive service
const mockGetNextAdaptivePuzzle = vi.fn().mockResolvedValue(mockPuzzle);
vi.mock('../../services/adaptivePuzzleService', async () => {
  const actual = await vi.importActual<typeof import('../../services/adaptivePuzzleService')>(
    '../../services/adaptivePuzzleService',
  );
  return {
    ...actual,
    getNextAdaptivePuzzle: (...args: unknown[]) => mockGetNextAdaptivePuzzle(...args) as Promise<unknown>,
  };
});

// Mock sound and speech
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
  },
}));

// Mock DB
vi.mock('../../db/schema', () => ({
  db: {
    profiles: { update: vi.fn().mockResolvedValue(1) },
    puzzles: {
      bulkPut: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
      get: vi.fn(),
      filter: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
      where: vi.fn().mockReturnValue({
        belowOrEqual: vi.fn().mockReturnValue({
          count: vi.fn().mockResolvedValue(0),
          limit: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
        }),
        between: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
      toArray: vi.fn().mockResolvedValue([]),
    },
    meta: {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn(),
    },
  },
}));

vi.mock('../../hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));

describe('AdaptivePuzzlePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetNextAdaptivePuzzle.mockResolvedValue(mockPuzzle);
  });

  it('renders difficulty selector initially', async () => {
    render(<AdaptivePuzzlePage />);
    await waitFor(() => {
      expect(screen.getByTestId('difficulty-selector')).toBeInTheDocument();
    });
  });

  it('shows puzzle stats on mount', async () => {
    render(<AdaptivePuzzlePage />);
    await waitFor(() => {
      expect(screen.getByText('1000 puzzles')).toBeInTheDocument();
      expect(screen.getByText('10 attempted')).toBeInTheDocument();
    });
  });

  it('shows user rating in header', async () => {
    render(<AdaptivePuzzlePage />);
    await waitFor(() => {
      expect(screen.getByText('Rating: 1200')).toBeInTheDocument();
    });
  });

  it('transitions to solving after selecting difficulty', async () => {
    render(<AdaptivePuzzlePage />);
    await waitFor(() => {
      expect(screen.getByTestId('difficulty-easy')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('difficulty-easy'));

    await waitFor(() => {
      expect(screen.getByTestId('puzzle-board')).toBeInTheDocument();
    });
  });

  it('shows session panel while solving', async () => {
    render(<AdaptivePuzzlePage />);
    await waitFor(() => {
      expect(screen.getByTestId('difficulty-easy')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('difficulty-easy'));

    await waitFor(() => {
      expect(screen.getByTestId('adaptive-session-panel')).toBeInTheDocument();
    });
  });

  it('shows End Session button while solving', async () => {
    render(<AdaptivePuzzlePage />);
    await waitFor(() => {
      expect(screen.getByTestId('difficulty-easy')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('difficulty-easy'));

    await waitFor(() => {
      expect(screen.getByTestId('end-session')).toBeInTheDocument();
    });
  });

  it('shows session summary when End Session is clicked', async () => {
    render(<AdaptivePuzzlePage />);
    await waitFor(() => {
      expect(screen.getByTestId('difficulty-easy')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('difficulty-easy'));

    await waitFor(() => {
      expect(screen.getByTestId('end-session')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('end-session'));

    await waitFor(() => {
      expect(screen.getByTestId('session-summary')).toBeInTheDocument();
    });
  });

  it('returns to difficulty select from summary', async () => {
    render(<AdaptivePuzzlePage />);
    await waitFor(() => {
      expect(screen.getByTestId('difficulty-easy')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('difficulty-easy'));
    await waitFor(() => {
      expect(screen.getByTestId('end-session')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('end-session'));
    await waitFor(() => {
      expect(screen.getByTestId('back-to-select')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('back-to-select'));
    await waitFor(() => {
      expect(screen.getByTestId('difficulty-selector')).toBeInTheDocument();
    });
  });

  it('shows classic trainer link', async () => {
    render(<AdaptivePuzzlePage />);
    await waitFor(() => {
      expect(screen.getByTestId('classic-trainer-link')).toBeInTheDocument();
    });
  });

  it('shows back button when solving', async () => {
    render(<AdaptivePuzzlePage />);
    await waitFor(() => {
      expect(screen.getByTestId('difficulty-easy')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('difficulty-easy'));
    await waitFor(() => {
      expect(screen.getByTestId('back-button')).toBeInTheDocument();
    });
  });

  it('handles no puzzles available gracefully', async () => {
    mockGetNextAdaptivePuzzle.mockResolvedValue(null);

    render(<AdaptivePuzzlePage />);
    await waitFor(() => {
      expect(screen.getByTestId('difficulty-easy')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('difficulty-easy'));

    // Should show summary since no puzzles were available
    await waitFor(() => {
      expect(screen.getByTestId('session-summary')).toBeInTheDocument();
    });
  });
});
