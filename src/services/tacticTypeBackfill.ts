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
import { detectTacticLine } from './missedTacticService';
import { bestLineOf } from './annotationLine';
import { classifyPhase } from './gamePhaseService';
import { logAppAudit } from './appAuditor';
import type { ClassifiedTactic, MistakePuzzle, MoveAnnotation } from '../types';

/** Bump when the unified classifier's PROJECTION changes in a way that should
 *  reach already-persisted rows. */
// 2026-10-01: classify on the solution LINE read from the source game's
// stored annotation when the row holds only the best move (capture-built rows
// did, so 666 of 997 cards on a real import were the catch-all).
// 2026-10-08: deflection, interference and clearance are read off the line by
// the computer that teaches them (tacticGeometry) instead of the sentinel.
// 2026-10-22: a king skewer is a skewer (the reality gate dropped them), a
// pawn run that queens is a promotion, a capture whose defenders are pinned is
// a pin, and the tactic that set up a later gain names the line — all four
// were filed as an unnamed shot.
// 2026-10-22c: a discovered check that wins is its own name (discovered_check),
// and the recapture through a screening piece is an x-ray — both were filed as
// a discovered attack or an unnamed shot (WO-MOTIFS-01 M3).
// 2026-10-22d: COUNT BOTH (M3d) — the set-up a line opens with is stamped
// beside its name (`setupTacticType`), and the source game's line is read from
// the best move (it was handed the bare continuation, which never matched).
export const TACTIC_TYPE_REV = '2026-10-22-count-both';

interface TacticTypeBackfillResult {
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
  /** Mistake rows whose PHASE moved — rows filed before the one classifier
   *  took a named unit, when move 17 read as move 9 (M5). */
  phaseChanged: number;
}

const UCI_RE = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

function pvOf(moves: string | undefined): readonly string[] | undefined {
  if (!moves) return undefined;
  const pv = moves.trim().split(/\s+/).filter((m) => UCI_RE.test(m));
  return pv.length > 0 ? pv : undefined;
}

/** Recompute one row. Returns the updated row, or null when it is current. */
function retagMistakePuzzle(
  row: MistakePuzzle,
  r: TacticTypeBackfillResult,
  /** The engine line from the source game (its best move first, UCI), when
   *  the row itself holds only the best move. */
  gameLine?: readonly string[],
): MistakePuzzle | null {
  if (row.tacticTypeRev === TACTIC_TYPE_REV) return null;
  r.recomputed += 1;
  // THE PHASE, through the one classifier with its unit named (the row's
  // moveNumber is a FULL move). Re-filed on the same pass that re-tags.
  if (row.fen && row.moveNumber > 0) {
    const phase = classifyPhase(row.fen, { fullMove: row.moveNumber });
    if (phase !== row.gamePhase) { r.phaseChanged += 1; row = { ...row, gamePhase: phase }; }
  }
  if (row.positionalMotif) {
    r.skippedByDesign += 1;
    return { ...row, tacticTypeRev: TACTIC_TYPE_REV, tacticTypeFlag: null };
  }
  if (!row.fen || !UCI_RE.test(row.bestMove ?? '')) {
    r.flagged += 1;
    return { ...row, tacticTypeRev: TACTIC_TYPE_REV, tacticTypeFlag: 'no-inputs' };
  }
  const own = pvOf(row.moves);
  const line = own && own.length > 1 ? own : (gameLine && gameLine[0] === row.bestMove ? gameLine : own);
  const next = detectTacticLine(row.fen, row.bestMove, line);
  if (next.tacticType !== row.tacticType || (next.setup ?? null) !== (row.setupTacticType ?? null)) r.changed += 1;
  return { ...row, tacticType: next.tacticType, setupTacticType: next.setup, tacticTypeRev: TACTIC_TYPE_REV, tacticTypeFlag: null };
}

