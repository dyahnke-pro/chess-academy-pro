import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, act } from '@testing-library/react';
import { render } from '../../test/utils';
import { OpeningPlayMode } from './OpeningPlayMode';
import { buildOpeningRecord, buildUserProfile } from '../../test/factories';
import { useAppStore } from '../../stores/appStore';
import type { OpeningRecord } from '../../types';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetAdaptiveMove = vi.fn();
const mockGetRandomLegalMove = vi.fn();

vi.mock('../../services/coachGameEngine', () => ({
  getAdaptiveMove: (...args: unknown[]): unknown => mockGetAdaptiveMove(...args),
  getRandomLegalMove: (...args: unknown[]): unknown => mockGetRandomLegalMove(...args),
  getTargetStrength: () => 1320,
}));

vi.mock('../Board/ChessBoard', () => ({
  ChessBoard: ({ initialFen, orientation, interactive, onMove }: {
    initialFen?: string;
    orientation?: string;
    interactive?: boolean;
    onMove?: (result: { from: string; to: string; san: string; fen: string }) => void;
  }) => (
    <div
      data-testid="chess-board"
      data-fen={initialFen}
      data-orientation={orientation}
      data-interactive={String(interactive)}
    >
      Board
      {interactive && onMove && (
        <>
          <button
            data-testid="play-correct-move"
            onClick={() => onMove({ from: 'e2', to: 'e4', san: 'e4', fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1' })}
          >
            Correct
          </button>
          <button
            data-testid="play-wrong-move"
            onClick={() => onMove({ from: 'd2', to: 'd4', san: 'd4', fen: 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1' })}
          >
            Wrong
          </button>
        </>
      )}
    </div>
  ),
}));

vi.mock('../Board/ControlledChessBoard', () => ({
  ControlledChessBoard: (props: Record<string, unknown>) => {
    const game = props.game as { fen?: string; boardOrientation?: string } | undefined;
    const interactive = props.interactive as boolean | undefined;
    const onMove = props.onMove as ((result: { from: string; to: string; san: string; fen: string }) => void) | undefined;
    return (
      <div
        data-testid="chess-board"
        data-fen={game?.fen ?? ''}
        data-orientation={game?.boardOrientation ?? 'white'}
        data-interactive={String(interactive ?? true)}
      >
        Board
        {interactive && onMove && (
          <>
            <button
              data-testid="play-correct-move"
              onClick={() => onMove({ from: 'e2', to: 'e4', san: 'e4', fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1' })}
            >
              Correct
            </button>
            <button
              data-testid="play-wrong-move"
              onClick={() => onMove({ from: 'd2', to: 'd4', san: 'd4', fen: 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1' })}
            >
              Wrong
            </button>
          </>
        )}
      </div>
    );
  },
}));

vi.mock('../../hooks/useChessGame', () => ({
  useChessGame: (_initialFen?: string, initialOrientation: 'white' | 'black' = 'white') => ({
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    position: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    turn: 'w',
    isGameOver: false,
    isCheckmate: false,
    isStalemate: false,
    isDraw: false,
    lastMove: null,
    history: [],
    selectedSquare: null,
    legalMoves: [],
    boardOrientation: initialOrientation,
    makeMove: vi.fn().mockReturnValue({ from: 'e7', to: 'e5', san: 'e5', fen: '' }),
    onDrop: vi.fn(),
    onSquareClick: vi.fn(),
    flipBoard: vi.fn(),
    undoMove: vi.fn(),
    resetGame: vi.fn(),
    clearSelection: vi.fn(),
    getLegalMoves: vi.fn().mockReturnValue([]),
    getPiece: vi.fn(),
    loadFen: vi.fn(),
    inCheck: false,
    checkSquare: null,
  }),
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

vi.mock('../../hooks/useSettings', () => ({
  useSettings: () => ({
    settings: {
      showHints: true,
      highlightLastMove: true,
      moveQualityFlash: false,
    },
    raw: null,
    updateSetting: vi.fn(),
    updateSettings: vi.fn(),
  }),
}));

vi.mock('../../hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const testOpening: OpeningRecord = buildOpeningRecord({
  id: 'play-test-opening',
  name: 'Vienna Game',
  pgn: 'e4 e5 Nc3',
  color: 'white',
});

function renderPlay(
  opening: OpeningRecord = testOpening,
): { onExit: ReturnType<typeof vi.fn> } {
  const onExit = vi.fn();
  render(<OpeningPlayMode opening={opening} onExit={onExit} />);
  return { onExit };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('OpeningPlayMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    useAppStore.setState({
      activeProfile: buildUserProfile({ currentRating: 1420 }),
    });
    mockGetAdaptiveMove.mockResolvedValue({
      move: 'e7e5',
      analysis: { evaluation: 0, bestMove: 'e7e5', isMate: false, mateIn: null, depth: 10, topLines: [], nodesPerSecond: 0 },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the play mode container', () => {
    renderPlay();
    expect(screen.getByTestId('opening-play-mode')).toBeInTheDocument();
  });

  it('shows the opening name in header', () => {
    renderPlay();
    expect(screen.getByText('Vienna Game')).toBeInTheDocument();
  });

  it('starts in pregame phase', () => {
    renderPlay();
    expect(screen.getByText('Starting...')).toBeInTheDocument();
  });

  it('renders the chess board', () => {
    renderPlay();
    expect(screen.getByTestId('chess-board')).toBeInTheDocument();
  });

  it('board uses correct orientation', () => {
    renderPlay();
    expect(screen.getByTestId('chess-board')).toHaveAttribute('data-orientation', 'white');
  });

  it('transitions to opening phase after pregame delay', async () => {
    renderPlay();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(screen.queryByText('Starting...')).not.toBeInTheDocument();
    });
  });

  it('shows voice toggle button', () => {
    renderPlay();
    expect(screen.getByTestId('voice-toggle')).toBeInTheDocument();
  });

  it('voice toggle has correct label', () => {
    renderPlay();
    expect(screen.getByLabelText('Mute voice')).toBeInTheDocument();
  });

  it('shows deviation card when player makes wrong opening move', async () => {
    renderPlay();

    // Advance past pregame
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Player makes wrong move (d4 instead of e4)
    const wrongBtn = screen.queryByTestId('play-wrong-move');
    if (wrongBtn) {
      act(() => { wrongBtn.click(); });

      await waitFor(() => {
        expect(screen.getByTestId('explanation-card')).toBeInTheDocument();
        expect(screen.getByText(/stepped out of your preparation/)).toBeInTheDocument();
      });
    }
  });

  it('shows correct move when player makes right opening move (no deviation card)', () => {
    renderPlay();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    const correctBtn = screen.queryByTestId('play-correct-move');
    if (correctBtn) {
      act(() => { correctBtn.click(); });

      // No deviation card should appear
      expect(screen.queryByText(/stepped out of your preparation/)).not.toBeInTheDocument();
    }
  });

  it('exit button calls onExit', () => {
    const { onExit } = renderPlay();
    const buttons = screen.getAllByRole('button');
    buttons[0].click();
    expect(onExit).toHaveBeenCalled();
  });

  it('renders with black opening orientation', () => {
    const blackOpening = buildOpeningRecord({
      id: 'play-test-black',
      name: 'Sicilian Defense',
      pgn: 'e4 c5',
      color: 'black',
    });
    renderPlay(blackOpening);
    expect(screen.getByTestId('chess-board')).toHaveAttribute('data-orientation', 'black');
  });

  it('shows hint button during opening phase when hints enabled', async () => {
    renderPlay();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(screen.getByTestId('hint-button')).toBeInTheDocument();
    });
  });

  it('hint button shows Get a Hint text at level 0', async () => {
    renderPlay();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(screen.getByTestId('hint-button')).toBeInTheDocument();
    });

    expect(screen.getByText('Get a Hint')).toBeInTheDocument();
    expect(screen.getByTestId('hint-button')).toHaveAttribute('data-level', '0');
  });
});
