import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { OpeningsTab } from './OpeningsTab';
import type { OpeningInsights } from '../../types';

// ─── ResizeObserver mock (needed for Recharts) ──────────────────────────────

vi.stubGlobal('ResizeObserver', class {
  observe(): void { /* noop */ }
  unobserve(): void { /* noop */ }
  disconnect(): void { /* noop */ }
});

// ─── Mock OpeningDrilldown's service deps ───────────────────────────────────

vi.mock('../../services/gameInsightsService', () => ({
  getGamesByOpening: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../services/gameReconstructionService', () => ({
  reconstructMovesFromGame: vi.fn().mockReturnValue([]),
}));

vi.mock('../../services/accuracyService', () => ({
  calculateAccuracy: vi.fn().mockReturnValue({ white: 80, black: 75, moveCount: 10 }),
  getClassificationCounts: vi.fn().mockReturnValue({
    brilliant: 0, great: 0, good: 5, book: 2, miss: 0, inaccuracy: 1, mistake: 1, blunder: 0,
  }),
}));

// ─── Mock data ──────────────────────────────────────────────────────────────

function buildOpeningData(overrides?: Partial<OpeningInsights>): OpeningInsights {
  return {
    repertoireCoverage: { inBook: 15, offBook: 5 },
    mostPlayedWhite: [
      {
        name: 'Ruy Lopez',
        eco: 'C65',
        openingId: 'op1',
        games: 8,
        wins: 5,
        losses: 2,
        draws: 1,
        winRate: 63,
        avgAccuracy: 0,
        gameIds: ['g1', 'g2'],
      },
      {
        name: 'Italian Game',
        eco: 'C50',
        openingId: 'op2',
        games: 4,
        wins: 2,
        losses: 1,
        draws: 1,
        winRate: 50,
        avgAccuracy: 0,
        gameIds: ['g3', 'g4'],
      },
    ],
    mostPlayedBlack: [
      {
        name: 'Sicilian Defense',
        eco: 'B20',
        openingId: 'op3',
        games: 6,
        wins: 3,
        losses: 2,
        draws: 1,
        winRate: 50,
        avgAccuracy: 0,
        gameIds: ['g5', 'g6'],
      },
    ],
    winRateByOpening: [
      {
        name: 'Ruy Lopez',
        eco: 'C65',
        openingId: 'op1',
        games: 8,
        wins: 5,
        losses: 2,
        draws: 1,
        winRate: 63,
        avgAccuracy: 0,
        gameIds: [],
      },
    ],
    drillAccuracyByOpening: [
      { name: 'Ruy Lopez', accuracy: 85, attempts: 10 },
    ],
    strengths: ['Ruy Lopez \u2014 63% win rate, 85% drill accuracy'],
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('OpeningsTab', () => {
  it('renders with data-testid="openings-tab"', () => {
    render(<OpeningsTab data={buildOpeningData()} />);
    expect(screen.getByTestId('openings-tab')).toBeInTheDocument();
  });

  it('shows most played openings', () => {
    render(<OpeningsTab data={buildOpeningData()} />);
    expect(screen.getByText('Most Played as White')).toBeInTheDocument();
    expect(screen.getByText('Most Played as Black')).toBeInTheDocument();
    expect(screen.getByText('Italian Game')).toBeInTheDocument();
    expect(screen.getByText('Sicilian Defense')).toBeInTheDocument();
    // Ruy Lopez appears multiple times (most played + win rate chart)
    expect(screen.getAllByText(/Ruy Lopez/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows repertoire coverage', () => {
    render(<OpeningsTab data={buildOpeningData()} />);
    expect(screen.getByText('In repertoire')).toBeInTheDocument();
    expect(screen.getByText('Off-book')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows strengths card', () => {
    render(<OpeningsTab data={buildOpeningData()} />);
    expect(screen.getByTestId('strengths-card')).toBeInTheDocument();
  });

  it('clicking an opening shows drilldown', async () => {
    render(<OpeningsTab data={buildOpeningData()} />);

    const openingRows = screen.getAllByTestId('opening-row');
    fireEvent.click(openingRows[0]);

    await waitFor(() => {
      expect(screen.getByTestId('opening-drilldown')).toBeInTheDocument();
    });
  });

  it('drilldown back button returns to main view', async () => {
    render(<OpeningsTab data={buildOpeningData()} />);

    const openingRows = screen.getAllByTestId('opening-row');
    fireEvent.click(openingRows[0]);

    await waitFor(() => {
      expect(screen.getByTestId('opening-drilldown')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('drilldown-back'));

    await waitFor(() => {
      expect(screen.getByTestId('openings-tab')).toBeInTheDocument();
    });
  });
});
