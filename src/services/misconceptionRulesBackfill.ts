// misconceptionRulesBackfill — carry a classifier RULES change to the rows
// already on disk (review of chesscom-1040709576, 2026-10-13). A rule fix
// reaches new rows the moment it ships; the stored record — what the weakness
// spine counts and the coach teaches from — kept the old tags until the
// student happened to re-open each game. Stored `auto-analysis` rows behind
// `MISCONCEPTION_RULES_REV` are re-attributed through the game's own sweep
// (`autoAnalyzeGameMisconceptions` → `reattributePending`), one game at a
// time, on the boot schedule every backfill reads (`backfillSchedule`).
import { db } from '../db/schema';
import { logAppAudit } from './appAuditor';
import { MISCONCEPTION_RULES_REV } from '../data/misconceptionTags';
import { PRODUCTION_BACKFILL_SCHEDULE, sleep, type BackfillSchedule } from './backfillSchedule';

export interface RulesBackfillResult {
  /** Games holding at least one row behind the rules revision. */
  games: number;
  /** Rows whose tag moved. */
  reattributed: number;
}

/** The games whose stored auto-analysis rows were classified under older rules. */
export async function gamesBehindRules(): Promise<string[]> {
  const rows = await db.misconceptionTags
    .filter((r) => r.source === 'auto-analysis' && !!r.sourceGameId && r.rulesRev !== MISCONCEPTION_RULES_REV)
    .toArray();
  return [...new Set(rows.map((r) => r.sourceGameId as string))];
}

export async function reconcileMisconceptionRules(
  schedule: BackfillSchedule = PRODUCTION_BACKFILL_SCHEDULE,
): Promise<RulesBackfillResult> {
  const r: RulesBackfillResult = { games: 0, reattributed: 0 };
  if (schedule.startDelayMs > 0) await sleep(schedule.startDelayMs);
  const games = await gamesBehindRules();
  r.games = games.length;
  if (games.length === 0) return r;
  // Dynamic: autoAnalyzeGame pulls in the classifier and the engine helpers.
  const { autoAnalyzeGameMisconceptions } = await import('./autoAnalyzeGame');
  let first = true;
  for (const gameId of games) {
    if (!first) await schedule.yieldBetweenRows();
    first = false;
    // Each game persists its own rows as it goes — a killed app keeps every
    // finished game and re-reads only the rest.
    const res = await autoAnalyzeGameMisconceptions(gameId).catch(() => null);
    r.reattributed += res?.reattributed ?? 0;
    // A row the sweep could not re-read (the game has no analysis left, or
    // the move is no longer flagged) is stamped, so it is not revisited on
    // every boot.
    await db.misconceptionTags
      .where('sourceGameId').equals(gameId)
      .filter((row) => row.source === 'auto-analysis' && row.rulesRev !== MISCONCEPTION_RULES_REV)
      .modify({ rulesRev: MISCONCEPTION_RULES_REV });
  }
  void logAppAudit({
    kind: 'coach-surface-migrated',
    category: 'subsystem',
    source: 'misconceptionRulesBackfill.reconcileMisconceptionRules',
    summary: `misconception rows re-read under ${MISCONCEPTION_RULES_REV}: ${r.games} game(s), ${r.reattributed} tag(s) moved`,
  });
  return r;
}
