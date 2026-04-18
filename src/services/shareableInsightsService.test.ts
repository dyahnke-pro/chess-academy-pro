import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeShareableInsights } from './shareableInsightsService';
import type { OverviewInsights, OpeningInsights } from '../types';

vi.mock('./gameInsightsService', () => ({
  getOverviewInsights: vi.fn(),
  getOpeningInsights: vi.fn(),
}));

import { getOverviewInsights, getOpeningInsights } from './gameInsightsService';

function buildOverview(overrides?: Partial<OverviewInsights>): OverviewInsights {
  return {
    totalGames: 50,
    wins: 25,
    losses: 20,
    draws: 5,
    winRate: 50,
    winRateWhite: 55,
    winRateBlack: 45,
    avgElo: 1500,
    avgAccuracy: 72,
    highestBeaten: null,
    lowestLostTo: null,
    classificationCounts: {
      brilliant: 0,
      great: 0,
      best: 0,
      good: 0,
      book: 0,
      inaccuracy: 0,
      mistake: 0,
      blunder: 0,
      miss: 0,
    },
    totalMoves: 2000,
    avgMovesPerGame: 40,
    avgBrilliantsPerGame: 0,
    avgMistakesPerGame: 0,
    avgBlundersPerGame: 0,
    avgInaccuraciesPerGame: 0,
    bestMoveAgreement: 0,
    phaseAccuracy: [],
    accuracyWhite: 0,
    accuracyBlack: 0,
    strengths: [],
    analyzedGameCount: 50,
    gamesNeedingAnalysis: 0,
    ...overrides,
  };
}

function buildOpenings(overrides?: Partial<OpeningInsights>): OpeningInsights {
  return {
    repertoireCoverage: { inBook: 0, offBook: 0 },
    mostPlayedWhite: [],
    mostPlayedBlack: [],
    winRateByOpening: [],
    drillAccuracyByOpening: [],
    strengths: [],
    ...overrides,
  };
}

