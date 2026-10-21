/**
 * ARRIVAL STATS — did a card's target pattern actually arrive in a game?
 * (WO-CAMPAIGN-MASTER, Lane D). The only reader and writer of the Dexie
 * `patternStats` store (v44).
 *
 * The CARD SHIP RULE (docs/CAMPAIGN.md §3) reads this: a card ships only when
 * its target occurs in at least its `arrivalBar` share of games. One row per
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

export interface ArrivalCount {
  games: number;
  arrived: number;
  /** arrived / games; null when no game is on the record (absent ≠ 0%). */
  rate: number | null;
}

/** How many of the mission's games the pattern arrived in. */
export async function arrivalCount(missionId: MissionId): Promise<ArrivalCount> {
  try {
    const rows = await db.patternStats.where('missionId').equals(missionId).toArray();
    const arrived = rows.filter((r) => r.arrived).length;
    return { games: rows.length, arrived, rate: rows.length > 0 ? arrived / rows.length : null };
  } catch {
    return { games: 0, arrived: 0, rate: null };
  }
}

/** The share of the mission's games the pattern arrived in; null with no
 *  game on the record. */
export async function arrivalRate(missionId: MissionId): Promise<number | null> {
  return (await arrivalCount(missionId)).rate;
}
