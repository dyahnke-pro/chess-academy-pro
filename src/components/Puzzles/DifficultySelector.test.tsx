import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { DifficultySelector } from './DifficultySelector';

describe('DifficultySelector', () => {
  it('renders three difficulty buttons', () => {
    render(<DifficultySelector onSelect={vi.fn()} />);
    expect(screen.getByTestId('difficulty-easy')).toBeInTheDocument();
    expect(screen.getByTestId('difficulty-medium')).toBeInTheDocument();
    expect(screen.getByTestId('difficulty-hard')).toBeInTheDocument();
  });

  it('displays rating ranges', () => {
    render(<DifficultySelector onSelect={vi.fn()} />);
    expect(screen.getByText('~1000 rating')).toBeInTheDocument();
    expect(screen.getByText('~1500 rating')).toBeInTheDocument();
    expect(screen.getByText('2000+ rating')).toBeInTheDocument();
  });

  it('calls onSelect with easy when Easy clicked', () => {
    const onSelect = vi.fn();
    render(<DifficultySelector onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('difficulty-easy'));
    expect(onSelect).toHaveBeenCalledWith('easy');
  });

  it('calls onSelect with medium when Medium clicked', () => {
    const onSelect = vi.fn();
    render(<DifficultySelector onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('difficulty-medium'));
    expect(onSelect).toHaveBeenCalledWith('medium');
  });

  it('calls onSelect with hard when Hard clicked', () => {
    const onSelect = vi.fn();
    render(<DifficultySelector onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('difficulty-hard'));
    expect(onSelect).toHaveBeenCalledWith('hard');
  });

  it('renders labels and descriptions', () => {
    render(<DifficultySelector onSelect={vi.fn()} />);
    expect(screen.getByText('Easy')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Hard')).toBeInTheDocument();
    expect(screen.getByText(/Beginner-friendly/)).toBeInTheDocument();
    expect(screen.getByText(/Intermediate tactics/)).toBeInTheDocument();
    expect(screen.getByText(/Advanced tactics/)).toBeInTheDocument();
  });
});
