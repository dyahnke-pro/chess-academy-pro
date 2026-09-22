// tacticTypeBackfill — re-tag PERSISTED tactic rows through the ONE unified
// classifier (unified-coach N0, David 2026-09-15: "your call" → do it, before
// the weakness-aware selector).
//
// Why: `mistakePuzzles` / `classifiedTactics` rows written before 2026-09-15
// carry a `tacticType` from the retired geometry classifier, which mis-tagged
// exactly the cases that matter (a "fork" whose forker hangs, "clearance"
// false positives, a losing queen trade called a skewer). Those tags are the
// weakness spine's fuel (`bucketForMistake` → `analysis:tactic:<type>`), so a
// coach that steers toward the student's holes would steer toward the OLD
// classifier's mistakes. Re-tagging through `detectTacticType` (a projection
// of `conceptEngine.conceptForLine`) puts every persisted row on the same
// vocabulary the live coach speaks.
//
// Shape (the PRO_DATA_REVISION pattern, per row): a row is behind when its
// `tacticTypeRev !== TACTIC_TYPE_REV`. Idempotent — a second boot writes
// nothing. No Dexie schema bump: the two fields are additive and unindexed.
// Sync-safe: a row pulled from the cloud with a stale/absent rev is re-tagged
// on the next boot, which a one-shot meta key could not do.
//
// Honesty: a row whose inputs are missing or illegal KEEPS its tag and is
// flagged (`tacticTypeFlag: 'no-inputs'`) — never guessed (G3). A row whose
// `tacticType` is null BY DESIGN (a positional-transformation puzzle,
// `positionalMotif` set — the spine buckets it as a trade weakness) is left
// null; only the rev is stamped.
import { db } from '../db/schema';
import { detectTacticType } from './missedTacticService';
import { logAppAudit } from './appAuditor';
import type { ClassifiedTactic, MistakePuzzle } from '../types';

/** Bump when the unified classifier's PROJECTION changes in a way that should
 *  reach already-persisted rows. */
export const TACTIC_TYPE_REV = '2026-09-15-unified-classifier';

export interface TacticTypeBackfillResult {
  /** Rows read across both stores. */
  scanned: number;
  /** Rows behind the rev that were recomputed. */
  recomputed: number;
  /** Rows whose tag actually changed. */
  changed: number;
  /** Rows left null by design (positional motif) — rev stamped only. */
  skippedByDesign: number;
  /** Rows whose inputs were missing/illegal — tag kept, flagged. */
  flagged: number;
}

const UCI_RE = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

function pvOf(moves: string | undefined): readonly string[] | undefined {
  if (!moves) return undefined;
  const pv = moves.trim().split(/\s+/).filter((m) => UCI_RE.test(m));
  return pv.length > 0 ? pv : undefined;
}

/** Recompute one row. Returns the updated row, or null when it is current. */
function retagMistakePuzzle(row: MistakePuzzle, r: TacticTypeBackfillResult): MistakePuzzle | null {
  if (row.tacticTypeRev === TACTIC_TYPE_REV) return null;
  r.recomputed += 1;
  if (row.positionalMotif) {
    r.skippedByDesign += 1;
    return { ...row, tacticTypeRev: TACTIC_TYPE_REV, tacticTypeFlag: null };
  }
  if (!row.fen || !UCI_RE.test(row.bestMove ?? '')) {
    r.flagged += 1;
    return { ...row, tacticTypeRev: TACTIC_TYPE_REV, tacticTypeFlag: 'no-inputs' };
  }
  const next = detectTacticType(row.fen, row.bestMove, pvOf(row.moves));
  if (next !== row.tacticType) r.changed += 1;
  return { ...row, tacticType: next, tacticTypeRev: TACTIC_TYPE_REV, tacticTypeFlag: null };
}