function retagClassifiedTactic(row: ClassifiedTactic, r: TacticTypeBackfillResult, gameLine?: readonly string[]): ClassifiedTactic | null {
  if (row.tacticTypeRev === TACTIC_TYPE_REV) return null;
  r.recomputed += 1;
  if (!row.fen || !UCI_RE.test(row.bestMoveUci ?? '')) {
    r.flagged += 1;
    return { ...row, tacticTypeRev: TACTIC_TYPE_REV, tacticTypeFlag: 'no-inputs' };
  }
  // ClassifiedTactic keeps no PV: the line is the source game's, when its
  // annotation kept one that starts with this best move.
  const next = detectTacticLine(row.fen, row.bestMoveUci, gameLine && gameLine[0] === row.bestMoveUci ? gameLine : undefined);
  if (next.tacticType !== row.tacticType || (next.setup ?? null) !== (row.setupTacticType ?? null)) r.changed += 1;
  return { ...row, tacticType: next.tacticType, setupTacticType: next.setup, tacticTypeRev: TACTIC_TYPE_REV, tacticTypeFlag: null };
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
type TacticTypeBackfillSchedule = BackfillSchedule;

export async function reconcileTacticTypes(
  schedule: TacticTypeBackfillSchedule = PRODUCTION_BACKFILL_SCHEDULE,
): Promise<TacticTypeBackfillResult> {
  const r: TacticTypeBackfillResult = { scanned: 0, recomputed: 0, changed: 0, skippedByDesign: 0, flagged: 0, phaseChanged: 0 };
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
  // One cached read per source game; the annotation is found by move number
  // and colour (both stored on the row), so no game is replayed.
  const games = new Map<string, MoveAnnotation[] | null>();
  const annotationsOf = async (gameId: string): Promise<MoveAnnotation[] | null> => {
    if (!games.has(gameId)) {
      const g = await db.games.get(gameId).catch(() => undefined);
      games.set(gameId, g?.annotations ?? null);
    }
    return games.get(gameId) ?? null;
  };
  const gameLineFor = async (row: MistakePuzzle): Promise<readonly string[] | undefined> => {
    if (!row.sourceGameId) return undefined;
    const ann = (await annotationsOf(row.sourceGameId))?.find((a) => a.moveNumber === row.moveNumber && a.color === row.playerColor);
    return ann ? bestLineOf(ann) : undefined;
  };
  const tacticLineFor = async (row: ClassifiedTactic): Promise<readonly string[] | undefined> => {
    const ann = (await annotationsOf(row.sourceGameId))?.[row.moveIndex];
    return ann ? bestLineOf(ann) : undefined;
  };
  let sinceFlush = 0;
  let first = true;
  for (const row of stalePuzzles) {
    if (!first) await schedule.yieldBetweenRows();
    first = false;
    const next = retagMistakePuzzle(row, r, await gameLineFor(row));
    if (next) { puzzleWrites.push(next); sinceFlush += 1; }
    if (sinceFlush >= batch) { await flush(); sinceFlush = 0; }
  }
  for (const row of staleTactics) {
    if (!first) await schedule.yieldBetweenRows();
    first = false;
    const next = retagClassifiedTactic(row, r, await tacticLineFor(row));
    if (next) { tacticWrites.push(next); sinceFlush += 1; }
    if (sinceFlush >= batch) { await flush(); sinceFlush = 0; }
  }
  await flush();
  if (r.recomputed > 0) {
    void logAppAudit({
      kind: 'coach-surface-migrated',
      category: 'subsystem',
      source: 'tacticTypeBackfill.reconcileTacticTypes',
      summary: `tacticType re-tagged through the unified classifier (${TACTIC_TYPE_REV}): ${r.recomputed} recomputed, ${r.changed} changed, ${r.skippedByDesign} null-by-design, ${r.flagged} flagged (no inputs), ${r.phaseChanged} phase re-filed, of ${r.scanned}`,
    });
  }
  return r;
}
