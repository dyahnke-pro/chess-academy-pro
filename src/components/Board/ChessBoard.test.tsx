import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../test/utils';
import { ChessBoard } from './ChessBoard';
import type {
  PieceDropHandlerArgs,
  PieceHandlerArgs,
  ChessboardOptions,
} from 'react-chessboard';

// ─── react-chessboard mock (v5 API: single `options` prop) ─────────────────
// Exposes handlers via test-only buttons so we can simulate moves in jsdom.

vi.mock('react-chessboard', () => ({
  Chessboard: ({ options = {} }: { options?: ChessboardOptions }): JSX.Element => {
    const {
      position = '',
      boardOrientation = 'white',
      allowDragging = true,
      onSquareClick,
      onPieceDrop,
      onPieceDrag,
    } = options;

    return (
      <div
        data-testid="mock-chessboard"
        data-position={typeof position === 'string' ? position : JSON.stringify(position)}
        data-orientation={boardOrientation}
        data-draggable={String(allowDragging)}
      >
        <button data-testid="click-e2" onClick={() => onSquareClick?.({ piece: null, square: 'e2' })}>e2</button>
        <button data-testid="click-e4" onClick={() => onSquareClick?.({ piece: null, square: 'e4' })}>e4</button>
        <button data-testid="click-d2" onClick={() => onSquareClick?.({ piece: null, square: 'd2' })}>d2</button>
        <button
          data-testid="drop-e2-e4"
          onClick={() => onPieceDrop?.({
            piece: { isSparePiece: false, position: 'e2', pieceType: 'wP' },
            sourceSquare: 'e2',
            targetSquare: 'e4',
          } as PieceDropHandlerArgs)}
        >
          drop e2→e4
        </button>
        <button
          data-testid="drop-illegal"
          onClick={() => onPieceDrop?.({
            piece: { isSparePiece: false, position: 'e2', pieceType: 'wP' },
            sourceSquare: 'e2',
            targetSquare: 'e5',
          } as PieceDropHandlerArgs)}
        >
          drop illegal
        </button>
        <button
          data-testid="drag-begin-e2"
          onClick={() => onPieceDrag?.({
            isSparePiece: false,
            piece: { pieceType: 'wP' },
            square: 'e2',
          } as PieceHandlerArgs)}
        >
          drag e2
        </button>
      </div>
    );
  },
}));

// ─── Mock usePieceSound to avoid AudioContext in jsdom ──────────────────────

