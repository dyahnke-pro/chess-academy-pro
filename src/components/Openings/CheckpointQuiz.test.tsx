import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
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

  it('does not show play button before answering', () => {
    const onComplete = vi.fn();
    const onPlayPosition = vi.fn();
    render(
      <CheckpointQuiz quiz={quiz} boardOrientation="white" onComplete={onComplete} onPlayPosition={onPlayPosition} />,
    );
    expect(screen.queryByTestId('quiz-play-position')).not.toBeInTheDocument();
  });

  it('shows play button after answering a plan quiz', async () => {
    const planQuiz: CheckpointQuizItem = {
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      correctMove: 'e5',
      hint: 'Control the center.',
      concept: 'Center Control',
      type: 'plan',
      choices: ['Push e5', 'Push d5', 'Play Nf6'],
      correctIndex: 0,
      question: 'What is the best plan?',
    };
    const onComplete = vi.fn();
    const onPlayPosition = vi.fn();
    render(
      <CheckpointQuiz quiz={planQuiz} boardOrientation="white" onComplete={onComplete} onPlayPosition={onPlayPosition} />,
    );

    fireEvent.click(screen.getByTestId('quiz-choice-0'));

    await waitFor(() => {
      expect(screen.getByTestId('quiz-play-position')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('quiz-play-position'));
    expect(onPlayPosition).toHaveBeenCalledWith(planQuiz.fen);
  });
});
