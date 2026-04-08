import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../test/utils';
import { ControlledChessBoard } from './ControlledChessBoard';
import type { UseChessGameReturn, MoveResult } from '../../hooks/useChessGame';
import type {
  PieceDropHandlerArgs,
  PieceHandlerArgs,
  ChessboardOptions,
} from 'react-chessboard';

// ─── react-chessboard mock (v5 API: single `options` prop) ─────────────────

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
        <button
          data-testid="drop-e2-e4"
          onClick={() => onPieceDrop?.({
            piece: { isSparePiece: false, position: 'e2', pieceType: 'wP' },
            sourceSquare: 'e2',
            targetSquare: 'e4',
          } as PieceDropHandlerArgs)}
        >
          drop e2-e4
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

vi.mock('../../hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('../../hooks/usePieceSound', () => ({
  usePieceSound: () => ({
    playMoveSound: vi.fn(),
    playCelebration: vi.fn(),
    playEncouragement: vi.fn(),
  }),
}));

// ─── Test helpers ───────────────────────────────────────────────────────────

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function buildMockGame(overrides: Partial<UseChessGameReturn> = {}): UseChessGameReturn {
  return {
    fen: START_FEN,
    position: START_FEN,
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
    boardOrientation: 'white',
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
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ControlledChessBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the chessboard with game position', () => {
      const game = buildMockGame();
      render(<ControlledChessBoard game={game} />);
      expect(screen.getByTestId('mock-chessboard')).toBeInTheDocument();
      expect(screen.getByTestId('mock-chessboard').dataset.position).toBe(START_FEN);
    });

    it('renders with game boardOrientation', () => {
      const game = buildMockGame({ boardOrientation: 'black' });
      render(<ControlledChessBoard game={game} />);
      expect(screen.getByTestId('mock-chessboard').dataset.orientation).toBe('black');
    });

    it('renders with custom FEN from game', () => {
      const customFen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
      const game = buildMockGame({ fen: customFen, position: customFen });
      render(<ControlledChessBoard game={game} />);
      expect(screen.getByTestId('mock-chessboard').dataset.position).toBe(customFen);
    });
  });

  describe('flip button', () => {
    it('renders the flip button by default', () => {
      render(<ControlledChessBoard game={buildMockGame()} />);
      expect(screen.getByTestId('flip-button')).toBeInTheDocument();
    });

    it('hides the flip button when showFlipButton is false', () => {
      render(<ControlledChessBoard game={buildMockGame()} showFlipButton={false} />);
      expect(screen.queryByTestId('flip-button')).not.toBeInTheDocument();
    });

    it('calls game.flipBoard when clicked', () => {
      const game = buildMockGame();
      render(<ControlledChessBoard game={game} />);
      fireEvent.click(screen.getByTestId('flip-button'));
      expect(game.flipBoard).toHaveBeenCalledOnce();
    });
  });

  describe('undo button', () => {
    it('does not render undo button by default', () => {
      render(<ControlledChessBoard game={buildMockGame()} />);
      expect(screen.queryByTestId('undo-button')).not.toBeInTheDocument();
    });

    it('renders undo button when showUndoButton is true', () => {
      render(<ControlledChessBoard game={buildMockGame()} showUndoButton />);
      expect(screen.getByTestId('undo-button')).toBeInTheDocument();
    });

    it('calls game.undoMove and onUndo when clicked', () => {
      const game = buildMockGame();
      const onUndo = vi.fn();
      render(<ControlledChessBoard game={game} showUndoButton onUndo={onUndo} />);

      fireEvent.click(screen.getByTestId('undo-button'));
      expect(game.undoMove).toHaveBeenCalledOnce();
      expect(onUndo).toHaveBeenCalledOnce();
    });
  });

  describe('reset button', () => {
    it('does not render reset button by default', () => {
      render(<ControlledChessBoard game={buildMockGame()} />);
      expect(screen.queryByTestId('reset-button')).not.toBeInTheDocument();
    });

    it('renders reset button when showResetButton is true', () => {
      render(<ControlledChessBoard game={buildMockGame()} showResetButton />);
      expect(screen.getByTestId('reset-button')).toBeInTheDocument();
    });

    it('calls game.resetGame and onReset when clicked', () => {
      const game = buildMockGame();
      const onReset = vi.fn();
      render(<ControlledChessBoard game={game} showResetButton onReset={onReset} />);

      fireEvent.click(screen.getByTestId('reset-button'));
      expect(game.resetGame).toHaveBeenCalledOnce();
      expect(onReset).toHaveBeenCalledOnce();
    });
  });

  describe('interactive mode', () => {
    it('enables dragging when interactive (default)', () => {
      render(<ControlledChessBoard game={buildMockGame()} />);
      expect(screen.getByTestId('mock-chessboard').dataset.draggable).toBe('true');
    });

    it('disables dragging when interactive=false', () => {
      render(<ControlledChessBoard game={buildMockGame()} interactive={false} />);
      expect(screen.getByTestId('mock-chessboard').dataset.draggable).toBe('false');
    });
  });

  describe('move making via drag and drop', () => {
    it('calls game.onDrop and onMove for a valid drop', () => {
      const moveResult: MoveResult = { from: 'e2', to: 'e4', san: 'e4', fen: 'new-fen' };
      const game = buildMockGame({ onDrop: vi.fn().mockReturnValue(moveResult) });
      const onMove = vi.fn();

      render(<ControlledChessBoard game={game} onMove={onMove} />);
      fireEvent.click(screen.getByTestId('drop-e2-e4'));

      expect(game.onDrop).toHaveBeenCalledWith('e2', 'e4');
      expect(onMove).toHaveBeenCalledWith(moveResult);
    });

    it('calls game.clearSelection for an illegal drop', () => {
      const game = buildMockGame({ onDrop: vi.fn().mockReturnValue(null) });
      const onMove = vi.fn();

      render(<ControlledChessBoard game={game} onMove={onMove} />);
      fireEvent.click(screen.getByTestId('drop-illegal'));

      expect(onMove).not.toHaveBeenCalled();
      expect(game.clearSelection).toHaveBeenCalled();
    });

    it('does not call game.onDrop when not interactive', () => {
      const game = buildMockGame();

      render(<ControlledChessBoard game={game} interactive={false} />);
      fireEvent.click(screen.getByTestId('drop-e2-e4'));

      expect(game.onDrop).not.toHaveBeenCalled();
      expect(game.clearSelection).toHaveBeenCalled();
    });
  });

  describe('move making via click', () => {
    it('calls game.onSquareClick on square click', () => {
      const game = buildMockGame();
      render(<ControlledChessBoard game={game} />);

      fireEvent.click(screen.getByTestId('click-e2'));
      expect(game.onSquareClick).toHaveBeenCalledWith('e2');
    });

    it('calls onMove when game.onSquareClick returns a result', () => {
      const moveResult: MoveResult = { from: 'e2', to: 'e4', san: 'e4', fen: 'new-fen' };
      const game = buildMockGame({ onSquareClick: vi.fn().mockReturnValue(moveResult) });
      const onMove = vi.fn();

      render(<ControlledChessBoard game={game} onMove={onMove} />);
      fireEvent.click(screen.getByTestId('click-e2'));

      expect(onMove).toHaveBeenCalledWith(moveResult);
    });

    it('does not call onSquareClick when not interactive', () => {
      const game = buildMockGame();
      render(<ControlledChessBoard game={game} interactive={false} />);

      fireEvent.click(screen.getByTestId('click-e2'));
      expect(game.onSquareClick).not.toHaveBeenCalled();
    });
  });

  describe('drag begin', () => {
    it('calls game.onSquareClick on drag begin to show legal moves', () => {
      const game = buildMockGame();
      render(<ControlledChessBoard game={game} />);

      fireEvent.click(screen.getByTestId('drag-begin-e2'));
      expect(game.onSquareClick).toHaveBeenCalledWith('e2');
    });
  });

  describe('eval bar', () => {
    it('does not render eval bar by default', () => {
      render(<ControlledChessBoard game={buildMockGame()} />);
      expect(screen.queryByTestId('eval-bar')).not.toBeInTheDocument();
    });

    it('renders eval bar when showEvalBar is true', () => {
      render(<ControlledChessBoard game={buildMockGame()} showEvalBar evaluation={0} />);
      expect(screen.getByTestId('eval-bar')).toBeInTheDocument();
    });
  });

  describe('moveQualityFlash', () => {
    it('does not show flash overlay by default', () => {
      render(<ControlledChessBoard game={buildMockGame()} />);
      expect(screen.queryByTestId('move-quality-flash')).not.toBeInTheDocument();
    });

    it('shows green flash overlay when moveQualityFlash is good', () => {
      render(<ControlledChessBoard game={buildMockGame()} moveQualityFlash="good" />);
      const flash = screen.getByTestId('move-quality-flash');
      expect(flash).toBeInTheDocument();
      expect(flash.style.boxShadow).toContain('34, 197, 94');
    });

    it('shows amber flash overlay when moveQualityFlash is inaccuracy', () => {
      render(<ControlledChessBoard game={buildMockGame()} moveQualityFlash="inaccuracy" />);
      const flash = screen.getByTestId('move-quality-flash');
      expect(flash.style.boxShadow).toContain('245, 158, 11');
    });

    it('shows red flash overlay when moveQualityFlash is blunder', () => {
      render(<ControlledChessBoard game={buildMockGame()} moveQualityFlash="blunder" />);
      const flash = screen.getByTestId('move-quality-flash');
      expect(flash.style.boxShadow).toContain('239, 68, 68');
    });
  });

  describe('game object is the single source of truth', () => {
    it('uses game.position for the board display', () => {
      const customFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
      const game = buildMockGame({ position: customFen });
      render(<ControlledChessBoard game={game} />);
      expect(screen.getByTestId('mock-chessboard').dataset.position).toBe(customFen);
    });

    it('delegates flip to game.flipBoard directly', () => {
      const game = buildMockGame();
      render(<ControlledChessBoard game={game} />);
      fireEvent.click(screen.getByTestId('flip-button'));
      expect(game.flipBoard).toHaveBeenCalledOnce();
    });
  });
});
