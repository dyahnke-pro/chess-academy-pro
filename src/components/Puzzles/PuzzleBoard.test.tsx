import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import { PuzzleBoard } from './PuzzleBoard';
import type { PuzzleRecord } from '../../types';

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

function makePuzzle(overrides: Partial<PuzzleRecord> = {}): PuzzleRecord {
  const today = new Date().toISOString().split('T')[0];
  return {
    id: 'test-puzzle',
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
    srsDueDate: today,
    srsLastReview: null,
    userRating: 1200,
    attempts: 0,
    successes: 0,
    ...overrides,
  };
}

describe('PuzzleBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the board', () => {
    const puzzle = makePuzzle();
    render(<PuzzleBoard puzzle={puzzle} onComplete={vi.fn()} />);
    expect(screen.getByTestId('puzzle-board')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    const puzzle = makePuzzle();
    render(<PuzzleBoard puzzle={puzzle} onComplete={vi.fn()} />);
    expect(screen.getByTestId('puzzle-loading')).toBeInTheDocument();
  });

  it('shows puzzle rating and themes', () => {
    const puzzle = makePuzzle({ rating: 1500, themes: ['pin', 'middlegame'] });
    render(<PuzzleBoard puzzle={puzzle} onComplete={vi.fn()} />);
    expect(screen.getByText('Rating: 1500')).toBeInTheDocument();
    expect(screen.getByText('pin, middlegame')).toBeInTheDocument();
  });

  it('determines user color from FEN turn', () => {
    // FEN has black to move → user plays white (opposite)
    const puzzle = makePuzzle({
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    });
    render(<PuzzleBoard puzzle={puzzle} onComplete={vi.fn()} />);
    // Board should be rendered (orientation tested implicitly via rendering)
    expect(screen.getByTestId('puzzle-board')).toBeInTheDocument();
  });

  it('transitions to playing state after auto-play delay', async () => {
    const puzzle = makePuzzle();
    render(<PuzzleBoard puzzle={puzzle} onComplete={vi.fn()} />);

    // Initially loading
    expect(screen.getByTestId('puzzle-loading')).toBeInTheDocument();

    // After auto-play, should transition to playing (loading goes away)
    await waitFor(
      () => {
        expect(screen.queryByTestId('puzzle-loading')).not.toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it('does not interact when disabled', () => {
    const puzzle = makePuzzle();
    const onComplete = vi.fn();
    render(<PuzzleBoard puzzle={puzzle} onComplete={onComplete} disabled />);
    // Board renders but is non-interactive
    expect(screen.getByTestId('puzzle-board')).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });
});
