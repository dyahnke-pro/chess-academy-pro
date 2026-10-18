// misconceptionRulesBackfill — carry a classifier RULES change to the rows
// already on disk (review of chesscom-1040709576, 2026-10-13). A rule fix
// reaches new rows the moment it ships; the stored record — what the weakness
// spine counts and the coach teaches from — kept the old tags until the
// student happened to re-open each game. Stored `auto-analysis` rows behind
// `MISCONCEPTION_RULES_REV` are re-attributed through the game's own sweep
// (`autoAnalyzeGameMisconceptions` → `reattributePending`), one game at a
// time, on the boot schedule every backfill reads (`backfillSchedule`).
//
// The same pass reads every analysed game once for the POSITIVE half (held
// capabilities — the heat map's green), which until 2026-10-13 was recorded
// only when the student opened the game in Review.
import { db } from '../db/schema';
import { logAppAudit } from './appAuditor';
import { MISCONCEPTION_RULES_REV } from '../data/misconceptionTags';
import { isFixtureGame } from './fixtureGames';
import { PRODUCTION_BACKFILL_SCHEDULE, sleep, type BackfillSchedule } from './backfillSchedule';

export { POSITIVE_HALF_REV } from '../data/misconceptionTags';
import { POSITIVE_HALF_REV } from '../data/misconceptionTags';

/** The meta row that says the pass is complete for the current revisions. */
const BACKFILL_DONE_KEY = 'misconception-rules-backfill';
const BACKFILL_REVS = `${MISCONCEPTION_RULES_REV}|${POSITIVE_HALF_REV}`;

export interface RulesBackfillResult {
  /** Games re-read: rows behind the rules revision, or no positive half yet. */
  games: number;
  /** Rows whose tag moved. */
  reattributed: number;
  /** Held-capability evidence rows recorded (the green half). */
  held: number;
}

/** The games whose stored auto-analysis rows were classified under older rules. */
export async function gamesBehindRules(): Promise<string[]> {
  const rows = await db.misconceptionTags
    .filter((r) => r.source === 'auto-analysis' && !!r.sourceGameId && r.rulesRev !== MISCONCEPTION_RULES_REV)
    .toArray();
  return [...new Set(rows.map((r) => r.sourceGameId as string))];
}

/** Analysed games of the student's that have not been read for the positive
 *  half under the current revision. */
export async function gamesBehindPositiveHalf(): Promise<string[]> {
  const games = await db.games
    .filter((g) => !g.isMasterGame && !!g.fullyAnalyzed && (g.annotations?.length ?? 0) > 0
      && !isFixtureGame(g) && g.positiveHalfRev !== POSITIVE_HALF_REV)
    .toArray();
  return games.map((g) => g.id);
}

export async function reconcileMisconceptionRules(
  schedule: BackfillSchedule = PRODUCTION_BACKFILL_SCHEDULE,
): Promise<RulesBackfillResult> {
  const r: RulesBackfillResult = { games: 0, reattributed: 0, held: 0 };
  // ONE READ PER BOOT ONCE DONE (David 2026-10-13: "Every app start it
  // analyzes games?"). Rows and games written after a revision already carry
  // it — the sweep stamps new rows and records both halves of a new game — so
  // once a pass completes for this pair of revisions, nothing can fall behind
  // until a revision is bumped. Finding the stragglers loads every game and
  // every slip row; that is paid once per revision, never per boot.
  const done = await db.meta.get(BACKFILL_DONE_KEY).catch(() => undefined);
  if (done?.value === BACKFILL_REVS) return r;
  if (schedule.startDelayMs > 0) await sleep(schedule.startDelayMs);
  const games = [...new Set([...await gamesBehindRules(), ...await gamesBehindPositiveHalf()])];
  r.games = games.length;
  if (games.length === 0) {
    await db.meta.put({ key: BACKFILL_DONE_KEY, value: BACKFILL_REVS });
    return r;
  }
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
    r.held += res?.capabilitiesHeld ?? 0;
    // A row the sweep could not re-read (the game has no analysis left, or
    // the move is no longer flagged) is stamped, so it is not revisited on
    // every boot.
    await db.misconceptionTags
      .where('sourceGameId').equals(gameId)
      .filter((row) => row.source === 'auto-analysis' && row.rulesRev !== MISCONCEPTION_RULES_REV)
      .modify({ rulesRev: MISCONCEPTION_RULES_REV });
    await db.games.update(gameId, { positiveHalfRev: POSITIVE_HALF_REV });
  }
  // Every game was visited and stamped: the pass is done for these revisions.
  await db.meta.put({ key: BACKFILL_DONE_KEY, value: BACKFILL_REVS });
  void logAppAudit({
    kind: 'coach-surface-migrated',
    category: 'subsystem',
    source: 'misconceptionRulesBackfill.reconcileMisconceptionRules',
    summary: `games re-read under ${MISCONCEPTION_RULES_REV} / ${POSITIVE_HALF_REV}: ${r.games} game(s), ${r.reattributed} tag(s) moved, ${r.held} held capability row(s)`,
  });
  return r;
}
