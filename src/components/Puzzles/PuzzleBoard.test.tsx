import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '../../test/utils';
import { PuzzleBoard } from './PuzzleBoard';
import type { PuzzleRecord } from '../../types';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../../hooks/usePositionNarration', () => ({
  usePositionNarration: () => ({ narrate: vi.fn().mockResolvedValue(undefined), cancel: vi.fn(), isNarrating: false, currentText: '', error: null }),
}));
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

vi.mock('../Board/ControlledChessBoard', () => ({
  ControlledChessBoard: (props: Record<string, unknown>) => {
    const game = props.game as { fen?: string; boardOrientation?: string } | undefined;
    const interactive = props.interactive as boolean | undefined;
    return (
      <div
        data-testid="chess-board"
        data-fen={game?.fen ?? ''}
        data-orientation={game?.boardOrientation ?? 'white'}
        data-interactive={String(interactive ?? true)}
      >
        Board
      </div>
    );
  },
}));

vi.mock('../../hooks/useChessGame', () => ({
  useChessGame: (_initialFen?: string, initialOrientation: 'white' | 'black' = 'white') => ({
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    position: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    turn: 'w',
    inCheck: false,
    isCheck: false,
    checkSquare: null,
    isGameOver: false,
    isCheckmate: false,
    isStalemate: false,
    isDraw: false,
    lastMove: null,
    history: [],
    selectedSquare: null,
    legalMoves: [],
    boardOrientation: initialOrientation,
    makeMove: vi.fn().mockReturnValue(null),
    onDrop: vi.fn().mockReturnValue(null),
    onSquareClick: vi.fn().mockReturnValue(null),
    flipBoard: vi.fn(),
    setOrientation: vi.fn(),
    undoMove: vi.fn(),
    resetGame: vi.fn(),
    clearSelection: vi.fn(),
    getLegalMoves: vi.fn().mockReturnValue([]),
    getPiece: vi.fn().mockReturnValue(null),
    reset: vi.fn(),
    loadFen: vi.fn().mockReturnValue(true),
  }),
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
    warmup: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../hooks/useStruggleDetection', () => {
  const reset = vi.fn();
  return { useStruggleDetection: () => ({ reset }) };
});

vi.mock('../../services/tacticAlertService', () => ({
  recordTacticOutcome: vi.fn(),
}));

vi.mock('../../services/tacticClassifierService', () => ({
  getTacticTypeFromThemes: vi.fn().mockReturnValue(null),
  getPrimaryThemeLabel: vi.fn().mockReturnValue(null),
}));

vi.mock('../../stores/appStore', () => ({
  useAppStore: () => null,
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
    render(<PuzzleBoard puzzle={puzzle} onComplete={vi.fn()} surface="classic" />);
    expect(screen.getByTestId('puzzle-board')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    const puzzle = makePuzzle();
    render(<PuzzleBoard puzzle={puzzle} onComplete={vi.fn()} surface="classic" />);
    expect(screen.getByTestId('puzzle-loading')).toBeInTheDocument();
  });

  it('shows puzzle rating badge', () => {
    const puzzle = makePuzzle({ rating: 1500, themes: ['pin', 'middlegame'] });
    render(<PuzzleBoard puzzle={puzzle} onComplete={vi.fn()} surface="classic" />);
    expect(screen.getByTestId('puzzle-rating-badge')).toHaveTextContent('Difficulty: 1500');
  });

  it('orients board for user (black to move in FEN → user plays white)', () => {
    const puzzle = makePuzzle({
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    });
    render(<PuzzleBoard puzzle={puzzle} onComplete={vi.fn()} surface="classic" />);
    expect(screen.getByTestId('chess-board')).toHaveAttribute('data-orientation', 'white');
  });

  it('transitions from loading to playing after auto-play delay', async () => {
    const puzzle = makePuzzle();
    render(<PuzzleBoard puzzle={puzzle} onComplete={vi.fn()} surface="classic" />);

    expect(screen.getByTestId('puzzle-loading')).toBeInTheDocument();

    await waitFor(
      () => expect(screen.queryByTestId('puzzle-loading')).not.toBeInTheDocument(),
      { timeout: 2000 },
    );
  });

  it('renders board as non-interactive when disabled', () => {
    const puzzle = makePuzzle();
    const onComplete = vi.fn();
    render(<PuzzleBoard puzzle={puzzle} onComplete={onComplete} surface="classic" disabled />);
    expect(screen.getByTestId('puzzle-board')).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('shows show-solution button when playing', async () => {
    const puzzle = makePuzzle();
    render(<PuzzleBoard puzzle={puzzle} onComplete={vi.fn()} surface="classic" />);

    await waitFor(
      () => expect(screen.getByTestId('show-solution-button')).toBeInTheDocument(),
      { timeout: 2000 },
    );
  });

  it('renders board wrapper with flash class container', () => {
    const puzzle = makePuzzle();
    render(<PuzzleBoard puzzle={puzzle} onComplete={vi.fn()} surface="classic" />);
    expect(screen.getByTestId('board-wrapper')).toBeInTheDocument();
  });

  it('shows puzzle controls area when playing', async () => {
    const puzzle = makePuzzle();
    render(<PuzzleBoard puzzle={puzzle} onComplete={vi.fn()} surface="classic" />);

    await waitFor(
      () => expect(screen.getByTestId('puzzle-controls')).toBeInTheDocument(),
      { timeout: 2000 },
    );
  });
});

// Hand walk 2026-10-01: after a solve, swapping in the next puzzle spoke the
// NEW puzzle's whole solution ("rook to g1 … queen takes g1 …") before the
// student moved. Two real Lichess puzzles from that walk.
describe('PuzzleBoard — resolution belongs to one puzzle', () => {
  const solved = makePuzzle({
    id: '0Flch',
    fen: 'rn1qkb1r/pp2ppp1/3p1n1p/2pP4/4N3/2P5/PP2QPPP/RNB1K2R b KQkq - 1 9',
    moves: 'b8d7 e4d6',
    themes: ['mate', 'mateIn1', 'pin', 'smotheredMate'],
  });
  const next = makePuzzle({
    id: '0BoaI',
    fen: '5rk1/2p3rp/3p4/2pPpb2/2P1Np2/P4P2/4KQPq/RR6 b - - 1 28',
    moves: 'g7g2 b1g1 h2g1 a1g1 g2g1 f2g1',
    themes: ['advantage', 'long', 'middlegame', 'pin'],
  });

  it('never speaks the next puzzle while the student has not resolved it', async () => {
    const { voiceService } = await import('../../services/voiceService');
    const speak = vi.mocked(voiceService.speak);
    const { rerender } = render(<PuzzleBoard surface="classic" puzzle={solved} onComplete={vi.fn()} />);
    const show = await screen.findByTestId('show-solution-button', {}, { timeout: 2000 });
    act(() => { show.click(); });
    // Negative control: the resolved puzzle DOES teach, so the voice is live.
    await waitFor(() => expect(speak.mock.calls.length).toBeGreaterThan(0), { timeout: 4000 });
    const before = speak.mock.calls.length;

    rerender(<PuzzleBoard surface="classic" puzzle={next} onComplete={vi.fn()} />);
    await new Promise((r) => setTimeout(r, 1200));
    const spokenAfter = speak.mock.calls.slice(before).map((c) => c[0]);
    expect(spokenAfter.filter((t) => /g1/i.test(t))).toEqual([]);
  });
});
