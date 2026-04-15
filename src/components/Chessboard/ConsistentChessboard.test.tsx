import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../../test/utils';
import { ConsistentChessboard } from './ConsistentChessboard';
import type { ChessboardOptions } from 'react-chessboard';

// Mock react-chessboard to expose the options it would render.
vi.mock('react-chessboard', () => ({
  Chessboard: ({ options = {} }: { options?: ChessboardOptions }): JSX.Element => (
    <div
      data-testid="mock-chessboard"
      data-position={String(options.position ?? '')}
      data-orientation={options.boardOrientation ?? 'white'}
      data-draggable={String(options.allowDragging ?? true)}
      data-anim={String(options.animationDurationInMs ?? '')}
      data-arrows={JSON.stringify(options.arrows ?? [])}
    />
  ),
}));

// Mock the useChessGame to satisfy ControlledChessBoard imports indirectly when
// controlled-mode test runs. We don't actually exercise controlled mode here
// since ControlledChessBoard already has its own test.
describe('ConsistentChessboard (static mode)', () => {
  const FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  it('renders the position FEN', () => {
    render(<ConsistentChessboard fen={FEN} />);
    const board = screen.getByTestId('mock-chessboard');
    expect(board.getAttribute('data-position')).toBe(FEN);
  });

  it('defaults to non-interactive (no dragging)', () => {
    render(<ConsistentChessboard fen={FEN} />);
    const board = screen.getByTestId('mock-chessboard');
    expect(board.getAttribute('data-draggable')).toBe('false');
  });

  it('allows dragging when interactive=true', () => {
    render(<ConsistentChessboard fen={FEN} interactive />);
    const board = screen.getByTestId('mock-chessboard');
    expect(board.getAttribute('data-draggable')).toBe('true');
  });

  it('applies arrows when provided', () => {
    const arrows = [{ startSquare: 'e2', endSquare: 'e4', color: 'green' }];
    render(<ConsistentChessboard fen={FEN} arrows={arrows} />);
    const board = screen.getByTestId('mock-chessboard');
    expect(board.getAttribute('data-arrows')).toBe(JSON.stringify(arrows));
  });

  it('uses the standard 200ms animation by default', () => {
    render(<ConsistentChessboard fen={FEN} />);
    const board = screen.getByTestId('mock-chessboard');
    expect(board.getAttribute('data-anim')).toBe('200');
  });

  it('honors a custom animation duration when given', () => {
    render(<ConsistentChessboard fen={FEN} animationDurationInMs={400} />);
    const board = screen.getByTestId('mock-chessboard');
    expect(board.getAttribute('data-anim')).toBe('400');
  });

  it('renders the overlay node above the board', () => {
    render(
      <ConsistentChessboard
        fen={FEN}
        overlay={<div data-testid="my-overlay">flash</div>}
      />,
    );
    expect(screen.getByTestId('my-overlay')).toBeInTheDocument();
  });

  it('renders inside a static-mode wrapper div', () => {
    render(<ConsistentChessboard fen={FEN} />);
    expect(screen.getByTestId('consistent-chessboard-static')).toBeInTheDocument();
  });
});
