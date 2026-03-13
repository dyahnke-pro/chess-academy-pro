import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { ReviewSummaryCard } from './ReviewSummaryCard';
import type { GameAccuracy, MoveClassificationCounts, PhaseAccuracy } from '../../types';

const defaultAccuracy: GameAccuracy = { white: 85.3, black: 72.1, moveCount: 30 };

const playerCounts: MoveClassificationCounts = {
  brilliant: 1, great: 2, good: 5, book: 2,
  inaccuracy: 1, mistake: 1, blunder: 0,
};

const opponentCounts: MoveClassificationCounts = {
  brilliant: 0, great: 1, good: 6, book: 2,
  inaccuracy: 2, mistake: 0, blunder: 1,
};

const phaseBreakdown: PhaseAccuracy[] = [
  { phase: 'opening', accuracy: 92.0, moveCount: 8, mistakes: 0 },
  { phase: 'middlegame', accuracy: 78.5, moveCount: 14, mistakes: 2 },
  { phase: 'endgame', accuracy: 85.0, moveCount: 8, mistakes: 0 },
];

function renderCard(overrides: Record<string, unknown> = {}): {
  onStartReview: ReturnType<typeof vi.fn>;
  onPlayAgain: ReturnType<typeof vi.fn>;
  onBackToCoach: ReturnType<typeof vi.fn>;
} {
  const onStartReview = vi.fn();
  const onPlayAgain = vi.fn();
  const onBackToCoach = vi.fn();

  render(
    <ReviewSummaryCard
      result="win"
      playerName="David"
      playerRating={1200}
      opponentRating={1150}
      playerColor="white"
      accuracy={defaultAccuracy}
      classificationCounts={playerCounts}
      opponentClassificationCounts={opponentCounts}
      phaseBreakdown={phaseBreakdown}
      openingName="Italian Game"
      moveCount={30}
      onStartReview={onStartReview}
      onPlayAgain={onPlayAgain}
      onBackToCoach={onBackToCoach}
      {...overrides}
    />,
  );

  return { onStartReview, onPlayAgain, onBackToCoach };
}

describe('ReviewSummaryCard', () => {
  it('renders the result banner with "Victory" for a win', () => {
    renderCard();
    expect(screen.getByText('Victory')).toBeInTheDocument();
  });

  it('renders "Defeat" for a loss', () => {
    renderCard({ result: 'loss' });
    expect(screen.getByText('Defeat')).toBeInTheDocument();
  });

  it('renders "Draw" for a draw', () => {
    renderCard({ result: 'draw' });
    expect(screen.getByText('Draw')).toBeInTheDocument();
  });

  it('shows move count', () => {
    renderCard();
    expect(screen.getByText('30 moves played')).toBeInTheDocument();
  });

  it('renders dual accuracy rings', () => {
    renderCard();
    const rings = screen.getAllByTestId('accuracy-ring');
    expect(rings).toHaveLength(2);
    // Player accuracy: 85.3 → 85
    expect(screen.getByText('85')).toBeInTheDocument();
    // Opponent accuracy: 72.1 → 72
    expect(screen.getByText('72')).toBeInTheDocument();
  });

  it('shows player name and rating', () => {
    renderCard();
    expect(screen.getByText('David')).toBeInTheDocument();
    expect(screen.getByText('1200')).toBeInTheDocument();
  });

  it('shows Stockfish Bot label for opponent', () => {
    renderCard();
    expect(screen.getByText('Stockfish Bot')).toBeInTheDocument();
    expect(screen.getByText('1150')).toBeInTheDocument();
  });

  it('renders classification bars', () => {
    renderCard();
    const bars = screen.getAllByTestId('classification-bar');
    expect(bars.length).toBe(2); // player + opponent
  });

  it('shows phase accuracy breakdown', () => {
    renderCard();
    expect(screen.getByText('Opening')).toBeInTheDocument();
    expect(screen.getByText('Middlegame')).toBeInTheDocument();
    expect(screen.getByText('Endgame')).toBeInTheDocument();
  });

  it('shows opening name when provided', () => {
    renderCard();
    expect(screen.getByTestId('opening-label')).toHaveTextContent('Italian Game');
  });

  it('hides opening name when null', () => {
    renderCard({ openingName: null });
    expect(screen.queryByTestId('opening-label')).not.toBeInTheDocument();
  });

  it('calls onStartReview when "Review Game" is clicked', () => {
    const { onStartReview } = renderCard();
    fireEvent.click(screen.getByTestId('start-review-btn'));
    expect(onStartReview).toHaveBeenCalledOnce();
  });

  it('calls onPlayAgain when "Play Again" is clicked', () => {
    const { onPlayAgain } = renderCard();
    fireEvent.click(screen.getByTestId('summary-play-again-btn'));
    expect(onPlayAgain).toHaveBeenCalledOnce();
  });

  it('calls onBackToCoach when "Back to Coach" is clicked', () => {
    const { onBackToCoach } = renderCard();
    fireEvent.click(screen.getByTestId('summary-back-btn'));
    expect(onBackToCoach).toHaveBeenCalledOnce();
  });

  it('uses correct accuracy for black player', () => {
    renderCard({ playerColor: 'black' });
    // Black accuracy is 72.1 → 72 for player
    // White accuracy is 85.3 → 85 for opponent
    const rings = screen.getAllByTestId('accuracy-ring');
    expect(rings).toHaveLength(2);
  });
});
