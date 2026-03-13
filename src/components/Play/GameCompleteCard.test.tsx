import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { GameCompleteCard } from './GameCompleteCard';

vi.mock('../../services/gamesService', () => ({
  getStars: (mistakes: number, hints: number) => {
    const total = mistakes + hints;
    if (total === 0) return 3;
    if (total <= 2) return 2;
    return 1;
  },
}));

describe('GameCompleteCard', () => {
  const defaultProps = {
    title: 'Italian Game',
    subtitle: 'C50 · White',
    mistakes: 0,
    hintsUsed: 0,
    takebacksUsed: 0,
    timeSeconds: 45,
    onPlayAgain: vi.fn(),
    onNext: vi.fn(),
    onBack: vi.fn(),
    hasNext: true,
  };

  it('renders with title and subtitle', () => {
    render(<GameCompleteCard {...defaultProps} />);
    expect(screen.getByText('Italian Game')).toBeInTheDocument();
    expect(screen.getByText('C50 · White')).toBeInTheDocument();
  });

  it('shows Perfect! for zero mistakes and hints', () => {
    render(<GameCompleteCard {...defaultProps} />);
    expect(screen.getByText('Perfect!')).toBeInTheDocument();
  });

  it('shows Line Complete! for mistakes', () => {
    render(<GameCompleteCard {...defaultProps} mistakes={2} />);
    expect(screen.getByText('Line Complete!')).toBeInTheDocument();
  });

  it('shows time', () => {
    render(<GameCompleteCard {...defaultProps} />);
    expect(screen.getByText('45s')).toBeInTheDocument();
  });

  it('shows time with minutes', () => {
    render(<GameCompleteCard {...defaultProps} timeSeconds={125} />);
    expect(screen.getByText('2m 5s')).toBeInTheDocument();
  });

  it('shows retry count', () => {
    render(<GameCompleteCard {...defaultProps} mistakes={3} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows hint count when hints were used', () => {
    render(<GameCompleteCard {...defaultProps} hintsUsed={2} />);
    expect(screen.getByText('Hints')).toBeInTheDocument();
  });

  it('shows Next Opening button when hasNext is true', () => {
    render(<GameCompleteCard {...defaultProps} />);
    expect(screen.getByTestId('next-btn')).toBeInTheDocument();
    expect(screen.getByText('Next Opening')).toBeInTheDocument();
  });

  it('does not show Next button when hasNext is false', () => {
    render(<GameCompleteCard {...defaultProps} hasNext={false} />);
    expect(screen.queryByTestId('next-btn')).not.toBeInTheDocument();
  });

  it('calls onPlayAgain when Again button clicked', () => {
    render(<GameCompleteCard {...defaultProps} />);
    fireEvent.click(screen.getByTestId('play-again-btn'));
    expect(defaultProps.onPlayAgain).toHaveBeenCalled();
  });

  it('calls onNext when Next Opening button clicked', () => {
    render(<GameCompleteCard {...defaultProps} />);
    fireEvent.click(screen.getByTestId('next-btn'));
    expect(defaultProps.onNext).toHaveBeenCalled();
  });

  it('calls onBack when Back button clicked (no next)', () => {
    const props = { ...defaultProps, hasNext: false };
    render(<GameCompleteCard {...props} />);
    fireEvent.click(screen.getByTestId('back-btn'));
    expect(defaultProps.onBack).toHaveBeenCalled();
  });
});
