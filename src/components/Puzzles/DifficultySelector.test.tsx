import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { DifficultySelector } from './DifficultySelector';

const TARGETS = { easy: 800, medium: 1000, hard: 1200 };

describe('DifficultySelector', () => {
  it('renders three difficulty buttons', () => {
    render(<DifficultySelector onSelect={vi.fn()} targets={TARGETS} />);
    expect(screen.getByTestId('difficulty-easy')).toBeInTheDocument();
    expect(screen.getByTestId('difficulty-medium')).toBeInTheDocument();
    expect(screen.getByTestId('difficulty-hard')).toBeInTheDocument();
  });

  it('prints the target each card actually serves — never a fixed band (D11)', () => {
    render(<DifficultySelector onSelect={vi.fn()} targets={TARGETS} />);
    expect(screen.getByTestId('difficulty-target-easy')).toHaveTextContent('~800');
    expect(screen.getByTestId('difficulty-target-medium')).toHaveTextContent('~1000');
    expect(screen.getByTestId('difficulty-target-hard')).toHaveTextContent('~1200');
    expect(screen.queryByText(/~1500 rating/)).toBeNull();
  });

  it('calls onSelect with easy when Easy clicked', () => {
    const onSelect = vi.fn();
    render(<DifficultySelector onSelect={onSelect} targets={TARGETS} />);
    fireEvent.click(screen.getByTestId('difficulty-easy'));
    expect(onSelect).toHaveBeenCalledWith('easy');
  });

  it('calls onSelect with medium when Medium clicked', () => {
    const onSelect = vi.fn();
    render(<DifficultySelector onSelect={onSelect} targets={TARGETS} />);
    fireEvent.click(screen.getByTestId('difficulty-medium'));
    expect(onSelect).toHaveBeenCalledWith('medium');
  });

  it('calls onSelect with hard when Hard clicked', () => {
    const onSelect = vi.fn();
    render(<DifficultySelector onSelect={onSelect} targets={TARGETS} />);
    fireEvent.click(screen.getByTestId('difficulty-hard'));
    expect(onSelect).toHaveBeenCalledWith('hard');
  });

  it('renders labels and descriptions', () => {
    render(<DifficultySelector onSelect={vi.fn()} targets={TARGETS} />);
    expect(screen.getByText('Easy')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Hard')).toBeInTheDocument();
    expect(screen.getByText(/below your training level/)).toBeInTheDocument();
    expect(screen.getByText(/climbs as you solve/)).toBeInTheDocument();
    expect(screen.getByText(/above your training level/)).toBeInTheDocument();
  });
});
