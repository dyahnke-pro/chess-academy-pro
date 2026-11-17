/**
 * THE BEGINNER REGISTER — chosen by the student's record, never the rating
 * (WO-SPEEDRUN-01 S5, David 2026-11-17: "adjust the narrations to match how
 * Danya teaches lower elo players").
 *
 * In his games against players under 800, Danya teaches development, loose
 * pieces and the simple tactic that wins them, in plain words, and names the
 * principle every time. The app had that register in two places, each with its
 * own rule: chat wrote moves in words below a 1000 RATING, and Learn rode the
 * fundamental every turn for a SELF-REPORTED beginner below 1000. Two rules for
 * one register, and neither read what the student actually does on the board.
 *
 * Now one verdict. The record decides once it can: the Beginner tactics (loose
 * pieces, the one-move tactics, `levelTags('beginner')`) pooled over both seats,
 * posed at least `HOLD_MIN_POSED` times. The student is past the register when
 * the focus's own gate opens the Intermediate level for them — the Beginner
 * level holding ≥ 75% with no motif in it red (`openMotifLevels`), the same
 * test that opens harder tactics, so the coach never calls a student past
 * beginner while it still withholds their next level. Below that many posed,
 * the record cannot say, and the cold-start prior answers: what they told the
 * first-run screen, else their measured rating — an empty record teaches
 * (§ GREY MEANS TEACH IT).
 *
 * Register only: the words and the fundamental every turn. How much the coach
 * says is never this switch's call.
 */
import type { MisconceptionTagId } from '../data/misconceptionTags';
import { levelTags } from '../data/tacticMotifs';
import { openMotifLevels, pooledHold } from '../coach/focus/focusSetup';
import { HOLD_MIN_POSED, type HoldRecord } from './holdRate';
import { coreRatingTier, type SelfReportedBand } from './ratingBands';

export interface BeginnerVerdict {
  beginner: boolean;
  /** Which input answered: the record, or the cold-start prior. */
  source: 'record' | 'prior';
  /** How many times the board posed the Beginner tactics. */
  posed: number;
}

/** The cold-start prior, for a record that cannot answer yet. */
export function beginnerPrior(p: { skillBand?: SelfReportedBand; currentRating: number } | null | undefined): boolean {
  if (!p) return true;
  if (p.skillBand === 'intermediate' || p.skillBand === 'advanced') return false;
  return coreRatingTier(p.currentRating) === 'beginner';
}

export function beginnerVerdict(
  holds: ReadonlyMap<MisconceptionTagId, HoldRecord>,
  prior: boolean,
): BeginnerVerdict {
  const posed = pooledHold(levelTags('beginner'), holds).posed;
  if (posed < HOLD_MIN_POSED) return { beginner: prior, source: 'prior', posed };
  return { beginner: !openMotifLevels(holds).has('intermediate'), source: 'record', posed };
}
