import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import { PuzzleSessionStats } from './PuzzleSessionStats';

describe('PuzzleSessionStats', () => {
  it('renders solved and failed counts', () => {
    render(<PuzzleSessionStats solved={5} failed={3} streak={0} ratingChange={0} />);

    expect(screen.getByTestId('session-stats')).toBeInTheDocument();
    expect(screen.getByLabelText('5 solved')).toBeInTheDocument();
    expect(screen.getByLabelText('3 failed')).toBeInTheDocument();
  });

  it('shows accuracy when puzzles attempted', () => {
    render(<PuzzleSessionStats solved={7} failed={3} streak={0} ratingChange={0} />);
    expect(screen.getByLabelText('70% accuracy')).toBeInTheDocument();
  });

  it('does not show accuracy when no puzzles attempted', () => {
    render(<PuzzleSessionStats solved={0} failed={0} streak={0} ratingChange={0} />);
    expect(screen.queryByText('%')).not.toBeInTheDocument();
  });

  it('shows streak when greater than 1', () => {
    render(<PuzzleSessionStats solved={5} failed={0} streak={3} ratingChange={0} />);
    expect(screen.getByLabelText('3 streak')).toBeInTheDocument();
  });

  it('hides streak when 1 or less', () => {
    render(<PuzzleSessionStats solved={1} failed={0} streak={1} ratingChange={10} />);
    expect(screen.queryByLabelText(/streak/)).not.toBeInTheDocument();
  });

  it('shows positive rating change with + prefix', () => {
    render(<PuzzleSessionStats solved={5} failed={0} streak={0} ratingChange={42} />);
    expect(screen.getByLabelText('Rating change: +42')).toBeInTheDocument();
  });

  it('shows negative rating change', () => {
    render(<PuzzleSessionStats solved={0} failed={5} streak={0} ratingChange={-30} />);
    expect(screen.getByLabelText('Rating change: -30')).toBeInTheDocument();
  });
});