describe('computeShareableInsights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when the user has fewer than 5 games', async () => {
    vi.mocked(getOverviewInsights).mockResolvedValue(buildOverview({ totalGames: 3 }));
    vi.mocked(getOpeningInsights).mockResolvedValue(buildOpenings());

    const insights = await computeShareableInsights();
    expect(insights).toEqual([]);
  });

  it('surfaces a highest-beaten achievement card when data available', async () => {
    vi.mocked(getOverviewInsights).mockResolvedValue(buildOverview({
      highestBeaten: { name: 'GrandmasterX', elo: 2100, gameId: 'g1' },
    }));
    vi.mocked(getOpeningInsights).mockResolvedValue(buildOpenings());

    const insights = await computeShareableInsights();
    const highest = insights.find((i) => i.id === 'highest-beaten');
    expect(highest).toBeDefined();
    expect(highest?.headline).toContain('2100');
    expect(highest?.tone).toBe('achievement');
  });

  it('surfaces a best-opening strength when win rate is >= 55% and sample size >= 4', async () => {
    vi.mocked(getOverviewInsights).mockResolvedValue(buildOverview());
    vi.mocked(getOpeningInsights).mockResolvedValue(buildOpenings({
      winRateByOpening: [
        { name: 'Italian Game', eco: 'C50', openingId: null, games: 10, wins: 7, losses: 2, draws: 1, winRate: 70, avgAccuracy: 80, gameIds: [] },
      ],
    }));

    const insights = await computeShareableInsights();
    const best = insights.find((i) => i.id === 'best-opening');
    expect(best).toBeDefined();
    expect(best?.headline).toContain('70%');
    expect(best?.headline).toContain('Italian Game');
    expect(best?.tone).toBe('strength');
  });

  it('skips best-opening when the win rate is below 55%', async () => {
    vi.mocked(getOverviewInsights).mockResolvedValue(buildOverview());
    vi.mocked(getOpeningInsights).mockResolvedValue(buildOpenings({
      winRateByOpening: [
        { name: 'Italian Game', eco: 'C50', openingId: null, games: 10, wins: 5, losses: 4, draws: 1, winRate: 50, avgAccuracy: 70, gameIds: [] },
      ],
    }));

    const insights = await computeShareableInsights();
    expect(insights.find((i) => i.id === 'best-opening')).toBeUndefined();
  });

  it('skips best-opening when fewer than 4 games in that opening', async () => {
    vi.mocked(getOverviewInsights).mockResolvedValue(buildOverview());
    vi.mocked(getOpeningInsights).mockResolvedValue(buildOpenings({
      winRateByOpening: [
        { name: 'Italian Game', eco: 'C50', openingId: null, games: 2, wins: 2, losses: 0, draws: 0, winRate: 100, avgAccuracy: 80, gameIds: [] },
      ],
    }));

    const insights = await computeShareableInsights();
    expect(insights.find((i) => i.id === 'best-opening')).toBeUndefined();
  });

  it('surfaces a worst-opening weakness when win rate is <= 35%', async () => {
    vi.mocked(getOverviewInsights).mockResolvedValue(buildOverview());
    vi.mocked(getOpeningInsights).mockResolvedValue(buildOpenings({
      winRateByOpening: [
        { name: 'Sicilian Defense', eco: 'B20', openingId: null, games: 9, wins: 2, losses: 6, draws: 1, winRate: 22, avgAccuracy: 60, gameIds: [] },
      ],
    }));

    const insights = await computeShareableInsights();
    const worst = insights.find((i) => i.id === 'worst-opening');
    expect(worst).toBeDefined();
    expect(worst?.headline).toContain('Sicilian');
    expect(worst?.tone).toBe('weakness');
  });

  it('surfaces a color-gap insight when gap is >= 12 percentage points', async () => {
    vi.mocked(getOverviewInsights).mockResolvedValue(buildOverview({
      winRateWhite: 65,
      winRateBlack: 45,
    }));
    vi.mocked(getOpeningInsights).mockResolvedValue(buildOpenings());

    const insights = await computeShareableInsights();
    const colorGap = insights.find((i) => i.id === 'color-gap');
    expect(colorGap).toBeDefined();
    expect(colorGap?.headline).toMatch(/65%|45%/);
    expect(colorGap?.tone).toBe('pattern');
  });

  it('skips color-gap when gap is <12 pp (nothing remarkable)', async () => {
    vi.mocked(getOverviewInsights).mockResolvedValue(buildOverview({
      winRateWhite: 52,
      winRateBlack: 48,
    }));
    vi.mocked(getOpeningInsights).mockResolvedValue(buildOpenings());

    const insights = await computeShareableInsights();
    expect(insights.find((i) => i.id === 'color-gap')).toBeUndefined();
  });

  it('surfaces a phase-weakness insight when phase accuracy gap is >= 10 pp', async () => {
    vi.mocked(getOverviewInsights).mockResolvedValue(buildOverview({
      phaseAccuracy: [
        { phase: 'opening', accuracy: 82, moves: 400 },
        { phase: 'middlegame', accuracy: 70, moves: 800 },
        { phase: 'endgame', accuracy: 58, moves: 300 },
      ],
    }));
    vi.mocked(getOpeningInsights).mockResolvedValue(buildOpenings());

    const insights = await computeShareableInsights();
    const phase = insights.find((i) => i.id === 'phase-weakness');
    expect(phase).toBeDefined();
    expect(phase?.headline).toContain('endgame');
    expect(phase?.detail).toContain('58%');
    expect(phase?.detail).toContain('82%');
    expect(phase?.tone).toBe('weakness');
  });

  it('surfaces a brilliants insight when there is at least one brilliant move', async () => {
    vi.mocked(getOverviewInsights).mockResolvedValue(buildOverview({
      classificationCounts: {
        brilliant: 3,
        great: 0,
        best: 0,
        good: 0,
        book: 0,
        inaccuracy: 0,
        mistake: 0,
        blunder: 0,
        miss: 0,
      },
    }));
    vi.mocked(getOpeningInsights).mockResolvedValue(buildOpenings());

    const insights = await computeShareableInsights();
    const b = insights.find((i) => i.id === 'brilliants');
    expect(b).toBeDefined();
    expect(b?.headline).toContain('3 brilliant');
    expect(b?.tone).toBe('achievement');
  });

  it('returns several insights in priority order when multiple conditions match', async () => {
    vi.mocked(getOverviewInsights).mockResolvedValue(buildOverview({
      highestBeaten: { name: 'Opp', elo: 2000, gameId: 'g1' },
      winRateWhite: 68,
      winRateBlack: 40,
      classificationCounts: {
        brilliant: 2, great: 0, best: 0, good: 0, book: 0,
        inaccuracy: 0, mistake: 0, blunder: 0, miss: 0,
      },
      phaseAccuracy: [
        { phase: 'opening', accuracy: 85, moves: 200 },
        { phase: 'endgame', accuracy: 55, moves: 200 },
      ],
    }));
    vi.mocked(getOpeningInsights).mockResolvedValue(buildOpenings({
      winRateByOpening: [
        { name: 'Italian Game', eco: 'C50', openingId: null, games: 12, wins: 9, losses: 2, draws: 1, winRate: 75, avgAccuracy: 82, gameIds: [] },
      ],
    }));

    const insights = await computeShareableInsights();
    const ids = insights.map((i) => i.id);
    expect(ids).toContain('highest-beaten');
    expect(ids).toContain('best-opening');
    expect(ids).toContain('color-gap');
    expect(ids).toContain('phase-weakness');
    expect(ids).toContain('brilliants');
  });
});
