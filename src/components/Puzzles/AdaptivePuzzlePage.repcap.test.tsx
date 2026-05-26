import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { AdaptivePuzzlePage } from './AdaptivePuzzlePage';
import type { PuzzleOutcome } from './PuzzleBoard';

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

// PuzzleBoard mock: a single "solve" button that reports a clean correct
// outcome, so we can drive the page through puzzle completions deterministically.
vi.mock('./PuzzleBoard', () => ({
  PuzzleBoard: ({ onComplete }: { onComplete: (o: PuzzleOutcome) => void }) => (
    <button
      data-testid="mock-solve"
      onClick={() =>
        onComplete({ correct: true, usedHint: false, hadRetry: false, showedSolution: false, solveTimeMs: 1000 })
      }
    >
      solve
    </button>
  ),
}));

vi.mock('../../services/puzzleService', () => ({
  seedPuzzles: vi.fn().mockResolvedValue(undefined),
  recordAttempt: vi.fn().mockResolvedValue({ correct: true, newUserRating: 1216, ratingDelta: 16, newSrsDueDate: '2026-03-16' }),
  getPuzzleStats: vi.fn().mockResolvedValue({ totalAttempted: 10, totalCorrect: 7, overallAccuracy: 0.7, averageRating: 1200, totalPuzzles: 1000, duePuzzles: 5 }),
}));

const mockGetNextAdaptivePuzzle = vi.fn().mockResolvedValue(mockPuzzle);
vi.mock('../../services/adaptivePuzzleService', async () => {
  const actual = await vi.importActual<typeof import('../../services/adaptivePuzzleService')>('../../services/adaptivePuzzleService');
  return { ...actual, getNextAdaptivePuzzle: (...args: unknown[]) => mockGetNextAdaptivePuzzle(...args) as Promise<unknown> };
});

const mockMarkRepCompletedToday = vi.fn().mockResolvedValue(undefined);
vi.mock('../../services/repCompletion', async () => {
  const actual = await vi.importActual<typeof import('../../services/repCompletion')>('../../services/repCompletion');
  return { ...actual, markRepCompletedToday: (...args: unknown[]) => mockMarkRepCompletedToday(...args) as Promise<void> };
});

const mockRecordTagDrillResult = vi.fn().mockResolvedValue(undefined);
vi.mock('../../services/misconceptionService', () => ({
  recordTagDrillResult: (...args: unknown[]) => mockRecordTagDrillResult(...args) as Promise<void>,
}));

vi.mock('../../services/voiceService', () => ({
  voiceService: { stop: vi.fn(), speak: vi.fn() },
}));

vi.mock('../../db/schema', () => ({
  db: { profiles: { update: vi.fn().mockResolvedValue(1) }, meta: { get: vi.fn().mockResolvedValue(null), put: vi.fn() } },
}));

vi.mock('../../hooks/useIsMobile', () => ({ useIsMobile: () => false }));

function renderWithState(state: Record<string, unknown>): void {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/tactics/adaptive', state }]}>
      <MotionConfig transition={{ duration: 0 }}>
        <AdaptivePuzzlePage />
      </MotionConfig>
    </MemoryRouter>,
  );
}

describe('AdaptivePuzzlePage — capped Dashboard rep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetNextAdaptivePuzzle.mockResolvedValue(mockPuzzle);
  });

  it('caps the drill at repCap puzzles and offers continue / dashboard', async () => {
    renderWithState({
      forcedWeakThemes: ['fork'],
      misconceptionTag: 'fork',
      repKey: 'weakness:fork:Missed forks',
      repCap: 2,
    });

    // Auto-starts (forcedWeakThemes) → first puzzle board mounts.
    await waitFor(() => expect(screen.getByTestId('mock-solve')).toBeInTheDocument());

    // Solve puzzle 1 → still solving (cap not yet reached).
    fireEvent.click(screen.getByTestId('mock-solve'));
    await waitFor(() => expect(screen.getByTestId('mock-solve')).toBeInTheDocument());
    expect(screen.queryByTestId('rep-complete')).not.toBeInTheDocument();

    // Solve puzzle 2 → cap reached → rep-complete modal.
    fireEvent.click(screen.getByTestId('mock-solve'));
    await waitFor(() => expect(screen.getByTestId('rep-complete')).toBeInTheDocument());

    expect(mockMarkRepCompletedToday).toHaveBeenCalledWith('weakness:fork:Missed forks');
    expect(mockRecordTagDrillResult).toHaveBeenCalledWith('fork', true);
    expect(screen.getByTestId('rep-complete-continue')).toBeInTheDocument();
    expect(screen.getByTestId('rep-complete-dashboard')).toBeInTheDocument();
  });

  it('Keep Going resumes solving past the cap (fires the cap once)', async () => {
    renderWithState({
      forcedWeakThemes: ['fork'],
      repKey: 'weakness:fork:Missed forks',
      repCap: 1,
    });

    await waitFor(() => expect(screen.getByTestId('mock-solve')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('mock-solve'));
    await waitFor(() => expect(screen.getByTestId('rep-complete')).toBeInTheDocument());
    expect(mockMarkRepCompletedToday).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('rep-complete-continue'));
    await waitFor(() => expect(screen.getByTestId('mock-solve')).toBeInTheDocument());

    // Solving again past the cap does NOT re-fire the rep completion.
    fireEvent.click(screen.getByTestId('mock-solve'));
    await waitFor(() => expect(screen.getByTestId('mock-solve')).toBeInTheDocument());
    expect(mockMarkRepCompletedToday).toHaveBeenCalledTimes(1);
  });

  it('does not cap a normal session (no repKey)', async () => {
    renderWithState({ forcedWeakThemes: ['fork'] });

    await waitFor(() => expect(screen.getByTestId('mock-solve')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('mock-solve'));
    await waitFor(() => expect(screen.getByTestId('mock-solve')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('mock-solve'));
    await waitFor(() => expect(screen.getByTestId('mock-solve')).toBeInTheDocument());

    expect(screen.queryByTestId('rep-complete')).not.toBeInTheDocument();
    expect(mockMarkRepCompletedToday).not.toHaveBeenCalled();
  });
});
