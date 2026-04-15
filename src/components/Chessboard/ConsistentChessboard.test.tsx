import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import { ConsistentChessboard } from './ConsistentChessboard';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const SICILIAN_FEN = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

describe('ConsistentChessboard', () => {
  it('renders a board at the given FEN', () => {
    render(<ConsistentChessboard fen={STARTING_FEN} />);
    expect(screen.getByTestId('consistent-chessboard')).toBeInTheDocument();
    expect(screen.getByTestId('chess-board-container')).toBeInTheDocument();
  });

  it('hides interactive controls by default (flip, undo, reset, voice)', () => {
    render(<ConsistentChessboard fen={STARTING_FEN} />);
    expect(screen.queryByTestId('flip-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('undo-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('reset-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('board-controls')).not.toBeInTheDocument();
  });

  it('respects a custom testId', () => {
    render(<ConsistentChessboard fen={STARTING_FEN} testId="lesson-board" />);
    expect(screen.getByTestId('lesson-board')).toBeInTheDocument();
  });

  it('renders different positions independently', () => {
    const { unmount } = render(<ConsistentChessboard fen={STARTING_FEN} />);
    expect(screen.getByTestId('consistent-chessboard')).toBeInTheDocument();
    unmount();
    render(<ConsistentChessboard fen={SICILIAN_FEN} />);
    expect(screen.getByTestId('consistent-chessboard')).toBeInTheDocument();
  });

  it('applies maxWidth styling when provided', () => {
    render(<ConsistentChessboard fen={STARTING_FEN} maxWidth="420px" />);
    const container = screen.getByTestId('consistent-chessboard');
    expect(container).toHaveStyle({ maxWidth: '420px' });
  });

  it('passes through a className', () => {
    render(<ConsistentChessboard fen={STARTING_FEN} className="custom-lesson" />);
    expect(screen.getByTestId('consistent-chessboard')).toHaveClass('custom-lesson');
  });
});
