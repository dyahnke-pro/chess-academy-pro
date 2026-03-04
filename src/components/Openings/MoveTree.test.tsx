import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../test/utils';
import { MoveTree } from './MoveTree';

describe('MoveTree', () => {
  const defaultProps = {
    mainLinePgn: 'e4 e5 Nc3',
    variations: null,
    currentMoveIndex: -1,
    onMoveSelect: vi.fn(),
  };

  it('renders the main line moves', () => {
    render(<MoveTree {...defaultProps} />);
    expect(screen.getByTestId('move-tree')).toBeInTheDocument();
    expect(screen.getByTestId('main-line-moves')).toBeInTheDocument();
    expect(screen.getByTestId('main-move-0')).toHaveTextContent('e4');
    expect(screen.getByTestId('main-move-1')).toHaveTextContent('e5');
    expect(screen.getByTestId('main-move-2')).toHaveTextContent('Nc3');
  });

  it('highlights the current move', () => {
    render(<MoveTree {...defaultProps} currentMoveIndex={1} />);
    const move1 = screen.getByTestId('main-move-1');
    expect(move1.className).toContain('bg-theme-accent');
  });

  it('calls onMoveSelect when a move is clicked', () => {
    const onMoveSelect = vi.fn();
    render(<MoveTree {...defaultProps} onMoveSelect={onMoveSelect} />);
    fireEvent.click(screen.getByTestId('main-move-0'));
    expect(onMoveSelect).toHaveBeenCalledWith(0);
  });

  it('renders variations when provided', () => {
    const variations = [
      { name: 'Vienna Gambit', pgn: 'e4 e5 Nc3 Nf6 f4', explanation: 'Sharp play.' },
    ];
    render(<MoveTree {...defaultProps} variations={variations} />);
    expect(screen.getByTestId('variation-0-moves')).toBeInTheDocument();
    expect(screen.getByText('Vienna Gambit')).toBeInTheDocument();
    expect(screen.getByText('Sharp play.')).toBeInTheDocument();
  });

  it('calls onMoveSelect with variation index when variation move is clicked', () => {
    const onMoveSelect = vi.fn();
    const variations = [
      { name: 'Test Var', pgn: 'e4 e5 Nc3 Nf6 f4', explanation: 'Test' },
    ];
    render(<MoveTree {...defaultProps} variations={variations} onMoveSelect={onMoveSelect} />);
    fireEvent.click(screen.getByTestId('var-0-move-0'));
    expect(onMoveSelect).toHaveBeenCalledWith(0, 0);
  });

  it('highlights variation move when activeVariation matches', () => {
    const variations = [
      { name: 'Test Var', pgn: 'e4 e5 Nc3 Nf6 f4', explanation: 'Test' },
    ];
    render(
      <MoveTree {...defaultProps} variations={variations} activeVariation={0} currentMoveIndex={2} />,
    );
    const varMove = screen.getByTestId('var-0-move-2');
    expect(varMove.className).toContain('bg-theme-accent');
  });

  it('renders move numbers correctly', () => {
    render(<MoveTree {...defaultProps} />);
    // "1." should appear before the first white move (e4)
    expect(screen.getByTestId('main-line-moves').textContent).toContain('1.');
  });
});
