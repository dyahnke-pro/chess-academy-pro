/**
 * A BOSS — a named personality closing a tier (docs/CAMPAIGN.md §7;
 * WO-CAMPAIGN-MASTER, Lane E). Data only: who it is, which levels it closes,
 * the coach's dials for the game, and the weights its scorers carry. Every
 * scorer re-ranks only moves inside the coach's acceptable window
 * (`moveScoring.scoreCandidates`), so a boss changes HOW the coach plays its
 * level, never how well — only the `strengthOffset` dial does that.
 */
import type { BossId, CoachDials } from '../missionCard';
import type { ScorerWeights } from '../moveScoring';

/** When a boss opens. REQUIRED on every preset: a chapter of mission cards and
 *  a chapter of silent games open differently, and a new boss must say which
 *  it closes rather than inherit a gate that can never open. */
export type BossOpening =
  /** A chapter of cards: open when every mission of its levels — opening,
   *  middlegame and endgame of each — exists and has graduated once. */
  | { kind: 'missions' }
  /** A chapter of SILENT games (the advanced track, Levels 37–50: no mission
   *  cards to graduate). Open once the boss `after` has been beaten (a won
   *  attempt on the record); `after: null` — the track's first boss — is open
   *  from the start. */
  | { kind: 'after-boss'; after: BossId | null };

export interface BossPreset {
  id: BossId;
  tier: number;
  name: string;
  /** Fixed, 2–3 sentences, spoken once before the game, when the record gave
   *  it weak spots it can steer at (it says so). `bossIntroFor` picks. */
  intro: string;
  /** Fixed, the same intro WITHOUT the claim that it will use the student's
   *  weak spots — said when it has none it can steer at (a fresh record: grey
   *  is not weak; or only habits with no steerable pattern). REQUIRED, so no
   *  boss can promise a hunt it cannot make. */
  introNoTargets: string;
  /** The levels this boss closes; it targets habits taught up to the highest. */
  levels: readonly number[];
  opens: BossOpening;
  /** The coach's dials for the game: no rewinds, nothing planted. */
  dials: CoachDials;
  weights: ScorerWeights;
}
