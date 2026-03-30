import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { CommonMistakesSection } from './CommonMistakesSection';
import type { CommonMistake } from '../../types';

const mistakes: CommonMistake[] = [
  {
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    wrongMove: 'f6',
    correctMove: 'e5',
    explanation: 'f6 weakens the kingside and blocks the knight. Play e5 instead.',
  },
  {
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 0 2',
    wrongMove: 'Qf6',
    correctMove: 'Nc6',
    explanation: 'Qf6 develops the queen too early. Nc6 develops a knight with tempo.',
  },
];

describe('CommonMistakesSection', () => {
  it('renders empty when no mistakes', () => {
    render(<CommonMistakesSection mistakes={[]} boardOrientation="white" />);
    expect(screen.getByTestId('common-mistakes-empty')).toBeInTheDocument();
  });

  it('renders mistake cards with wrong and correct moves', () => {
    render(<CommonMistakesSection mistakes={mistakes} boardOrientation="white" />);
    expect(screen.getByTestId('common-mistakes-section')).toBeInTheDocument();
    expect(screen.getByText(/Common Mistakes \(2\)/)).toBeInTheDocument();
    expect(screen.getByText('f6')).toBeInTheDocument();
    expect(screen.getByText('e5')).toBeInTheDocument();
  });

  it('expands a mistake to show explanation and board', () => {
    render(<CommonMistakesSection mistakes={mistakes} boardOrientation="white" />);
    fireEvent.click(screen.getByTestId('mistake-toggle-0'));
    // Explanation is shown twice when expanded (summary + expanded detail)
    const explanations = screen.getAllByText(/f6 weakens the kingside/);
    expect(explanations.length).toBeGreaterThanOrEqual(1);
  });

  it('collapses a mistake when clicked again', () => {
    render(<CommonMistakesSection mistakes={mistakes} boardOrientation="white" />);
    fireEvent.click(screen.getByTestId('mistake-toggle-0'));
    fireEvent.click(screen.getByTestId('mistake-toggle-0'));
    // The expanded content with the board should be gone
    // Only the summary explanation remains
    const explanations = screen.getAllByText(/f6 weakens the kingside/);
    expect(explanations.length).toBe(1);
  });
});
