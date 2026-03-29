import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '../../test/utils';
import { PuzzleTimer } from './PuzzleTimer';

describe('PuzzleTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('renders initial time', () => {
    render(<PuzzleTimer duration={30} running={false} onTimeout={vi.fn()} />);
    expect(screen.getByTestId('timer-display')).toHaveTextContent('30s');
  });

  it('counts down when running', () => {
    render(<PuzzleTimer duration={30} running={true} onTimeout={vi.fn()} />);

    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByTestId('timer-display')).toHaveTextContent('27s');
  });

  it('calls onTimeout when reaching zero', () => {
    const onTimeout = vi.fn();
    render(<PuzzleTimer duration={3} running={true} onTimeout={onTimeout} />);

    act(() => { vi.advanceTimersByTime(3000); });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('does not count down when not running', () => {
    render(<PuzzleTimer duration={30} running={false} onTimeout={vi.fn()} />);

    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByTestId('timer-display')).toHaveTextContent('30s');
  });

  it('has role=timer and aria-label', () => {
    render(<PuzzleTimer duration={30} running={false} onTimeout={vi.fn()} />);
    const timer = screen.getByTestId('puzzle-timer');
    expect(timer).toHaveAttribute('role', 'timer');
    expect(timer).toHaveAttribute('aria-label', '30 seconds remaining');
  });

  it('handles zero duration without crashing', () => {
    render(<PuzzleTimer duration={0} running={true} onTimeout={vi.fn()} />);
    expect(screen.getByTestId('timer-display')).toHaveTextContent('0s');
  });

  it('resets when duration prop changes', () => {
    const { rerender } = render(<PuzzleTimer duration={30} running={true} onTimeout={vi.fn()} />);

    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByTestId('timer-display')).toHaveTextContent('25s');

    rerender(<PuzzleTimer duration={15} running={true} onTimeout={vi.fn()} />);
    expect(screen.getByTestId('timer-display')).toHaveTextContent('15s');
  });
});
