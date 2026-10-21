/**
 * A BOSS — a named personality closing a tier (docs/CAMPAIGN.md §7;
 * WO-CAMPAIGN-MASTER, Lane E). Data only: who it is, which levels it closes,
 * the coach's dials for the game, and the weights its scorers carry. Every
 * scorer re-ranks only moves inside the coach's acceptable window
 * (`moveScoring.scoreCandidates`), so a boss changes HOW the coach plays its
 * level, never how well.
 */
import type { BossId, CoachDials } from '../missionCard';
import type { ScorerWeights } from '../moveScoring';

export interface BossPreset {
  id: BossId;
  tier: number;
  name: string;
  /** Fixed, 2–3 sentences, spoken once before the game. */
  intro: string;
  /** The levels this boss closes; it unlocks when all of them are learned and
   *  only targets habits taught up to the highest. */
  levels: readonly number[];
  /** The coach's dials for the game: no rewinds, nothing planted. */
  dials: CoachDials;
  weights: ScorerWeights;
}
