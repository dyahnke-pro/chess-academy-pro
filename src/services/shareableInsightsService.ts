/**
 * shareableInsightsService
 * ------------------------
 * Surfaces the one or two most punchy, headline-worthy insights from
 * the user's analyzed games. This is the "did you know you lose 62%
 * of games when X?" feature — the stuff worth screenshotting and
 * sharing on Reddit, X, or in a chess Discord.
 *
 * All inputs come from `gameInsightsService` (OverviewInsights +
 * OpeningInsights), which already aggregates per-move classifications,
 * accuracy, opening breakdowns, and highest-rated-beaten / lowest-
 * rated-lost-to. We don't recompute anything — this service just
 * picks the most interesting entries and phrases them for sharing.
 */
import {
  getOverviewInsights,
  getOpeningInsights,
} from './gameInsightsService';
import type { OverviewInsights, OpeningInsights, OpeningAggregateStats } from '../types';

export type InsightTone = 'strength' | 'weakness' | 'achievement' | 'pattern' | 'neutral';

export interface ShareableInsight {
  id: string;
  /** Punchy, quotable. Should read well out of context. */
  headline: string;
  /** Supporting data that makes the headline concrete. */
  detail: string;
  tone: InsightTone;
  /** Optional emoji prefix for the headline (used in share body). */
  emoji?: string;
  /** Raw stats — useful for UI variations that render numbers big. */
  stats?: { label: string; value: string }[];
}

/** Minimum games before we'll surface any insight. Under 5 games
 *  every stat is noise. */
const MIN_GAMES_FOR_INSIGHTS = 5;
/** Minimum games for an opening-specific insight — keeps "you won
 *  100% of your Scandinavian" from firing on 1 lucky game. */
const MIN_GAMES_PER_OPENING = 4;

/**
 * Compute and rank the user's top shareable insights. Returns an
 * empty array when there's not enough data to say anything honest.
 */
export async function computeShareableInsights(): Promise<ShareableInsight[]> {
  const [overview, openings] = await Promise.all([
    getOverviewInsights(),
    getOpeningInsights(),
  ]);

  if (overview.totalGames < MIN_GAMES_FOR_INSIGHTS) return [];

  const insights: ShareableInsight[] = [];

  const highestBeaten = buildHighestBeatenInsight(overview);
  if (highestBeaten) insights.push(highestBeaten);

  const bestOpening = buildBestOpeningInsight(openings);
  if (bestOpening) insights.push(bestOpening);

  const worstOpening = buildWorstOpeningInsight(openings);
  if (worstOpening) insights.push(worstOpening);

  const colorGap = buildColorGapInsight(overview);
  if (colorGap) insights.push(colorGap);

  const phaseWeakness = buildPhaseWeaknessInsight(overview);
  if (phaseWeakness) insights.push(phaseWeakness);

  const brilliants = buildBrilliantsInsight(overview);
  if (brilliants) insights.push(brilliants);

  return insights;
}

// ─── Individual insight builders ────────────────────────────────────────────

function buildHighestBeatenInsight(o: OverviewInsights): ShareableInsight | null {
  if (!o.highestBeaten) return null;
  return {
    id: 'highest-beaten',
    headline: `Beat a ${o.highestBeaten.elo}`,
    detail: `Highest-rated opponent you've beaten — ${o.highestBeaten.name}.`,
    tone: 'achievement',
    emoji: '🏆',
    stats: [
      { label: 'Opponent Elo', value: `${o.highestBeaten.elo}` },
    ],
  };
}

function buildBestOpeningInsight(o: OpeningInsights): ShareableInsight | null {
  const eligible = o.winRateByOpening.filter((op) => op.games >= MIN_GAMES_PER_OPENING);
  if (eligible.length === 0) return null;
  const best = eligible.reduce((a, b) => (a.winRate >= b.winRate ? a : b));
  if (best.winRate < 55) return null; // not a real strength
  return {
    id: 'best-opening',
    headline: `You win ${Math.round(best.winRate)}% with the ${best.name}`,
    detail: `${best.wins}–${best.losses}–${best.draws} across ${best.games} games. Your best opening.`,
    tone: 'strength',
    emoji: '⚡',
    stats: [
      { label: 'Win rate', value: `${Math.round(best.winRate)}%` },
      { label: 'Games', value: `${best.games}` },
    ],
  };
}

