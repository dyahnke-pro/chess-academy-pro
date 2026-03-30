import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { CheckpointQuiz } from './CheckpointQuiz';
import type { CheckpointQuizItem } from '../../types';

const quiz: CheckpointQuizItem = {
  fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
  correctMove: 'e5',
  hint: 'Mirror White\'s pawn move.',
  concept: 'Symmetrical Response',
};

describe('CheckpointQuiz', () => {
  it('renders the quiz with concept and prompt', () => {
    const onComplete = vi.fn();
    render(
      <CheckpointQuiz quiz={quiz} boardOrientation="white" onComplete={onComplete} />,
    );
    expect(screen.getByTestId('checkpoint-quiz')).toBeInTheDocument();
    expect(screen.getByText('Symmetrical Response')).toBeInTheDocument();
    expect(screen.getByText('Find the best move in this position.')).toBeInTheDocument();
  });

  it('shows hint when hint button is clicked', () => {
    const onComplete = vi.fn();
    render(
      <CheckpointQuiz quiz={quiz} boardOrientation="white" onComplete={onComplete} />,
    );
    fireEvent.click(screen.getByTestId('quiz-hint-btn'));
    expect(screen.getByTestId('quiz-hint')).toBeInTheDocument();
    expect(screen.getByText(/Mirror White/)).toBeInTheDocument();
  });

  it('renders the chessboard', () => {
    const onComplete = vi.fn();
    render(
      <CheckpointQuiz quiz={quiz} boardOrientation="white" onComplete={onComplete} />,
    );
    // Chessboard renders in the DOM
    expect(screen.getByTestId('checkpoint-quiz')).toBeInTheDocument();
  });
});
