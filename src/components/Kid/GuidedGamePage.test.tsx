import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { GuidedGamePage } from './GuidedGamePage';
import type { MoveResult } from '../../hooks/useChessGame';

// Track onMove callbacks so we can simulate player moves
let capturedOnMove: ((move: MoveResult) => void) | undefined;

vi.mock('../Board/ChessBoard', () => ({
  ChessBoard: ({
    initialFen,
    interactive,
    onMove,
    orientation,
  }: {
    initialFen?: string;
    interactive?: boolean;
    onMove?: (move: MoveResult) => void;
    orientation?: string;
  }) => {
    capturedOnMove = onMove;
    return (
      <div
        data-testid="chess-board"
        data-fen={initialFen}
        data-interactive={String(interactive)}
        data-orientation={orientation}
      >
        Board
      </div>
    );
  },
}));

vi.mock('../../services/voiceService', () => ({
  voiceService: {
    speak: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
  },
}));

vi.mock('./StarDisplay', () => ({
  StarDisplay: ({ earned, total }: { earned: number; total: number }) => (
    <div data-testid="star-display" data-earned={earned} data-total={total}>
      {earned}/{total} stars
    </div>
  ),
}));

// Mock react-router with gameId param
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ gameId: 'scholars-mate' }),
  };
});

function makeMoveResult(san: string): MoveResult {
  return {
    san,
    from: 'a1',
    to: 'a2',
    fen: 'test-fen',
  };
}

describe('GuidedGamePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    capturedOnMove = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the intro phase with game title', () => {
    render(<GuidedGamePage />);
    expect(screen.getAllByText('The Scholar\'s Surprise').length).toBeGreaterThan(0);
    expect(screen.getByTestId('guided-game-start')).toBeInTheDocument();
  });

  it('shows game description and difficulty', () => {
    render(<GuidedGamePage />);
    expect(screen.getByText('Learn the famous 4-move checkmate!')).toBeInTheDocument();
    expect(screen.getByText(/~2 min/)).toBeInTheDocument();
    expect(screen.getByText(/You play as White/)).toBeInTheDocument();
  });

  it('transitions to playing phase on start', async () => {
    render(<GuidedGamePage />);
    fireEvent.click(screen.getByTestId('guided-game-start'));

    await waitFor(() => {
      expect(screen.getByTestId('chess-board')).toBeInTheDocument();
    });
    expect(screen.getByText(/Your turn/)).toBeInTheDocument();
  });

  it('shows narration text when playing', async () => {
    render(<GuidedGamePage />);
    fireEvent.click(screen.getByTestId('guided-game-start'));

    await waitFor(() => {
      expect(screen.getByTestId('guided-game-narration')).toBeInTheDocument();
    });
  });

  it('shows correct feedback when player makes the right move', async () => {
    render(<GuidedGamePage />);
    fireEvent.click(screen.getByTestId('guided-game-start'));

    await waitFor(() => {
      expect(capturedOnMove).toBeDefined();
    });

    // Play e4 (correct first move for Scholar's Mate)
    if (capturedOnMove) capturedOnMove(makeMoveResult('e4'));

    await waitFor(() => {
      expect(screen.getByTestId('guided-game-correct')).toBeInTheDocument();
    });
  });

  it('shows wrong feedback for incorrect move', async () => {
    render(<GuidedGamePage />);
    fireEvent.click(screen.getByTestId('guided-game-start'));

    await waitFor(() => {
      expect(capturedOnMove).toBeDefined();
    });

    // Play d4 (wrong — expected e4)
    if (capturedOnMove) capturedOnMove(makeMoveResult('d4'));

    await waitFor(() => {
      expect(screen.getByTestId('guided-game-wrong')).toBeInTheDocument();
    });
  });

  it('board is oriented to player color', async () => {
    render(<GuidedGamePage />);
    fireEvent.click(screen.getByTestId('guided-game-start'));

    await waitFor(() => {
      const board = screen.getByTestId('chess-board');
      expect(board.getAttribute('data-orientation')).toBe('white');
    });
  });

  it('has voice toggle button', () => {
    render(<GuidedGamePage />);
    expect(screen.getByTestId('guided-game-voice-toggle')).toBeInTheDocument();
  });

  it('back button navigates to hub', () => {
    render(<GuidedGamePage />);
    fireEvent.click(screen.getByTestId('guided-game-start'));
    fireEvent.click(screen.getByTestId('guided-game-back'));
    expect(mockNavigate).toHaveBeenCalledWith('/kid/play-games');
  });

  it('shows progress bar during play', async () => {
    render(<GuidedGamePage />);
    fireEvent.click(screen.getByTestId('guided-game-start'));

    await waitFor(() => {
      expect(screen.getByText('0/7')).toBeInTheDocument();
    });
  });

  it('shows star display during play', async () => {
    render(<GuidedGamePage />);
    fireEvent.click(screen.getByTestId('guided-game-start'));

    await waitFor(() => {
      const starDisplay = screen.getByTestId('star-display');
      expect(starDisplay.getAttribute('data-earned')).toBe('0');
      expect(starDisplay.getAttribute('data-total')).toBe('3');
    });
  });
});
