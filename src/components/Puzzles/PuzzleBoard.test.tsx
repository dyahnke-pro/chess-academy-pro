import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import { PuzzleBoard } from './PuzzleBoard';
import type { PuzzleRecord } from '../../types';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../Board/ChessBoard', () => ({
  ChessBoard: ({ initialFen, orientation, interactive }: {
    initialFen?: string;
    orientation?: string;
    interactive?: boolean;
  }) => (
    <div
      data-testid="chess-board"
      data-fen={initialFen}
      data-orientation={orientation}
      data-interactive={String(interactive)}
    >
      Board
    </div>
  ),
}));

vi.mock('../Coach/HintButton', () => ({
  HintButton: () => <button data-testid="hint-button">Hint</button>,
}));

// Stable references — prevents infinite re-render when these are in useEffect deps
vi.mock('../../hooks/usePieceSound', () => {
  const playMoveSound = vi.fn();
  const playCelebration = vi.fn();
  const playEncouragement = vi.fn();
  const playErrorPing = vi.fn();
  const playSuccessChime = vi.fn();
  return { usePieceSound: () => ({ playMoveSound, playCelebration, playEncouragement, playErrorPing, playSuccessChime }) };
});

vi.mock('../../hooks/useHintSystem', () => {
  const requestHint = vi.fn();
  const resetHints = vi.fn();
  const hintState = { level: 0 as const, arrows: [] as never[], ghostMove: null, nudgeText: '', isAnalyzing: false };
  return { useHintSystem: () => ({ hintState, requestHint, resetHints }) };
});

vi.mock('../../hooks/useBoardContext', () => ({ useBoardContext: vi.fn() }));

vi.mock('../../services/voiceService', () => ({
  voiceService: {
    speak: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    isPlaying: vi.fn().mockReturnValue(false),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Tests ───────────────────────────────────────────────────────────────────

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

  it('shows puzzle rating badge and themes', () => {
    const puzzle = makePuzzle({ rating: 1500, themes: ['pin', 'middlegame'] });
    render(<PuzzleBoard puzzle={puzzle} onComplete={vi.fn()} />);
    expect(screen.getByTestId('puzzle-rating-badge')).toHaveTextContent('Puzzle Rating: 1500');
    expect(screen.getByText('pin, middlegame')).toBeInTheDocument();
  });

  it('orients board for user (black to move in FEN → user plays white)', () => {
    const puzzle = makePuzzle({
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    });
    render(<PuzzleBoard puzzle={puzzle} onComplete={vi.fn()} />);
    expect(screen.getByTestId('chess-board')).toHaveAttribute('data-orientation', 'white');
  });

  it('transitions from loading to playing after auto-play delay', async () => {
    const puzzle = makePuzzle();
    render(<PuzzleBoard puzzle={puzzle} onComplete={vi.fn()} />);

    expect(screen.getByTestId('puzzle-loading')).toBeInTheDocument();

    await waitFor(
      () => expect(screen.queryByTestId('puzzle-loading')).not.toBeInTheDocument(),
      { timeout: 2000 },
    );
  });

  it('renders board as non-interactive when disabled', () => {
    const puzzle = makePuzzle();
    const onComplete = vi.fn();
    render(<PuzzleBoard puzzle={puzzle} onComplete={onComplete} disabled />);
    expect(screen.getByTestId('puzzle-board')).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('shows show-solution button when playing', async () => {
    const puzzle = makePuzzle();
    render(<PuzzleBoard puzzle={puzzle} onComplete={vi.fn()} />);

    await waitFor(
      () => expect(screen.getByTestId('show-solution-button')).toBeInTheDocument(),
      { timeout: 2000 },
    );
  });

  it('renders board wrapper with flash class container', () => {
    const puzzle = makePuzzle();
    render(<PuzzleBoard puzzle={puzzle} onComplete={vi.fn()} />);
    expect(screen.getByTestId('board-wrapper')).toBeInTheDocument();
  });

  it('shows puzzle controls area when playing', async () => {
    const puzzle = makePuzzle();
    render(<PuzzleBoard puzzle={puzzle} onComplete={vi.fn()} />);

    await waitFor(
      () => expect(screen.getByTestId('puzzle-controls')).toBeInTheDocument(),
      { timeout: 2000 },
    );
  });
});
