import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test/utils';
import { GameInsightsPage } from './GameInsightsPage';
import type { OverviewInsights, OpeningInsights, MistakeInsights, TacticInsights, MoveClassificationCounts } from '../../types';

// ─── ResizeObserver mock (needed for Recharts) ─────────────���────────────────

vi.stubGlobal('ResizeObserver', class {
  observe(): void { /* noop */ }
  unobserve(): void { /* noop */ }
  disconnect(): void { /* noop */ }
});

// ─── Navigate mock ──────────────────────────���───────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// ─── Service mocks ──────────────��───────────────────────────���───────────────

const mockGetOverviewInsights = vi.fn<() => Promise<OverviewInsights>>();
const mockGetOpeningInsights = vi.fn<() => Promise<OpeningInsights>>();
const mockGetMistakeInsights = vi.fn<() => Promise<MistakeInsights>>();
const mockGetTacticInsights = vi.fn<() => Promise<TacticInsights>>();

vi.mock('../../services/gameInsightsService', () => ({
  getOverviewInsights: (): unknown => mockGetOverviewInsights(),
  getOpeningInsights: (): unknown => mockGetOpeningInsights(),
  getMistakeInsights: (): unknown => mockGetMistakeInsights(),
  getTacticInsights: (): unknown => mockGetTacticInsights(),
}));

// ─── Mock data ──────────────���───────────────────────────────────────────────

function emptyClassifications(): MoveClassificationCounts {
  return { brilliant: 0, great: 0, good: 0, book: 0, miss: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
}

const mockOverview: OverviewInsights = {
  totalGames: 10,
  wins: 5,
  losses: 3,
  draws: 2,
  winRate: 50,
  winRateWhite: 60,
  winRateBlack: 40,
  avgElo: 1500,
  avgAccuracy: 78,
  highestBeaten: null,
  lowestLostTo: null,
  classificationCounts: emptyClassifications(),
  totalMoves: 300,
  avgMovesPerGame: 30,
  avgBrilliantsPerGame: 0.5,
  avgMistakesPerGame: 1.2,
  avgBlundersPerGame: 0.3,
  avgInaccuraciesPerGame: 2.1,
  bestMoveAgreement: 65,
  phaseAccuracy: [],
  accuracyWhite: 80,
  accuracyBlack: 75,
  strengths: [],
};

const mockOpenings: OpeningInsights = {
  repertoireCoverage: { inBook: 5, offBook: 5 },
  mostPlayedWhite: [],
  mostPlayedBlack: [],
  winRateByOpening: [],
  drillAccuracyByOpening: [],
  strengths: [],
};

const mockMistakes: MistakeInsights = {
  errorBreakdown: { blunders: 3, mistakes: 5, inaccuracies: 10 },
  missedWins: 2,
  avgCpLoss: 45,
  errorsByPhase: [
    { phase: 'opening', errors: 3, avgCpLoss: 30 },
    { phase: 'middlegame', errors: 10, avgCpLoss: 50 },
    { phase: 'endgame', errors: 5, avgCpLoss: 40 },
  ],
  errorsBySituation: { winning: 5, equal: 8, losing: 5 },
  thrownWins: 1,
  lateGameCollapses: 2,
  costliestMistakes: [],
  puzzleProgress: { unsolved: 3, solved: 5, mastered: 2 },
  totalGames: 10,
  strengths: [],
};

const mockTactics: TacticInsights = {
  tacticsFound: { brilliant: 3, great: 7 },
  avgBrilliantsPerGame: 0.3,
  avgGreatPerGame: 0.7,
  tacticsByType: [],
  bestSequences: [],
  worstMisses: [],
  missedByType: [],
  foundVsMissed: { found: 10, missed: 5 },
  awarenessRate: 67,
  missedByPhase: [],
  totalGames: 10,
  strengths: [],
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('GameInsightsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOverviewInsights.mockResolvedValue(mockOverview);
    mockGetOpeningInsights.mockResolvedValue(mockOpenings);
    mockGetMistakeInsights.mockResolvedValue(mockMistakes);
    mockGetTacticInsights.mockResolvedValue(mockTactics);
  });

  it('shows loading state initially', () => {
    // Never resolve the promises so loading persists
    mockGetOverviewInsights.mockReturnValue(new Promise(() => {}));
    mockGetOpeningInsights.mockReturnValue(new Promise(() => {}));
    mockGetMistakeInsights.mockReturnValue(new Promise(() => {}));
    mockGetTacticInsights.mockReturnValue(new Promise(() => {}));

    render(<GameInsightsPage />);
    expect(screen.getByTestId('insights-loading')).toBeInTheDocument();
  });

  it('renders main page after data loads', async () => {
    render(<GameInsightsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('game-insights-page')).toBeInTheDocument();
    });
  });

  it('shows summary row with games, win rate, avg elo, accuracy', async () => {
    render(<GameInsightsPage />);

    await waitFor(() => {
      // Summary labels
      expect(screen.getAllByText('Games').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Win Rate')).toBeInTheDocument();
      expect(screen.getByText('Avg ELO')).toBeInTheDocument();
      // Accuracy appears in summary and in overview tab per-game section
      expect(screen.getAllByText('Accuracy').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('has a back button', async () => {
    render(<GameInsightsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('back-btn')).toBeInTheDocument();
    });
  });

  it('has a search input', async () => {
    render(<GameInsightsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('search-input')).toBeInTheDocument();
    });
  });

  it('switches to Openings tab on click', async () => {
    render(<GameInsightsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('game-insights-page')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('tab-openings'));

    await waitFor(() => {
      expect(screen.getByTestId('openings-tab')).toBeInTheDocument();
    });
  });

  it('switches to Mistakes tab on click', async () => {
    render(<GameInsightsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('game-insights-page')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('tab-mistakes'));

    await waitFor(() => {
      expect(screen.getByTestId('mistakes-tab')).toBeInTheDocument();
    });
  });

  it('switches to Tactics tab on click', async () => {
    render(<GameInsightsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('game-insights-page')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('tab-tactics'));

    await waitFor(() => {
      expect(screen.getByTestId('tactics-tab')).toBeInTheDocument();
    });
  });

  it('shows overview tab by default', async () => {
    render(<GameInsightsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
    });
  });
});
