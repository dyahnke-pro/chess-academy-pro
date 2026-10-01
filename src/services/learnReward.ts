/**
 * learnReward — WHICH moves in a Learn game earn the reward layer (David
 * 2026-10-01, docs/plans/2026-10-01-learn-dopamine.md).
 *
 * THE ONE RULE: only skill earns a reward. The grade already exists — the
 * live post-move classifier (`gradePlayedMove` → `MoveReason`) decides what
 * the move WAS; this table only says which of those are worth a chime. Book
 * moves are never graded, recaptures are routine, and `best`/`solid` on a calm
 * board are not finds — a chime on every best move is noise by move ten.
 *
 * Exhaustive on purpose: a new MoveReason fails to compile until someone
 * decides whether it earns a reward. The coach's VOICE still never praises
 * (Narration Voice Rule 5) — this is the machine celebrating, not the coach.
 */
import type { MoveReason } from './moveReason';
import type { RewardKind } from './rewardEvents';

export const LEARN_REWARD: Record<MoveReason, RewardKind | null> = {
  mate: 'gem',
  // Faults — no sound, no flash; the coach teaches it, the record keeps it.
  'hung-piece': null,
  'ignored-threat': null,
  'walked-into-tactic': null,
  'missed-forcing-win': null,
  'lost-the-thread': null,
  'imprecise-defence': null,
  'second-best': null,
  // Merits that took finding.
  'only-move': 'onlyMove',
  'clear-best': 'decision',
  'defends-threat': 'saved',
  'wins-material': 'punished',
  // Merits that did not — the board did not pose a question.
  best: null,
  solid: null,
};

export interface LearnRewardInput {
  reason: MoveReason;
  fault: boolean;
  /** Taking back what they just took is routine, never a find. */
  isRecapture: boolean;
}

/** The reward this move earned, or null. */
export function learnRewardFor(i: LearnRewardInput): RewardKind | null {
  if (i.isRecapture && !i.fault) return null;
  return LEARN_REWARD[i.reason];
}

/** The game's running tally — the decision streak and the recap medals. */
export interface LearnTally {
  /** Decision moments answered in a row (book/obvious moves neither count
   *  nor break it; a fault breaks it). */
  streak: number;
  bestStreak: number;
  found: number;
  /** Real questions the board posed: the found ones plus the faults. */
  posed: number;
  saved: number;
  punished: number;
  gems: number;
  proven: number;
}

export const EMPTY_TALLY: LearnTally = {
  streak: 0, bestStreak: 0, found: 0, posed: 0, saved: 0, punished: 0, gems: 0, proven: 0,
};

/** Fold one graded move into the tally. Pure. */
export function tallyMove(t: LearnTally, kind: RewardKind | null, fault: boolean): LearnTally {
  if (fault) return { ...t, streak: 0, posed: t.posed + 1 };
  if (!kind) return t;
  const streak = t.streak + 1;
  return {
    ...t,
    streak,
    bestStreak: Math.max(t.bestStreak, streak),
    found: t.found + 1,
    posed: t.posed + 1,
    saved: t.saved + (kind === 'saved' ? 1 : 0),
    punished: t.punished + (kind === 'punished' ? 1 : 0),
    gems: t.gems + (kind === 'gem' ? 1 : 0),
  };
}
