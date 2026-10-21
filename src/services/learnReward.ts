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
 * decides whether it earns a reward. When one fires, the coach praises it
 * from the one praise table (`dnaRules.EARNED_PRAISE`, David 2026-10-18:
 * "Praise!") and says the why — the only praise the voice rules let through.
 */
import type { MoveReason } from './moveReason';
import type { RewardKind, RewardEvent } from './rewardEvents';
import { reward } from './rewardService';
import { earnedPraise, isPraiseKind } from './dnaRules';
import { Chess } from 'chess.js';
import { computeMustDefend } from './threatOut';

/** Learn's ONE door to the reward layer — the surface never calls the
 *  reward service directly, so what Learn may celebrate is decided here. */
export function fireLearnReward(e: RewardEvent): void {
  reward(e);
}

export const LEARN_REWARD: Record<MoveReason, RewardKind | null> = {
  // Faults — no sound, no flash; the coach teaches it, the record keeps it.
  // (Delivering mate is rewarded off the move itself — the 'checkmate' burst.)
  'allows-mate': null,
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

interface LearnRewardInput {
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

/** The praise a burst earns, said before the why (David 2026-10-18: "Praise!"),
 *  from the one table the voice rules let through — or null for a kind that
 *  speaks no praise (a gem, a fixed skill). */
export function learnPraise(kind: RewardKind | null, streak: number, rot: number): string | null {
  return isPraiseKind(kind) ? earnedPraise(kind, streak, rot) : null;
}

/** WHERE EARNED PRAISE IS SAID — never bare (prod Learn audit 2026-10-20:
 *  "Exactly right." spoken alone; the found-move lane that was to give its why
 *  spoke later, or was held). A save names what it saved and speaks now. A
 *  found move's praise rides the found-move lane's OWN sentence, so it speaks
 *  only where that why speaks. With neither, nothing is said. */
export function placePraise(
  praise: string | null,
  why: { saved: string | null; foundSpeaks: boolean },
): { now: string | null; onFound: string | null } {
  if (!praise) return { now: null, onFound: null };
  if (why.saved) return { now: `${praise} ${why.saved}`, onFound: null };
  if (why.foundSpeaks) return { now: null, onFound: praise };
  return { now: null, onFound: null };
}

const PIECE_WORD: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };

/** THE WHY OF A SAVE (Learn audit 2026-10-18: "Good defence." spoken alone).
 *  Praise never goes out bare: a defence names what it saved — the piece of
 *  the student's that was under attack before the move and is safe after it.
 *  Null when the board does not show one, and then the praise is not said. */
export function savedWhy(fenBefore: string, san: string, side: 'w' | 'b'): string | null {
  try {
    const before = computeMustDefend(fenBefore, side).pieces;
    if (before.length === 0) return null;
    const c = new Chess(fenBefore);
    const m = c.move(san);
    if (!m) return null;
    const after = new Set(computeMustDefend(c.fen(), side).pieces.map((p) => p.square));
    const saved = before.find((p) => p.square === m.from ? !after.has(m.to) : !after.has(p.square));
    if (!saved) return null;
    const name = PIECE_WORD[saved.piece.toLowerCase()] ?? 'piece';
    // The piece is the subject, the move how it gets out: "Rg5 takes your
    // rook out of the attack" is spoken "rook to g5 takes your rook" — a
    // capture of the student's own rook (David's record, 2026-10-19).
    return saved.square === m.from
      ? `Your ${name} steps out of the attack with ${san}.`
      : `${san} keeps your ${name} on ${saved.square} safe.`;
  } catch { return null; }
}