function buildWorstOpeningInsight(o: OpeningInsights): ShareableInsight | null {
  const eligible = o.winRateByOpening.filter((op) => op.games >= MIN_GAMES_PER_OPENING);
  if (eligible.length === 0) return null;
  const worst = eligible.reduce((a, b) => (a.winRate <= b.winRate ? a : b));
  if (worst.winRate > 35) return null; // not a standout weakness
  return {
    id: 'worst-opening',
    headline: `Struggling in the ${worst.name}`,
    detail: `${worst.wins}–${worst.losses}–${worst.draws} across ${worst.games} games — only ${Math.round(worst.winRate)}% win rate.`,
    tone: 'weakness',
    emoji: '⚠️',
    stats: [
      { label: 'Win rate', value: `${Math.round(worst.winRate)}%` },
      { label: 'Games', value: `${worst.games}` },
    ],
  };
}

function buildColorGapInsight(o: OverviewInsights): ShareableInsight | null {
  const gap = Math.abs(o.winRateWhite - o.winRateBlack);
  if (gap < 12) return null; // below 12pp, not surprising
  const stronger = o.winRateWhite > o.winRateBlack ? 'White' : 'Black';
  const weaker = stronger === 'White' ? 'Black' : 'White';
  const strongerWr = stronger === 'White' ? o.winRateWhite : o.winRateBlack;
  const weakerWr = stronger === 'White' ? o.winRateBlack : o.winRateWhite;
  return {
    id: 'color-gap',
    headline: `${Math.round(strongerWr)}% as ${stronger}, ${Math.round(weakerWr)}% as ${weaker}`,
    detail: `${Math.round(gap)}-point win-rate gap. ${stronger} is where you shine.`,
    tone: 'pattern',
    emoji: stronger === 'White' ? '♔' : '♚',
    stats: [
      { label: `As ${stronger}`, value: `${Math.round(strongerWr)}%` },
      { label: `As ${weaker}`, value: `${Math.round(weakerWr)}%` },
    ],
  };
}

function buildPhaseWeaknessInsight(o: OverviewInsights): ShareableInsight | null {
  if (o.phaseAccuracy.length < 2) return null;
  const sorted = [...o.phaseAccuracy].sort((a, b) => a.accuracy - b.accuracy);
  const worst = sorted[0];
  const best = sorted[sorted.length - 1];
  const gap = best.accuracy - worst.accuracy;
  if (gap < 10) return null;
  return {
    id: 'phase-weakness',
    headline: `Your ${worst.phase} is where games slip`,
    detail: `${Math.round(worst.accuracy)}% accuracy in the ${worst.phase}, vs ${Math.round(best.accuracy)}% in the ${best.phase}.`,
    tone: 'weakness',
    emoji: '📉',
    stats: [
      { label: worst.phase, value: `${Math.round(worst.accuracy)}%` },
      { label: best.phase, value: `${Math.round(best.accuracy)}%` },
    ],
  };
}

function buildBrilliantsInsight(o: OverviewInsights): ShareableInsight | null {
  const brilliants = o.classificationCounts.brilliant ?? 0;
  if (brilliants === 0) return null;
  return {
    id: 'brilliants',
    headline: `${brilliants} brilliant move${brilliants === 1 ? '' : 's'} across ${o.totalGames} games`,
    detail: `Stockfish flagged ${brilliants} of your moves as genuinely creative — the kind most players never find.`,
    tone: 'achievement',
    emoji: '✨',
    stats: [
      { label: 'Brilliants', value: `${brilliants}` },
      { label: 'Games', value: `${o.totalGames}` },
    ],
  };
}

/** Unused helper kept around for a future feature that drills into
 *  the single biggest opening gap. Exposed for testing. */
export function __rankOpeningsForTesting(openings: OpeningAggregateStats[]): OpeningAggregateStats[] {
  return [...openings].sort((a, b) => b.games - a.games);
}
