/**
 * THE MISSION RECORD (WO-MISSIONS-01) — the only reader and writer of the
 * `missionResults` store.
 *
 * One row per mission per game, keyed `${gameId}:${missionId}`, written by ONE
 * writer per game (`oneAtATime`): two resolutions racing for the same game
 * queue, and the second overwrites the first rather than adding a row. The
 * rows travel with the cloud backup (`exportUserData` / `importUserData`).
 */
import { db } from '../db/schema';
import { logAppAudit } from '../services/appAuditor';
import { oneAtATime, type KeyedQueue } from '../utils/oneAtATime';
import type { MissionId, MissionOutcome, MissionResultRecord } from './missionCard';

const writers: KeyedQueue = new Map();

export function missionResultId(gameId: string, missionId: MissionId): string {
  return `${gameId}:${missionId}`;
}

/** Save how a mission ended in a game. Never throws — the record is
 *  bookkeeping and must not stop a game. */
export function writeMissionResult(row: Omit<MissionResultRecord, 'id'>): Promise<void> {
  const full: MissionResultRecord = { ...row, id: missionResultId(row.gameId, row.missionId) };
  return oneAtATime(writers, row.gameId, async () => {
    try {
      await db.missionResults.put(full);
      void logAppAudit({
        kind: 'mission-result',
        category: 'subsystem',
        source: 'missionRecord.writeMissionResult',
        summary: `${full.missionId} ${full.outcome} (${full.color})${full.reason ? ` ${full.reason} at ply ${full.missPly}` : ''}`,
        details: JSON.stringify(full),
      });
    } catch { /* the record is a bonus, never a blocker */ }
  });
}

/** Every mission row, oldest first — what the registry reads to decide which
 *  mission is live (the record decides, never a rating). */
export async function loadMissionRecord(): Promise<Array<{ missionId: MissionId; outcome: MissionOutcome }>> {
  try {
    return (await db.missionResults.orderBy('at').toArray()).map((r) => ({ missionId: r.missionId, outcome: r.outcome }));
  } catch {
    return [];
  }
}

/** The seat for a new Learn game: the opposite of the last one on the record,
 *  White when there is none (White, Black, White, …). */
export async function nextLearnSeat(): Promise<'white' | 'black'> {
  try {
    const last = await db.missionResults.orderBy('at').last();
    return last?.color === 'white' ? 'black' : 'white';
  } catch {
    return 'white';
  }
}
