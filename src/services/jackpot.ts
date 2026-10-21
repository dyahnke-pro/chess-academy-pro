/**
 * jackpot — the coins, the streak multiplier and the player's XP level behind
 * the gold jackpot bar (David 2026-10-20: "The progress bar needs to be larger
 * and gold glowing. Like a slot machine!! This needs to have the dopamine
 * rushes!!" → "I want it over the top! Something that makes it exciting to
 * play!!").
 *
 * Pure: a reward moment in, coins out. It never decides WHAT earned a reward —
 * that stays with `learnReward` (only skill earns one); this table only says
 * how much each moment pays, exhaustive over `RewardKind` so a new moment fails
 * to compile until someone prices it.
 */
import type { RewardKind } from './rewardEvents';

/** What each reward moment pays before the multiplier. */
export const COINS: Record<RewardKind, number> = {
  pip: 5,
  solved: 25,
  levelUp: 25,
  rankUp: 50,
  newBest: 100,
  miss: 0,
  decision: 20,
  saved: 25,
  punished: 30,
  onlyMove: 40,
  gem: 60,
  proven: 100,
  checkmate: 150,
  mission: 120,
  missionRetry: 40,
  jackpot: 0,
};

/** The decision streak raises the stakes: 3 in a row doubles every coin,
 *  5 triples it, 8 pays five times. */
export function multiplierFor(streak: number): 1 | 2 | 3 | 5 {
  if (streak >= 8) return 5;
  if (streak >= 5) return 3;
  if (streak >= 3) return 2;
  return 1;
}

/** Coins a moment pays at this streak. */
export function coinsFor(kind: RewardKind, streak: number): number {
  return COINS[kind] * multiplierFor(streak);
}

/** Total XP needed to REACH `level` (level 1 = 0). Each level costs 100 more
 *  than the last: 100, 200, 300 … so the early jackpots come fast. */
export function xpForLevel(level: number): number {
  const n = Math.max(1, Math.floor(level)) - 1;
  return 50 * n * (n + 1);
}

/** The level an XP total stands at, and how far toward the next (0..1). */
export function levelOfXp(xp: number): { level: number; toNext: number; into: number; span: number } {
  const x = Math.max(0, Math.floor(xp));
  let level = 1;
  while (xpForLevel(level + 1) <= x) level++;
  const base = xpForLevel(level);
  const span = xpForLevel(level + 1) - base;
  return { level, toNext: span > 0 ? (x - base) / span : 0, into: x - base, span };
}

/** One payout: the new total, and whether it crossed into a new level. */
export function payout(xp: number, coins: number): { xp: number; level: number; levelsGained: number } {
  const before = levelOfXp(xp).level;
  const next = Math.max(0, Math.floor(xp + coins));
  const after = levelOfXp(next).level;
  return { xp: next, level: after, levelsGained: after - before };
}
