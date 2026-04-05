import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { ReviewSummaryCard } from './ReviewSummaryCard';
import type { CoachGameMove, GameAccuracy, MoveClassificationCounts, PhaseAccuracy } from '../../types';

const defaultAccuracy: GameAccuracy = { white: 85.3, black: 72.1, moveCount: 30 };

const playerCounts: MoveClassificationCounts = {
  brilliant: 1, great: 2, good: 5, book: 2, miss: 0,
  inaccuracy: 1, mistake: 1, blunder: 0,
};

const phaseBreakdown: PhaseAccuracy[] = [
  { phase: 'opening', accuracy: 92.0, moveCount: 8, mistakes: 0 },
  { phase: 'middlegame', accuracy: 78.5, moveCount: 14, mistakes: 2 },
  { phase: 'endgame', accuracy: 85.0, moveCount: 8, mistakes: 0 },
];

const mockMoves: CoachGameMove[] = [
  {
    moveNumber: 1, san: 'e4', fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    isCoachMove: false, evaluation: 0.3, bestMove: 'e2e4', bestMoveEval: 0.3,
    classification: 'book', preMoveEval: 0.2, commentary: '', expanded: false,
  },
];

function renderCard(overrides: Record<string, unknown> = {}): {
  onStartReview: ReturnType<typeof vi.fn>;
  onPlayAgain: ReturnType<typeof vi.fn>;
  onBackToCoach: ReturnType<typeof vi.fn>;
  onNavigateToMistakes: ReturnType<typeof vi.fn>;
} {
  const onStartReview = vi.fn();
  const onPlayAgain = vi.fn();
  const onBackToCoach = vi.fn();
  const onNavigateToMistakes = vi.fn();

  render(
    <ReviewSummaryCard
      result="win"
      playerColor="white"
      accuracy={defaultAccuracy}
      classificationCounts={playerCounts}
      phaseBreakdown={phaseBreakdown}
      openingName="Italian Game"
      moveCount={30}
      moves={mockMoves}
      onStartReview={onStartReview}
      onPlayAgain={onPlayAgain}
      onBackToCoach={onBackToCoach}
      onNavigateToMistakes={onNavigateToMistakes}
      {...overrides}
    />,
  );

  return { onStartReview, onPlayAgain, onBackToCoach, onNavigateToMistakes };
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
    // Move count is in the compact banner as "· 30 moves"
    expect(screen.getByTestId('result-banner')).toHaveTextContent('30 moves');
  });

  it('renders hero accuracy', () => {
    renderCard();
    expect(screen.getByTestId('hero-accuracy')).toBeInTheDocument();
  });

  it('renders eval graph in compact mode', () => {
    renderCard();
    expect(screen.getByTestId('summary-eval-graph')).toBeInTheDocument();
  });

  it('shows phase grades breakdown', () => {
    renderCard();
    expect(screen.getByTestId('phase-grades')).toBeInTheDocument();
  });

  it('shows opening name when provided', () => {
    renderCard();
    expect(screen.getByTestId('opening-label')).toHaveTextContent('Italian Game');
  });

  it('hides opening name when null', () => {
    renderCard({ openingName: null });
    expect(screen.queryByTestId('opening-label')).not.toBeInTheDocument();
  });

  it('shows coach narrative when provided', () => {
    renderCard({ narrativeSummary: 'Great game! You played well in the opening.' });
    expect(screen.getByTestId('coach-narrative')).toBeInTheDocument();
  });

  it('hides coach narrative when not provided', () => {
    renderCard({ narrativeSummary: undefined });
    expect(screen.queryByTestId('coach-narrative')).not.toBeInTheDocument();
  });

  it('shows missed opportunities callout when count > 0', () => {
    renderCard({ missedOpportunities: 3 });
    expect(screen.getByTestId('missed-opportunities-callout')).toBeInTheDocument();
    expect(screen.getByText(/3 missed opportunities/)).toBeInTheDocument();
  });

  it('hides missed opportunities callout when 0', () => {
    renderCard({ missedOpportunities: 0 });
    expect(screen.queryByTestId('missed-opportunities-callout')).not.toBeInTheDocument();
  });

  it('calls onStartReview with "quick" when Quick Review is clicked', () => {
    const { onStartReview } = renderCard();
    fireEvent.click(screen.getByTestId('start-review-quick-btn'));
    expect(onStartReview).toHaveBeenCalledWith('quick');
  });

  it('calls onStartReview with "full" when Full Review is clicked', () => {
    const { onStartReview } = renderCard();
    fireEvent.click(screen.getByTestId('start-review-full-btn'));
    expect(onStartReview).toHaveBeenCalledWith('full');
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
});
