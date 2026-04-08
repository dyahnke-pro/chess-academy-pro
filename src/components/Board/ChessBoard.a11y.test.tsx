import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/utils';
import { ChessBoard } from './ChessBoard';

// Mock heavy deps
vi.mock('react-chessboard', () => ({
  Chessboard: ({ options }: { options: Record<string, unknown> }) => (
    <div data-testid="chessboard-mock" data-orientation={options.boardOrientation as string} role="grid" aria-label="Chess board">
      <div role="gridcell" aria-label="e2 white pawn" />
    </div>
  ),
}));

vi.mock('../../hooks/useChessGame', () => ({
  useChessGame: () => ({
    position: 'start',
    boardOrientation: 'white',
    lastMove: null,
    checkSquare: null,
    selectedSquare: null,
    legalMoves: [],
    getPiece: () => null,
    onDrop: vi.fn(),
    onSquareClick: vi.fn(),
    clearSelection: vi.fn(),
    flipBoard: vi.fn(),
    undoMove: vi.fn(),
    resetGame: vi.fn(),
  }),
}));

vi.mock('../../hooks/usePieceSound', () => ({
  usePieceSound: () => ({ playMoveSound: vi.fn() }),
}));

vi.mock('../../hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));

describe('ChessBoard a11y', () => {
  it('flip button has accessible label', () => {
    render(<ChessBoard showFlipButton />);
    const btn = screen.getByTestId('flip-button');
    expect(btn).toHaveAttribute('aria-label', 'Flip board');
  });

  it('undo button has accessible label', () => {
    render(<ChessBoard showUndoButton />);
    const btn = screen.getByTestId('undo-button');
    expect(btn).toHaveAttribute('aria-label', 'Undo last move');
  });

  it('reset button has accessible label', () => {
    render(<ChessBoard showResetButton />);
    const btn = screen.getByTestId('reset-button');
    expect(btn).toHaveAttribute('aria-label', 'New game');
  });

  it('buttons have title attributes for tooltip', () => {
    render(<ChessBoard showFlipButton showUndoButton showResetButton />);
    expect(screen.getByTestId('flip-button')).toHaveAttribute('title', 'Flip board');
    expect(screen.getByTestId('undo-button')).toHaveAttribute('title', 'Undo last move');
    expect(screen.getByTestId('reset-button')).toHaveAttribute('title', 'New game');
  });

  it('control buttons contain visible text labels', () => {
    render(<ChessBoard showFlipButton showUndoButton showResetButton />);
    expect(screen.getByText('Flip')).toBeInTheDocument();
    expect(screen.getByText('Undo')).toBeInTheDocument();
    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  it('board container has data-testid for identification', () => {
    render(<ChessBoard />);
    expect(screen.getByTestId('chess-board-container')).toBeInTheDocument();
  });

  it('controls section only renders when at least one control is enabled', () => {
    const { container } = render(<ChessBoard showFlipButton={false} showUndoButton={false} showResetButton={false} showVoiceMic={false} />);
    expect(container.querySelector('[data-testid="board-controls"]')).toBeNull();
  });

  it('controls section renders when any control is enabled', () => {
    render(<ChessBoard showFlipButton showUndoButton={false} showResetButton={false} />);
    expect(screen.getByTestId('board-controls')).toBeInTheDocument();
  });
});
