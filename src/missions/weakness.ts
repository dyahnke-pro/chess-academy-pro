/**
 * THE STUDENT'S WEAKEST TAUGHT HABITS — what a boss goes after
 * (WO-CAMPAIGN-MASTER, Lane E; docs/CAMPAIGN.md §7). PURE: the cards, the
 * mission record and the skill meters in; the top 2–3 targets out.
 *
 * ONLY habits taught at or below the boss's tier are eligible: a boss never
 * tests something the Campaign has not taught. Two signals, both the
 * student's own record, never a rating:
 *   - MISSION MISSES — the card's last 10 rows (taught or watched): a miss
 *     counts 1, a pass after a retry ½, an unreached game nothing.
 *   - THE SKILL METER the card trains (`card.skill`) — how far it sits below
 *     the student's own average meter. Mistake tags reach a card through this
 *     same meter (`METER_OF_TAG`), so they are counted once, here.
 * A card with no evidence on either signal is never a target: grey is not a
 * weakness (absent ≠ weak).
 */
import type { MissionCard, MissionId, MissionOutcome, PatternId } from './missionCard';
import type { MissionRecordRow } from './registry';
import type { SkillMeterId } from '../services/skillMeters';

export const WEAKNESS_WINDOW = 10;
export const MAX_TARGETS = 3;
/** Rating points of meter deficit that count as one full miss-rate. */
const METER_SCALE = 400;

const MISS_WEIGHT: Record<MissionOutcome, number | null> = {
  'pass-first-try': 0,
  'pass-retry': 0.5,
  'miss-shown': 1,
  missed: 1,
  incomplete: null,
};

export interface MeterReading {
  id: SkillMeterId;
  rating: number;
  /** Enough evidence to count. */
  rated: boolean;
}

export interface WeaknessTarget {
  cardId: MissionId;
  title: string;
  skill: SkillMeterId;
  pattern: PatternId | null;
  score: number;
  /** Weighted misses over the games that counted. */
  misses: number;
  games: number;
  /** The card's meter rating when rated, else null. */
  meterRating: number | null;
}

/** The boss's targets, weakest first. `maxLevel`: the highest level its tier
 *  has taught. */
export function rankWeaknesses(
  cards: readonly MissionCard[],
  maxLevel: number,
  record: readonly MissionRecordRow[],
  meters: readonly MeterReading[],
): WeaknessTarget[] {
  const rated = meters.filter((m) => m.rated);
  const mean = rated.length > 0 ? rated.reduce((s, m) => s + m.rating, 0) / rated.length : null;
  const meterOf = new Map(rated.map((m) => [m.id, m.rating]));
  return cards
    .map((card, order) => ({ card, order }))
    .filter(({ card }) => card.level <= maxLevel)
    .map(({ card, order }) => {
      const rows = record.filter((r) => r.missionId === card.id).sort((a, b) => a.at - b.at).slice(-WEAKNESS_WINDOW);
      const weights = rows.map((r) => MISS_WEIGHT[r.outcome]).filter((w): w is number => w !== null);
      const games = weights.length;
      const misses = weights.reduce((s, w) => s + w, 0);
      const meterRating = meterOf.get(card.skill) ?? null;
      const deficit = meterRating !== null && mean !== null ? Math.max(0, Math.min(1, (mean - meterRating) / METER_SCALE)) : 0;
      const score = (games > 0 ? misses / games : 0) + deficit;
      return { target: { cardId: card.id, title: card.title, skill: card.skill, pattern: card.pattern ?? null, score, misses, games, meterRating }, order, evidence: games > 0 || meterRating !== null };
    })
    .filter((t) => t.evidence && t.target.score > 0)
    .sort((a, b) => b.target.score - a.target.score || a.order - b.order)
    .slice(0, MAX_TARGETS)
    .map((t) => t.target);
}
