import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { DifficultyToggle } from './DifficultyToggle';

describe('DifficultyToggle', () => {
  it('renders three difficulty buttons', () => {
    render(<DifficultyToggle value="medium" onChange={vi.fn()} />);

    expect(screen.getByTestId('difficulty-easy')).toBeInTheDocument();
    expect(screen.getByTestId('difficulty-medium')).toBeInTheDocument();
    expect(screen.getByTestId('difficulty-hard')).toBeInTheDocument();
  });

  it('marks active difficulty with aria-pressed', () => {
    render(<DifficultyToggle value="hard" onChange={vi.fn()} />);

    expect(screen.getByTestId('difficulty-easy')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('difficulty-medium')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('difficulty-hard')).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onChange when a button is clicked', () => {
    const onChange = vi.fn();
    render(<DifficultyToggle value="medium" onChange={onChange} />);

    fireEvent.click(screen.getByTestId('difficulty-easy'));
    expect(onChange).toHaveBeenCalledWith('easy');

    fireEvent.click(screen.getByTestId('difficulty-hard'));
    expect(onChange).toHaveBeenCalledWith('hard');
  });

  it('disables all buttons when disabled prop is true', () => {
    render(<DifficultyToggle value="medium" onChange={vi.fn()} disabled />);

    expect(screen.getByTestId('difficulty-easy')).toBeDisabled();
    expect(screen.getByTestId('difficulty-medium')).toBeDisabled();
    expect(screen.getByTestId('difficulty-hard')).toBeDisabled();
  });

  it('has correct labels', () => {
    render(<DifficultyToggle value="medium" onChange={vi.fn()} />);

    expect(screen.getByTestId('difficulty-easy')).toHaveTextContent('Easy');
    expect(screen.getByTestId('difficulty-medium')).toHaveTextContent('Medium');
    expect(screen.getByTestId('difficulty-hard')).toHaveTextContent('Hard');
  });
});
