import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '../../test/utils';
import { KingEscapeGame } from './KingEscapeGame';
import type { MoveResult } from '../../hooks/useChessGame';

// Capture the onMove callback
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

describe('KingEscapeGame', () => {
  beforeEach(() => {
    capturedOnMove = undefined;
  });

  it('renders intro screen initially', () => {
    render(<KingEscapeGame />);

    expect(screen.getByTestId('king-escape-game')).toBeInTheDocument();
    expect(screen.getByTestId('escape-intro')).toBeInTheDocument();
    expect(screen.getByTestId('escape-begin-btn')).toBeInTheDocument();
  });

  it('shows playing phase after clicking Begin', async () => {
    render(<KingEscapeGame />);

    fireEvent.click(screen.getByTestId('escape-begin-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('escape-playing')).toBeInTheDocument();
    });
    expect(screen.getByText(/Level 1 of 3/)).toBeInTheDocument();
    expect(screen.getByTestId('chess-board')).toBeInTheDocument();
  });

  it('passes level 1 FEN to ChessBoard', async () => {
    render(<KingEscapeGame />);
    fireEvent.click(screen.getByTestId('escape-begin-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('chess-board')).toBeInTheDocument();
    });

    const board = screen.getByTestId('chess-board');
    expect(board.getAttribute('data-fen')).toBe('7k/8/8/8/4r3/8/8/4K3 w - - 0 1');
  });

  it('shows highlights for level 1 (danger + safe)', async () => {
    render(<KingEscapeGame />);
    fireEvent.click(screen.getByTestId('escape-begin-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('chess-board')).toBeInTheDocument();
    });

    const board = screen.getByTestId('chess-board');
    const highlights = Number(board.getAttribute('data-highlights'));
    expect(highlights).toBeGreaterThan(0);
  });

  it('shows success phase when a legal move is made', async () => {
    render(<KingEscapeGame />);
    fireEvent.click(screen.getByTestId('escape-begin-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('escape-playing')).toBeInTheDocument();
    });

    act(() => {
      capturedOnMove?.({
        from: 'e1',
        to: 'd1',
        san: 'Kd1',
        fen: '7k/8/8/8/4r3/8/8/3K4 b - - 1 1',
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('escape-success')).toBeInTheDocument();
    });
    expect(screen.getByText('The King is Safe!')).toBeInTheDocument();
  });

  it('advances to level 2 after level 1 success', async () => {
    render(<KingEscapeGame />);
    fireEvent.click(screen.getByTestId('escape-begin-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('escape-playing')).toBeInTheDocument();
    });

    act(() => {
      capturedOnMove?.({
        from: 'e1',
        to: 'd1',
        san: 'Kd1',
        fen: '7k/8/8/8/4r3/8/8/3K4 b - - 1 1',
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('escape-success')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('escape-next-btn'));

    await waitFor(() => {
      expect(screen.getByText(/Level 2 of 3/)).toBeInTheDocument();
    });
  });

  it('shows complete phase after all 3 levels', async () => {
    render(<KingEscapeGame />);
    fireEvent.click(screen.getByTestId('escape-begin-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('escape-playing')).toBeInTheDocument();
    });

    // Level 1
    act(() => { capturedOnMove?.({ from: 'e1', to: 'd1', san: 'Kd1', fen: '' }); });
    await waitFor(() => { expect(screen.getByTestId('escape-success')).toBeInTheDocument(); });
    fireEvent.click(screen.getByTestId('escape-next-btn'));

    await waitFor(() => {
      expect(screen.getByText(/Level 2 of 3/)).toBeInTheDocument();
    });

    // Level 2
    act(() => { capturedOnMove?.({ from: 'e1', to: 'f2', san: 'Kf2', fen: '' }); });
    await waitFor(() => { expect(screen.getByTestId('escape-success')).toBeInTheDocument(); });
    fireEvent.click(screen.getByTestId('escape-next-btn'));

    await waitFor(() => {
      expect(screen.getByText(/Level 3 of 3/)).toBeInTheDocument();
    });

    // Level 3
    act(() => { capturedOnMove?.({ from: 'e1', to: 'f2', san: 'Kf2', fen: '' }); });
    await waitFor(() => { expect(screen.getByTestId('escape-success')).toBeInTheDocument(); });
    fireEvent.click(screen.getByTestId('escape-next-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('escape-complete')).toBeInTheDocument();
    });
    expect(screen.getByText('All Levels Complete!')).toBeInTheDocument();
  });

  it('has voice toggle button', () => {
    render(<KingEscapeGame />);
    expect(screen.getByTestId('escape-voice-toggle')).toBeInTheDocument();
  });

  it('has back button', () => {
    render(<KingEscapeGame />);
    expect(screen.getByTestId('escape-back-btn')).toBeInTheDocument();
  });
});