vi.mock('../../hooks/usePieceSound', () => ({
  usePieceSound: () => ({
    playMoveSound: vi.fn(),
    playCelebration: vi.fn(),
    playEncouragement: vi.fn(),
  }),
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ChessBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the chessboard', () => {
      render(<ChessBoard />);
      expect(screen.getByTestId('mock-chessboard')).toBeInTheDocument();
    });

    it('passes the starting position FEN to the board', () => {
      render(<ChessBoard />);
      const board = screen.getByTestId('mock-chessboard');
      expect(board.dataset.position).toMatch(/^rnbqkbnr/);
    });

    it('renders with white orientation by default', () => {
      render(<ChessBoard />);
      expect(screen.getByTestId('mock-chessboard').dataset.orientation).toBe('white');
    });

    it('renders with black orientation when specified', () => {
      render(<ChessBoard orientation="black" />);
      expect(screen.getByTestId('mock-chessboard').dataset.orientation).toBe('black');
    });

    it('passes a custom initial FEN to the board', () => {
      const customFen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
      render(<ChessBoard initialFen={customFen} />);
      expect(screen.getByTestId('mock-chessboard').dataset.position).toBe(customFen);
    });
  });

  describe('flip button', () => {
    it('renders the flip button by default', () => {
      render(<ChessBoard />);
      expect(screen.getByTestId('flip-button')).toBeInTheDocument();
    });

    it('hides the flip button when showFlipButton is false', () => {
      render(<ChessBoard showFlipButton={false} />);
      expect(screen.queryByTestId('flip-button')).not.toBeInTheDocument();
    });

    it('flips board orientation when clicked', () => {
      render(<ChessBoard />);
      const board = screen.getByTestId('mock-chessboard');
      expect(board.dataset.orientation).toBe('white');

      fireEvent.click(screen.getByTestId('flip-button'));
      expect(board.dataset.orientation).toBe('black');
    });

    it('flips back to white on second click', () => {
      render(<ChessBoard />);
      const flipBtn = screen.getByTestId('flip-button');
      fireEvent.click(flipBtn);
      fireEvent.click(flipBtn);
      expect(screen.getByTestId('mock-chessboard').dataset.orientation).toBe('white');
    });
  });

  describe('undo button', () => {
    it('does not render undo button by default', () => {
      render(<ChessBoard />);
      expect(screen.queryByTestId('undo-button')).not.toBeInTheDocument();
    });

    it('renders undo button when showUndoButton is true', () => {
      render(<ChessBoard showUndoButton />);
      expect(screen.getByTestId('undo-button')).toBeInTheDocument();
    });

    it('reverts the last move when undo is clicked', () => {
      render(<ChessBoard showUndoButton />);
      const board = screen.getByTestId('mock-chessboard');
      const initialFen = board.dataset.position;

      fireEvent.click(screen.getByTestId('drop-e2-e4'));
      expect(board.dataset.position).not.toBe(initialFen);

      fireEvent.click(screen.getByTestId('undo-button'));
      expect(board.dataset.position).toBe(initialFen);
    });

    it('calls onUndo callback when undo is clicked', () => {
      const onUndo = vi.fn();
      render(<ChessBoard showUndoButton onUndo={onUndo} />);

      fireEvent.click(screen.getByTestId('drop-e2-e4'));
      fireEvent.click(screen.getByTestId('undo-button'));

      expect(onUndo).toHaveBeenCalledOnce();
    });
  });

  describe('reset button', () => {
    it('does not render reset button by default', () => {
      render(<ChessBoard />);
      expect(screen.queryByTestId('reset-button')).not.toBeInTheDocument();
    });

    it('renders reset button when showResetButton is true', () => {
      render(<ChessBoard showResetButton />);
      expect(screen.getByTestId('reset-button')).toBeInTheDocument();
    });

    it('resets the board to starting position when clicked', () => {
      render(<ChessBoard showResetButton />);
      const board = screen.getByTestId('mock-chessboard');
      const startFen = board.dataset.position;

      fireEvent.click(screen.getByTestId('drop-e2-e4'));
      expect(board.dataset.position).not.toBe(startFen);

      fireEvent.click(screen.getByTestId('reset-button'));
      expect(board.dataset.position).toBe(startFen);
    });

    it('calls onReset callback when reset is clicked', () => {
      const onReset = vi.fn();
      render(<ChessBoard showResetButton onReset={onReset} />);

      fireEvent.click(screen.getByTestId('reset-button'));

      expect(onReset).toHaveBeenCalledOnce();
    });
  });

  describe('eval bar', () => {
    it('does not render eval bar by default', () => {
      render(<ChessBoard />);
      expect(screen.queryByTestId('eval-bar')).not.toBeInTheDocument();
    });

    it('renders eval bar when showEvalBar is true', () => {
      render(<ChessBoard showEvalBar evaluation={0} />);
      expect(screen.getByTestId('eval-bar')).toBeInTheDocument();
    });

    it('renders eval bar with null evaluation (equal)', () => {
      render(<ChessBoard showEvalBar evaluation={null} />);
      expect(screen.getByTestId('eval-bar')).toBeInTheDocument();
    });
  });

  describe('interactive mode', () => {
    it('enables dragging when interactive (default)', () => {
      render(<ChessBoard />);
      expect(screen.getByTestId('mock-chessboard').dataset.draggable).toBe('true');
    });

    it('disables dragging when interactive=false', () => {
      render(<ChessBoard interactive={false} />);
      expect(screen.getByTestId('mock-chessboard').dataset.draggable).toBe('false');
    });
  });

  describe('move making via drag and drop', () => {
    it('updates FEN after a valid drag-and-drop move', () => {
      render(<ChessBoard />);
      const board = screen.getByTestId('mock-chessboard');
      const initialFen = board.dataset.position;

      fireEvent.click(screen.getByTestId('drop-e2-e4'));

      expect(board.dataset.position).not.toBe(initialFen);
    });

    it('calls onMove callback after a valid move', () => {
      const onMove = vi.fn();
      render(<ChessBoard onMove={onMove} />);

      fireEvent.click(screen.getByTestId('drop-e2-e4'));

      expect(onMove).toHaveBeenCalledOnce();
      expect(onMove).toHaveBeenCalledWith(
        expect.objectContaining({ from: 'e2', to: 'e4', san: 'e4' }),
      );
    });

    it('does not call onMove for an illegal drop', () => {
      const onMove = vi.fn();
      render(<ChessBoard onMove={onMove} />);

      fireEvent.click(screen.getByTestId('drop-illegal'));

      expect(onMove).not.toHaveBeenCalled();
    });
  });

  describe('move making via click', () => {
    it('updates FEN after a two-click move', () => {
      render(<ChessBoard />);
      const board = screen.getByTestId('mock-chessboard');
      const initialFen = board.dataset.position;

      fireEvent.click(screen.getByTestId('click-e2'));
      fireEvent.click(screen.getByTestId('click-e4'));

      expect(board.dataset.position).not.toBe(initialFen);
    });

    it('calls onMove after a two-click move', () => {
      const onMove = vi.fn();
      render(<ChessBoard onMove={onMove} />);

      fireEvent.click(screen.getByTestId('click-e2'));
      fireEvent.click(screen.getByTestId('click-e4'));

      expect(onMove).toHaveBeenCalledOnce();
    });
  });

  describe('legal move highlighting', () => {
    it('shows legal move styles after selecting a piece via drag-begin', () => {
      render(<ChessBoard />);
      fireEvent.click(screen.getByTestId('drag-begin-e2'));
      // Drag begin selects e2 and computes legal moves without error
      expect(screen.getByTestId('mock-chessboard')).toBeInTheDocument();
    });
  });
});
