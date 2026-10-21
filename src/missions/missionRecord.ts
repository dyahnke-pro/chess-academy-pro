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
import type { CoachDials, DialStateRecord, MissionCard, MissionId, MissionResultRecord } from './missionCard';
import type { MissionRecordRow } from './registry';
import { effectiveDials, nextDialState, type DialStep } from './dialState';

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
 *  mission is live and which watch (the record decides, never a rating). */
export async function loadMissionRecord(): Promise<MissionRecordRow[]> {
  try {
    return (await db.missionResults.orderBy('at').toArray()).map((r) => ({
      missionId: r.missionId, outcome: r.outcome, at: r.at, ...(r.watcher ? { watcher: true } : {}),
    }));
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

/** Where the auto-dial loop has turned a card's dials, or null. */
export async function loadDialState(missionId: MissionId): Promise<DialStateRecord | null> {
  try {
    return (await db.dialState.get(missionId)) ?? null;
  } catch {
    return null;
  }
}

/** The dials a card plays under next game: its own, or the loop's. */
export async function dialsForCard(card: MissionCard): Promise<CoachDials> {
  return effectiveDials(card, await loadDialState(card.id));
}

/** After an ACTIVE game of `card` is recorded: read its rows, take at most
 *  one dial step, save it and log it (`mission-dial-step`). Never throws. */
export async function stepDialsAfterGame(card: MissionCard, now: number = Date.now()): Promise<DialStep | null> {
  try {
    const rows = await db.missionResults.where('missionId').equals(card.id).toArray();
    const { state, step } = nextDialState(card, await loadDialState(card.id), rows, now);
    if (!step) return null;
    await db.dialState.put(state);
    void logAppAudit({
      kind: 'mission-dial-step',
      category: 'subsystem',
      source: 'missionRecord.stepDialsAfterGame',
      summary: `${card.id}: ${step.dial} ${String(step.from)} → ${String(step.to)} (${step.direction}, first-try ${Math.round(step.rate * 100)}% over ${step.games})`,
      details: JSON.stringify({ mission: card.id, ...step }),
    });
    return step;
  } catch {
    return null;
  }
}

