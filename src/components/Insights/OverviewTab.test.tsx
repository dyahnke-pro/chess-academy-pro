import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/utils';
import { OverviewTab } from './OverviewTab';
import type { OverviewInsights } from '../../types';

// ─── ResizeObserver mock (needed for Recharts) ──────────────────────────────

vi.stubGlobal('ResizeObserver', class {
  observe(): void { /* noop */ }
  unobserve(): void { /* noop */ }
  disconnect(): void { /* noop */ }
});

// ─── Mock data ──────────────────────────────────────────────────────────────

function buildOverviewData(overrides?: Partial<OverviewInsights>): OverviewInsights {
  return {
    totalGames: 20,
    wins: 10,
    losses: 7,
    draws: 3,
    winRate: 50,
    winRateWhite: 55,
    winRateBlack: 45,
    avgElo: 1450,
    avgAccuracy: 72,
    highestBeaten: { name: 'GrandBot', elo: 1800, gameId: 'g1' },
    lowestLostTo: { name: 'Beginner', elo: 900, gameId: 'g2' },
    classificationCounts: {
      brilliant: 5, great: 12, good: 80, book: 20,
      miss: 3, inaccuracy: 15, mistake: 8, blunder: 4,
    },
    totalMoves: 600,
    avgMovesPerGame: 30,
    avgBrilliantsPerGame: 0.3,
    avgMistakesPerGame: 0.4,
    avgBlundersPerGame: 0.2,
    avgInaccuraciesPerGame: 0.8,
    bestMoveAgreement: 68,
    phaseAccuracy: [
      { phase: 'opening', accuracy: 85, moveCount: 100, mistakes: 3 },
      { phase: 'middlegame', accuracy: 70, moveCount: 300, mistakes: 15 },
      { phase: 'endgame', accuracy: 65, moveCount: 200, mistakes: 10 },
    ],
    accuracyWhite: 75,
    accuracyBlack: 69,
    strengths: ['Strong opening preparation (85% accuracy)'],
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('OverviewTab', () => {
  it('renders with data-testid="overview-tab"', () => {
    render(<OverviewTab data={buildOverviewData()} />);
    expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
  });

  it('shows W/L/D values', () => {
    render(<OverviewTab data={buildOverviewData()} />);
    expect(screen.getByText('Wins')).toBeInTheDocument();
    expect(screen.getByText('Losses')).toBeInTheDocument();
    expect(screen.getByText('Draws')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows per-game averages', () => {
    render(<OverviewTab data={buildOverviewData()} />);
    expect(screen.getByText('Accuracy')).toBeInTheDocument();
    expect(screen.getByText('72%')).toBeInTheDocument();
    expect(screen.getByText('Moves per game')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('Best move agreement')).toBeInTheDocument();
    expect(screen.getByText('68%')).toBeInTheDocument();
  });

  it('shows win rate by color', () => {
    render(<OverviewTab data={buildOverviewData()} />);
    expect(screen.getByText('Win rate as White')).toBeInTheDocument();
    expect(screen.getByText('55%')).toBeInTheDocument();
    expect(screen.getByText('Win rate as Black')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
  });

  it('shows highest beaten', () => {
    render(<OverviewTab data={buildOverviewData()} />);
    expect(screen.getByText('Highest rated beaten')).toBeInTheDocument();
    expect(screen.getByText('1800')).toBeInTheDocument();
  });

  it('shows strengths card when strengths exist', () => {
    render(<OverviewTab data={buildOverviewData()} />);
    expect(screen.getByTestId('strengths-card')).toBeInTheDocument();
    expect(screen.getByText('Strong opening preparation (85% accuracy)')).toBeInTheDocument();
  });

  it('does not show strengths card when no strengths', () => {
    render(<OverviewTab data={buildOverviewData({ strengths: [] })} />);
    expect(screen.queryByTestId('strengths-card')).not.toBeInTheDocument();
  });
});
