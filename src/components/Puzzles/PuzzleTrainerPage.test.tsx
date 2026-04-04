import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { PuzzleTrainerPage } from './PuzzleTrainerPage';

// Mock puzzle service
vi.mock('../../services/puzzleService', () => ({
  seedPuzzles: vi.fn().mockResolvedValue(undefined),
  getPuzzlesForMode: vi.fn().mockResolvedValue([
    {
      id: 'p1',
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      moves: 'e7e5 d2d4',
      rating: 1200,
      themes: ['fork'],
      openingTags: null,
      popularity: 80,
      nbPlays: 1000,
      srsInterval: 0,
      srsEaseFactor: 2.5,
      srsRepetitions: 0,
      srsDueDate: '2026-03-04',
      srsLastReview: null,
      userRating: 1200,
      attempts: 0,
      successes: 0,
    },
  ]),
  recordAttempt: vi.fn().mockResolvedValue({
    correct: true,
    newUserRating: 1216,
    ratingDelta: 16,
    newSrsDueDate: '2026-03-05',
  }),
  getPuzzleStats: vi.fn().mockResolvedValue({
    totalAttempted: 10,
    totalCorrect: 7,
    overallAccuracy: 0.7,
    averageRating: 1200,
    totalPuzzles: 100,
    duePuzzles: 5,
  }),
  PUZZLE_MODES: [
    { mode: 'standard', label: 'Standard', description: 'Solve at your own pace.', timeLimit: null },
    { mode: 'timed_blitz', label: 'Timed Blitz', description: '30 seconds per puzzle.', timeLimit: 30 },
    { mode: 'daily_challenge', label: 'Daily Challenge', description: 'One puzzle per day.', timeLimit: null },
    { mode: 'opening_traps', label: 'Opening Traps', description: 'Opening puzzles.', timeLimit: null },
    { mode: 'endgame', label: 'Endgame Scenarios', description: 'Endgame puzzles.', timeLimit: null },
  ],
}));

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

vi.mock('../../hooks/useSolveTimer', () => ({
  useSolveTimer: () => ({ elapsed: 0, reset: vi.fn() }),
}));

// Mock DB
vi.mock('../../db/schema', () => ({
  db: {
    profiles: { update: vi.fn().mockResolvedValue(1), get: vi.fn().mockResolvedValue(null) },
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

describe('PuzzleTrainerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the puzzle trainer page', () => {
    render(<PuzzleTrainerPage />);
    expect(screen.getByTestId('puzzle-trainer')).toBeInTheDocument();
    expect(screen.getByText('Puzzle Trainer')).toBeInTheDocument();
  });

  it('shows mode selector initially', async () => {
    render(<PuzzleTrainerPage />);
    await waitFor(() => {
      expect(screen.getByTestId('puzzle-mode-selector')).toBeInTheDocument();
    });
  });

  it('displays all 5 puzzle modes', async () => {
    render(<PuzzleTrainerPage />);
    await waitFor(() => {
      expect(screen.getByTestId('mode-standard')).toBeInTheDocument();
      expect(screen.getByTestId('mode-timed_blitz')).toBeInTheDocument();
      expect(screen.getByTestId('mode-daily_challenge')).toBeInTheDocument();
      expect(screen.getByTestId('mode-opening_traps')).toBeInTheDocument();
      expect(screen.getByTestId('mode-endgame')).toBeInTheDocument();
    });
  });

  it('shows puzzle stats on the mode selection page', async () => {
    render(<PuzzleTrainerPage />);
    await waitFor(() => {
      expect(screen.getByText('100 puzzles')).toBeInTheDocument();
      expect(screen.getByText('10 attempted')).toBeInTheDocument();
      expect(screen.getByText('70% accuracy')).toBeInTheDocument();
      expect(screen.getByText('5 due for review')).toBeInTheDocument();
    });
  });

  it('transitions to puzzle solving on mode select', async () => {
    render(<PuzzleTrainerPage />);
    await waitFor(() => {
      expect(screen.getByTestId('mode-standard')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('mode-standard'));

    await waitFor(() => {
      expect(screen.getByTestId('puzzle-board')).toBeInTheDocument();
    });
  });

  it('shows back button when in solving mode', async () => {
    render(<PuzzleTrainerPage />);
    await waitFor(() => {
      expect(screen.getByTestId('mode-standard')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('mode-standard'));

    await waitFor(() => {
      expect(screen.getByTestId('back-to-modes')).toBeInTheDocument();
    });
  });

  it('returns to mode selector when back is clicked', async () => {
    render(<PuzzleTrainerPage />);
    await waitFor(() => {
      expect(screen.getByTestId('mode-standard')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('mode-standard'));

    await waitFor(() => {
      expect(screen.getByTestId('back-to-modes')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('back-to-modes'));

    await waitFor(() => {
      expect(screen.getByTestId('puzzle-mode-selector')).toBeInTheDocument();
    });
  });

  it('shows session stats during solving', async () => {
    render(<PuzzleTrainerPage />);
    await waitFor(() => {
      expect(screen.getByTestId('mode-standard')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('mode-standard'));

    await waitFor(() => {
      expect(screen.getByTestId('session-stats')).toBeInTheDocument();
    });
  });

  it('shows skip button during solving', async () => {
    render(<PuzzleTrainerPage />);
    await waitFor(() => {
      expect(screen.getByTestId('mode-standard')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('mode-standard'));

    await waitFor(() => {
      expect(screen.getByTestId('skip-puzzle')).toBeInTheDocument();
    });
  });

  it('shows user rating in header', () => {
    render(<PuzzleTrainerPage />);
    expect(screen.getByText(/Rating:/)).toBeInTheDocument();
  });
});
