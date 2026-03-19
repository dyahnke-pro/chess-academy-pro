import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import { ClassificationBar } from './ClassificationBar';
import type { MoveClassificationCounts } from '../../types';

const makeCounts = (overrides: Partial<MoveClassificationCounts> = {}): MoveClassificationCounts => ({
  brilliant: 0,
  great: 0,
  good: 0,
  book: 0,
  miss: 0,
  inaccuracy: 0,
  mistake: 0,
  blunder: 0,
  ...overrides,
});

describe('ClassificationBar', () => {
  it('renders empty state when all counts are zero', () => {
    render(<ClassificationBar counts={makeCounts()} totalMoves={0} />);
    expect(screen.getByText('No classified moves')).toBeInTheDocument();
  });

  it('renders bar segments for non-zero classifications', () => {
    render(
      <ClassificationBar
        counts={makeCounts({ brilliant: 2, good: 5, blunder: 1 })}
        totalMoves={8}
      />,
    );
    expect(screen.getByTestId('bar-segment-brilliant')).toBeInTheDocument();
    expect(screen.getByTestId('bar-segment-good')).toBeInTheDocument();
    expect(screen.getByTestId('bar-segment-blunder')).toBeInTheDocument();
    expect(screen.queryByTestId('bar-segment-mistake')).not.toBeInTheDocument();
  });

  it('shows classification symbols in bar segments', () => {
    render(
      <ClassificationBar
        counts={makeCounts({ brilliant: 1, blunder: 2 })}
        totalMoves={3}
      />,
    );
    expect(screen.getByTestId('bar-segment-brilliant')).toHaveTextContent('!!');
    expect(screen.getByTestId('bar-segment-blunder')).toHaveTextContent('??');
  });

  it('shows counts and labels in legend', () => {
    render(
      <ClassificationBar
        counts={makeCounts({ great: 3, mistake: 1 })}
        totalMoves={4}
      />,
    );
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Great')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Mistake')).toBeInTheDocument();
  });

  it('applies className', () => {
    render(
      <ClassificationBar
        counts={makeCounts({ good: 5 })}
        totalMoves={5}
        className="mt-3"
      />,
    );
    expect(screen.getByTestId('classification-bar').className).toContain('mt-3');
  });

  it('renders segments in classification order', () => {
    render(
      <ClassificationBar
        counts={makeCounts({ blunder: 1, brilliant: 1, inaccuracy: 2 })}
        totalMoves={4}
      />,
    );
    const segments = screen.getAllByTestId(/^bar-segment-/);
    expect(segments[0].getAttribute('data-testid')).toBe('bar-segment-brilliant');
    expect(segments[1].getAttribute('data-testid')).toBe('bar-segment-inaccuracy');
    expect(segments[2].getAttribute('data-testid')).toBe('bar-segment-blunder');
  });
});
