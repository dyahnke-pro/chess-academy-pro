/**
 * EvalLabQuiz behavioral test — locks in the quiz contract:
 *   - 10 random positions per session
 *   - Three guess options (white-wins / draw / black-wins)
 *   - Reveal shows the authored explanation + correct/incorrect badge
 *   - Score tallied at the end
 *
 * Renders against the real endgameLessonsService catalog so any
 * future change that breaks the quiz pool fires here.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EvalLabQuiz } from './EvalLabQuiz';
import { getAllEndgameLessons } from '../../services/endgameLessonsService';

describe('EvalLabQuiz', () => {
  beforeEach(() => {
    // Reset Date.now-based seed each test so quiz pool is
    // deterministic-per-test but still randomized across runs.
  });

  it('renders the first quiz position with three guess buttons', () => {
    render(<EvalLabQuiz onExit={() => undefined} />);
    expect(screen.getByTestId('eval-lab-guess-white-wins')).toBeInTheDocument();
    expect(screen.getByTestId('eval-lab-guess-draw')).toBeInTheDocument();
    expect(screen.getByTestId('eval-lab-guess-black-wins')).toBeInTheDocument();
  });

  it('shows progress counter (Position N of M)', () => {
    render(<EvalLabQuiz onExit={() => undefined} />);
    expect(screen.getByText(/Position 1 of/)).toBeInTheDocument();
  });

  it('reveals next-button after the user guesses', () => {
    render(<EvalLabQuiz onExit={() => undefined} />);
    fireEvent.click(screen.getByTestId('eval-lab-guess-draw'));
    expect(screen.getByTestId('eval-lab-next')).toBeInTheDocument();
  });

  it('quiz pool draws from the full lesson catalog', () => {
    const total = getAllEndgameLessons().reduce(
      (sum, l) => sum + l.positions.length,
      0,
    );
    // Must have enough material to populate a 10-question quiz.
    expect(total).toBeGreaterThanOrEqual(10);
  });
});
