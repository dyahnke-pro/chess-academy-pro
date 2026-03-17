import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReviewPracticeBanner } from './ReviewPracticeBanner';
import type { MissedTactic } from '../../types';

const mockTactic: MissedTactic = {
  moveIndex: 5,
  playerMoved: 'Nf3',
  bestMove: 'Nxe5',
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  evalSwing: 300,
  tacticType: 'fork',
  explanation: 'The knight fork wins the queen.',
};

describe('ReviewPracticeBanner', () => {
  it('renders find the best move prompt', () => {
    render(
      <ReviewPracticeBanner
        practiceTarget={mockTactic}
        practiceResult="pending"
        practiceAttempts={0}
        isGuidedLesson={false}
        onExitPractice={vi.fn()}
      />,
    );
    expect(screen.getByText('Find the best move!')).toBeInTheDocument();
  });

  it('shows correct result', () => {
    render(
      <ReviewPracticeBanner
        practiceTarget={mockTactic}
        practiceResult="correct"
        practiceAttempts={1}
        isGuidedLesson={false}
        onExitPractice={vi.fn()}
      />,
    );
    expect(screen.getByTestId('practice-correct')).toBeInTheDocument();
  });

  it('shows incorrect result with best move', () => {
    render(
      <ReviewPracticeBanner
        practiceTarget={mockTactic}
        practiceResult="incorrect"
        practiceAttempts={3}
        isGuidedLesson={false}
        onExitPractice={vi.fn()}
      />,
    );
    expect(screen.getByTestId('practice-incorrect')).toBeInTheDocument();
    expect(screen.getByText(/Nxe5/)).toBeInTheDocument();
  });

  it('shows retry message on pending with attempts', () => {
    render(
      <ReviewPracticeBanner
        practiceTarget={mockTactic}
        practiceResult="pending"
        practiceAttempts={1}
        isGuidedLesson={false}
        onExitPractice={vi.fn()}
      />,
    );
    expect(screen.getByText(/try again/i)).toBeInTheDocument();
  });

  it('shows "Back to Lesson" in guided mode', () => {
    render(
      <ReviewPracticeBanner
        practiceTarget={mockTactic}
        practiceResult="pending"
        practiceAttempts={0}
        isGuidedLesson={true}
        onExitPractice={vi.fn()}
      />,
    );
    expect(screen.getByText('Back to Lesson')).toBeInTheDocument();
  });

  it('shows "Back to Review" in normal mode', () => {
    render(
      <ReviewPracticeBanner
        practiceTarget={mockTactic}
        practiceResult="pending"
        practiceAttempts={0}
        isGuidedLesson={false}
        onExitPractice={vi.fn()}
      />,
    );
    expect(screen.getByText('Back to Review')).toBeInTheDocument();
  });

  it('calls onExitPractice when exit button clicked', () => {
    const handler = vi.fn();
    render(
      <ReviewPracticeBanner
        practiceTarget={mockTactic}
        practiceResult="pending"
        practiceAttempts={0}
        isGuidedLesson={false}
        onExitPractice={handler}
      />,
    );
    fireEvent.click(screen.getByTestId('exit-practice-btn'));
    expect(handler).toHaveBeenCalledOnce();
  });
});
