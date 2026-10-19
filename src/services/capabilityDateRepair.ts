// capabilityDateRepair — date the evidence read from a past game by THAT GAME
// (David's record, 2026-10-19). Every backfill over old games stamped its rows
// "now", so 9,729 of 9,761 game rows on one real record carried the date they
// were re-read, not played: an old slip read last reset a current streak, and
// the heat map, the fade and the mark-only threat rule all read a scrambled
// history. New rows are dated by the game (`autoAnalyzeGame.playedAt`); this
// re-dates the rows already on disk, once, in move order within each game.
import { db } from '../db/schema';
import { logAppAudit } from './appAuditor';
import { gamePlayedAt } from './autoAnalyzeGame';
import { PRODUCTION_BACKFILL_SCHEDULE, sleep, type BackfillSchedule } from './backfillSchedule';
import type { CapabilityEvidenceRecord } from './capabilityEvidence';

const DONE_KEY = 'capability-date-repair';
const DONE_REV = '2026-10-19';
/** A row more than this long after its game was stamped by a later re-read. */
const RE_READ_GAP_MS = 86_400_000;

/** The ply a position was played from, read off its own FEN. */
export function plyOfFen(fen: string): number {
  const parts = fen.split(' ');
  const full = Number(parts[5] ?? 1);
  return (Math.max(1, Number.isFinite(full) ? full : 1) - 1) * 2 + (parts[1] === 'b' ? 1 : 0);
}

/** The rows of one game that were stamped by a re-read, re-dated in move order. */
export function redateGameRows(rows: readonly CapabilityEvidenceRecord[], playedAt: number): CapabilityEvidenceRecord[] {
  return rows
    .filter((r) => r.recordedAt - playedAt > RE_READ_GAP_MS)
    .map((r) => ({ ...r, recordedAt: playedAt + plyOfFen(r.fen) }));
}

export async function repairCapabilityDates(
  schedule: BackfillSchedule = PRODUCTION_BACKFILL_SCHEDULE,
): Promise<{ games: number; rows: number }> {
  const out = { games: 0, rows: 0 };
  const done = await db.meta.get(DONE_KEY).catch(() => undefined);
  if (done?.value === DONE_REV) return out;
  if (schedule.startDelayMs > 0) await sleep(schedule.startDelayMs);
  const games = await db.games.filter((g) => !g.isMasterGame).toArray();
  // One read, grouped by game (the store has no game-id index).
  const byGame = new Map<string, CapabilityEvidenceRecord[]>();
  for (const r of await db.capabilityEvidence.toArray()) {
    if (!r.sourceGameId) continue;
    const list = byGame.get(r.sourceGameId) ?? [];
    list.push(r);
    byGame.set(r.sourceGameId, list);
  }
  for (const game of games) {
    const playedAt = gamePlayedAt(game);
    const rows = byGame.get(game.id);
    if (playedAt === undefined || !rows) continue;
    const fixed = redateGameRows(rows, playedAt);
    if (fixed.length === 0) continue;
    await schedule.waitForQuiet?.();
    await db.capabilityEvidence.bulkPut(fixed);
    out.games += 1;
    out.rows += fixed.length;
    await schedule.yieldBetweenRows();
  }
  await db.meta.put({ key: DONE_KEY, value: DONE_REV });
  void logAppAudit({
    kind: 'coach-surface-migrated',
    category: 'subsystem',
    source: 'capabilityDateRepair.repairCapabilityDates',
    summary: `re-dated ${out.rows} evidence row(s) from ${out.games} game(s) to the day they were played`,
  });
  return out;
}