function retagClassifiedTactic(row: ClassifiedTactic, r: TacticTypeBackfillResult): ClassifiedTactic | null {
  if (row.tacticTypeRev === TACTIC_TYPE_REV) return null;
  r.recomputed += 1;
  if (!row.fen || !UCI_RE.test(row.bestMoveUci ?? '')) {
    r.flagged += 1;
    return { ...row, tacticTypeRev: TACTIC_TYPE_REV, tacticTypeFlag: 'no-inputs' };
  }
  // ClassifiedTactic keeps no PV — the best move alone is what the legacy
  // path had too, so this is a like-for-like re-tag, not a downgrade.
  const next = detectTacticType(row.fen, row.bestMoveUci);
  if (next !== row.tacticType) r.changed += 1;
  return { ...row, tacticType: next, tacticTypeRev: TACTIC_TYPE_REV, tacticTypeFlag: null };
}

/**
 * Re-tag every persisted tactic row that is behind `TACTIC_TYPE_REV`. Safe to
 * call on every boot: rows already at the rev cost one read and no write.
 */
// The schedule lives in `backfillSchedule.ts` (one home for the rule — the
// opening-key re-mint shares it). Re-exported so the gate and callers keep
// their names.
import { PRODUCTION_BACKFILL_SCHEDULE, IMMEDIATE_BACKFILL_SCHEDULE, sleep, type BackfillSchedule } from './backfillSchedule';
export { PRODUCTION_BACKFILL_SCHEDULE, IMMEDIATE_BACKFILL_SCHEDULE };
export type TacticTypeBackfillSchedule = BackfillSchedule;

export async function reconcileTacticTypes(
  schedule: TacticTypeBackfillSchedule = PRODUCTION_BACKFILL_SCHEDULE,
): Promise<TacticTypeBackfillResult> {
  const r: TacticTypeBackfillResult = { scanned: 0, recomputed: 0, changed: 0, skippedByDesign: 0, flagged: 0 };
  if (schedule.startDelayMs > 0) await sleep(schedule.startDelayMs);
  const [puzzles, tactics] = await Promise.all([db.mistakePuzzles.toArray(), db.classifiedTactics.toArray()]);
  r.scanned = puzzles.length + tactics.length;
  // Only the STALE rows are walked — a device whose rows all carry the rev
  // pays two index reads and nothing else.
  const stalePuzzles = puzzles.filter((row) => row.tacticTypeRev !== TACTIC_TYPE_REV);
  const staleTactics = tactics.filter((row) => row.tacticTypeRev !== TACTIC_TYPE_REV);
  if (stalePuzzles.length === 0 && staleTactics.length === 0) return r;

  const batch = Math.max(1, schedule.batch);
  let puzzleWrites: MistakePuzzle[] = [];
  let tacticWrites: ClassifiedTactic[] = [];
  const flush = async (): Promise<void> => {
    if (puzzleWrites.length === 0 && tacticWrites.length === 0) return;
    const pw = puzzleWrites; const tw = tacticWrites;
    puzzleWrites = []; tacticWrites = [];
    await db.transaction('rw', db.mistakePuzzles, db.classifiedTactics, async () => {
      if (pw.length > 0) await db.mistakePuzzles.bulkPut(pw);
      if (tw.length > 0) await db.classifiedTactics.bulkPut(tw);
    });
  };
  let sinceFlush = 0;
  let first = true;
  for (const row of stalePuzzles) {
    if (!first) await schedule.yieldBetweenRows();
    first = false;
    const next = retagMistakePuzzle(row, r);
    if (next) { puzzleWrites.push(next); sinceFlush += 1; }
    if (sinceFlush >= batch) { await flush(); sinceFlush = 0; }
  }
  for (const row of staleTactics) {
    if (!first) await schedule.yieldBetweenRows();
    first = false;
    const next = retagClassifiedTactic(row, r);
    if (next) { tacticWrites.push(next); sinceFlush += 1; }
    if (sinceFlush >= batch) { await flush(); sinceFlush = 0; }
  }
  await flush();
  if (r.recomputed > 0) {
    void logAppAudit({
      kind: 'coach-surface-migrated',
      category: 'subsystem',
      source: 'tacticTypeBackfill.reconcileTacticTypes',
      summary: `tacticType re-tagged through the unified classifier (${TACTIC_TYPE_REV}): ${r.recomputed} recomputed, ${r.changed} changed, ${r.skippedByDesign} null-by-design, ${r.flagged} flagged (no inputs) of ${r.scanned}`,
    });
  }
  return r;
}
