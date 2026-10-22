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
 *  bookkeeping and must not stop a game. `harder` is required here: a row that
 *  does not say how hard the coach played cannot count toward graduation. */
export function writeMissionResult(row: Omit<MissionResultRecord, 'id' | 'harder'> & { harder: number }): Promise<void> {
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
      missionId: r.missionId, outcome: r.outcome, at: r.at, ...(r.watcher ? { watcher: true } : {}), ...(r.harder !== undefined ? { harder: r.harder } : {}),
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


/** A Campaign game's result for the student. */
export type CampaignGameResult = 'won' | 'lost' | 'other';

/**
 * THE ON-RAMP — the coach's strength over a level's first games (David
 * 2026-10-21: "easy, beatable, same strength, the coach cant just kick
 * everyones ass" → "maybe the progression for the 3 games?" → "it needs to be
 * a challenge, but one that is doable"). Easy, then beatable, then the
 * student's own strength: each game they WIN steps it up one, each game they
 * lose steps it back one, a draw or an unfinished game leaves it. The record
 * decides, never a count of games. It rides on top of the card's own dials and
 * never enters the graduation record (`harder` reads the card's dials).
 */
export const ON_RAMP: readonly number[] = [-200, -100, 0];

/** The strength offset the on-ramp adds after these games, oldest first. */
export function onRampOffset(results: readonly CampaignGameResult[]): number {
  let step = 0;
  for (const r of results) {
    if (r === 'won') step = Math.min(ON_RAMP.length - 1, step + 1);
    else if (r === 'lost') step = Math.max(0, step - 1);
  }
  return ON_RAMP[step];
}

/** This level's Campaign games, oldest first, each as the student's result —
 *  read off the saved game (a checkmate either way; anything else is
 *  `other`). Never throws. */
export async function levelResults(level: number): Promise<CampaignGameResult[]> {
  try {
    const rows = await db.missionResults.filter((r) => r.level === level && !r.watcher).toArray();
    const games = new Map<string, { at: number; color: 'white' | 'black' }>();
    for (const r of rows) {
      const g = games.get(r.gameId);
      if (!g || r.at < g.at) games.set(r.gameId, { at: r.at, color: r.color });
    }
    const ordered = [...games.entries()].sort((a, b) => a[1].at - b[1].at);
    const saved = await db.games.bulkGet(ordered.map(([id]) => id));
    return ordered.map(([, g], i) => {
      const result = saved[i]?.result;
      if (result === '1-0') return g.color === 'white' ? 'won' : 'lost';
      if (result === '0-1') return g.color === 'black' ? 'won' : 'lost';
      return 'other';
    });
  } catch {
    return [];
  }
}
