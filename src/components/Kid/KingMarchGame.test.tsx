import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '../../test/utils';
import { KingMarchGame } from './KingMarchGame';
import type { MoveResult } from '../../hooks/useChessGame';

let capturedOnMove: ((move: MoveResult) => void) | undefined;

vi.mock('../Board/ChessBoard', () => ({
  ChessBoard: ({
    initialFen,
    onMove,
    annotationHighlights,
  }: {
    initialFen?: string;
    onMove?: (move: MoveResult) => void;
    annotationHighlights?: Array<{ square: string; color: string }>;
  }) => {
    capturedOnMove = onMove;
    return (
      <div
        data-testid="chess-board"
        data-fen={initialFen}
        data-highlights={annotationHighlights ? annotationHighlights.length : 0}
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

describe('KingMarchGame', () => {
  beforeEach(() => {
    capturedOnMove = undefined;
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders intro screen initially', () => {
    render(<KingMarchGame />);

    expect(screen.getByTestId('king-march-game')).toBeInTheDocument();
    expect(screen.getByTestId('march-intro')).toBeInTheDocument();
    expect(screen.getByTestId('march-begin-btn')).toBeInTheDocument();
  });

  it('shows playing phase after clicking Begin', async () => {
    render(<KingMarchGame />);
    fireEvent.click(screen.getByTestId('march-begin-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('march-playing')).toBeInTheDocument();
    });
    expect(screen.getByText(/Level 1 of 3/)).toBeInTheDocument();
    expect(screen.getByTestId('chess-board')).toBeInTheDocument();
  });

  it('passes level 1 FEN to ChessBoard', async () => {
    render(<KingMarchGame />);
    fireEvent.click(screen.getByTestId('march-begin-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('chess-board')).toBeInTheDocument();
    });

    const board = screen.getByTestId('chess-board');
    expect(board.getAttribute('data-fen')).toBe('k7/8/8/6b1/8/1b6/8/4K3 w - - 0 1');
  });

  it('shows goal marker overlay', async () => {
    render(<KingMarchGame />);
    fireEvent.click(screen.getByTestId('march-begin-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('march-goal-marker')).toBeInTheDocument();
    });
  });

  it('shows move counter', async () => {
    render(<KingMarchGame />);
    fireEvent.click(screen.getByTestId('march-begin-btn'));

    await waitFor(() => {
      expect(screen.getByText('Moves: 0')).toBeInTheDocument();
    });
  });

  it('increments move counter on valid move', async () => {
    render(<KingMarchGame />);
    fireEvent.click(screen.getByTestId('march-begin-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('march-playing')).toBeInTheDocument();
    });

    // Move king from e1 to e2 (valid, not a capture)
    act(() => {
      capturedOnMove?.({
        from: 'e1',
        to: 'e2',
        san: 'Ke2',
        fen: 'k7/8/8/6b1/8/1b6/4K3/8 b - - 1 1',
      });
    });

    expect(screen.getByText('Moves: 1')).toBeInTheDocument();
  });

  it('shows success when king reaches e8', async () => {
    render(<KingMarchGame />);
    fireEvent.click(screen.getByTestId('march-begin-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('march-playing')).toBeInTheDocument();
    });

    // Simulate king reaching e8
    act(() => {
      capturedOnMove?.({
        from: 'd7',
        to: 'e8',
        san: 'Ke8',
        fen: 'k3K3/8/8/6b1/8/1b6/8/8 b - - 7 4',
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('march-success')).toBeInTheDocument();
    });
    expect(screen.getByText('The King Made It!')).toBeInTheDocument();
  });

  it('rejects capture moves with feedback', async () => {
    render(<KingMarchGame />);
    fireEvent.click(screen.getByTestId('march-begin-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('march-playing')).toBeInTheDocument();
    });

    // Now enable fake timers after async transitions are done
    vi.useFakeTimers();

    // The level 1 FEN has bishop on b3. King tries to capture it:
    act(() => {
      capturedOnMove?.({
        from: 'c2',
        to: 'b3',
        san: 'Kxb3',
        fen: 'k7/8/8/6b1/8/1K6/8/8 b - - 0 1',
      });
    });

    expect(screen.getByTestId('march-feedback')).toBeInTheDocument();
    expect(screen.getByText('Go around the pieces!')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('advances to level 2 after completing level 1', async () => {
    render(<KingMarchGame />);
    fireEvent.click(screen.getByTestId('march-begin-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('march-playing')).toBeInTheDocument();
    });

    act(() => {
      capturedOnMove?.({
        from: 'd7',
        to: 'e8',
        san: 'Ke8',
        fen: 'k3K3/8/8/6b1/8/1b6/8/8 b - - 7 4',
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('march-success')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('march-next-btn'));

    await waitFor(() => {
      expect(screen.getByText(/Level 2 of 3/)).toBeInTheDocument();
    });
  });

  it('shows complete phase after all 3 levels', async () => {
    render(<KingMarchGame />);
    fireEvent.click(screen.getByTestId('march-begin-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('march-playing')).toBeInTheDocument();
    });

    // Level 1
    act(() => { capturedOnMove?.({ from: 'd7', to: 'e8', san: 'Ke8', fen: '' }); });
    await waitFor(() => { expect(screen.getByTestId('march-success')).toBeInTheDocument(); });
    fireEvent.click(screen.getByTestId('march-next-btn'));

    await waitFor(() => {
      expect(screen.getByText(/Level 2 of 3/)).toBeInTheDocument();
    });

    // Level 2
    act(() => { capturedOnMove?.({ from: 'f8', to: 'e8', san: 'Ke8', fen: '' }); });
    await waitFor(() => { expect(screen.getByTestId('march-success')).toBeInTheDocument(); });
    fireEvent.click(screen.getByTestId('march-next-btn'));

    await waitFor(() => {
      expect(screen.getByText(/Level 3 of 3/)).toBeInTheDocument();
    });

    // Level 3
    act(() => { capturedOnMove?.({ from: 'f8', to: 'e8', san: 'Ke8', fen: '' }); });
    await waitFor(() => { expect(screen.getByTestId('march-success')).toBeInTheDocument(); });
    fireEvent.click(screen.getByTestId('march-next-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('march-complete')).toBeInTheDocument();
    });
    expect(screen.getByText('All Levels Complete!')).toBeInTheDocument();
  });

  it('has restart button', async () => {
    render(<KingMarchGame />);
    fireEvent.click(screen.getByTestId('march-begin-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('march-restart-btn')).toBeInTheDocument();
    });
  });

  it('restart resets move counter', async () => {
    render(<KingMarchGame />);
    fireEvent.click(screen.getByTestId('march-begin-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('march-playing')).toBeInTheDocument();
    });

    // Make a move
    act(() => {
      capturedOnMove?.({
        from: 'e1',
        to: 'e2',
        san: 'Ke2',
        fen: 'k7/8/8/6b1/8/1b6/4K3/8 b - - 1 1',
      });
    });

    expect(screen.getByText('Moves: 1')).toBeInTheDocument();

    // Restart
    fireEvent.click(screen.getByTestId('march-restart-btn'));

    expect(screen.getByText('Moves: 0')).toBeInTheDocument();
  });

  it('has voice toggle button', () => {
    render(<KingMarchGame />);
    expect(screen.getByTestId('march-voice-toggle')).toBeInTheDocument();
  });

  it('has back button', () => {
    render(<KingMarchGame />);
    expect(screen.getByTestId('march-back-btn')).toBeInTheDocument();
  });

  it('shows highlights including goal square for level 1', async () => {
    render(<KingMarchGame />);
    fireEvent.click(screen.getByTestId('march-begin-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('chess-board')).toBeInTheDocument();
    });

    const board = screen.getByTestId('chess-board');
    const highlights = Number(board.getAttribute('data-highlights'));
    // Level 1 shows danger, safe, and goal highlights
    expect(highlights).toBeGreaterThan(0);
  });
});
