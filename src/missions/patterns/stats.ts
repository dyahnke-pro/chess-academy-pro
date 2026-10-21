/**
 * ARRIVAL STATS — did a card's target pattern actually arrive in a game?
 * (WO-CAMPAIGN-MASTER, Lane D). The only reader and writer of the Dexie
 * `patternStats` store (v44).
 *
 * The CARD SHIP RULE (docs/CAMPAIGN.md §3) reads this: a card ships only when
 * its target occurs in at least its `arrivalBar` share of games. Its reader
 * today is the gate audit (the rows in Dexie); an in-app reader comes with the
 * surface that needs one. One row per
 * mission per game, keyed `${missionId}:${gameId}` — a second write for the
 * same pair overwrites rather than duplicates, so a resumed game cannot count
 * twice. The rows travel with the backup (the store is in the export).
 */
import { db } from '../../db/schema';
import type { MissionId, PatternId, PatternStatRecord } from '../missionCard';

export function patternStatId(missionId: MissionId, gameId: string): string {
  return `${missionId}:${gameId}`;
}

/** Record whether the pattern arrived in this game. Never throws — the stat
 *  is bookkeeping and must not stop a game. */
export async function recordPatternArrival(row: {
  missionId: MissionId;
  patternId: PatternId;
  gameId: string;
  arrived: boolean;
}): Promise<void> {
  const full: PatternStatRecord = { ...row, id: patternStatId(row.missionId, row.gameId), at: Date.now() };
  try {
    await db.patternStats.put(full);
  } catch { /* the stat is a bonus, never a blocker */ }
}
