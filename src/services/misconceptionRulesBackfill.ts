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
import { MISCONCEPTION_RULES_REV, THREAT_HALF_REV } from '../data/misconceptionTags';
import { THREAT_MOTIF_TAGS } from './learnRecordTerms';
import { isFixtureGame } from './fixtureGames';
import { PRODUCTION_BACKFILL_SCHEDULE, sleep, type BackfillSchedule } from './backfillSchedule';

export { POSITIVE_HALF_REV } from '../data/misconceptionTags';
import { POSITIVE_HALF_REV } from '../data/misconceptionTags';

/** The meta row that says the pass is complete for the current revisions. */
const BACKFILL_DONE_KEY = 'misconception-rules-backfill';
const BACKFILL_DONE_KEY_EXPORT = BACKFILL_DONE_KEY;
const RECORD_HEAL_KEY = 'skill-record-heal-v1';
const BACKFILL_REVS = `${MISCONCEPTION_RULES_REV}|${POSITIVE_HALF_REV}|${THREAT_HALF_REV}`;

export interface RulesBackfillResult {
  /** Games re-read: rows behind the rules revision, or no positive half yet. */
  games: number;
  /** Rows whose tag moved. */
  reattributed: number;
  /** Held-capability evidence rows recorded (the green half). */
  held: number;
  /** Incoming-motif rows recorded (`threatAnswerEvidence`). */
  threats: number;
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
  // THIS DEVICE'S RECORD decides, not a stamp (David's laptop, 2026-10-19:
  // 938 analysed games and five meters "not rated yet"). A game restored from
  // another device arrives stamped as read, but the record that read made
  // stayed on that device — so a game with no record row here is behind
  // whatever its stamp says.
  const recorded = await gamesWithRecord();
  const games = await db.games
    .filter((g) => !g.isMasterGame && !!g.fullyAnalyzed && (g.annotations?.length ?? 0) > 0
      && !isFixtureGame(g) && (g.positiveHalfRev !== POSITIVE_HALF_REV || !recorded.has(g.id)))
    .toArray();
  return games.map((g) => g.id);
}

/** Analysed games not yet read for the incoming half of each motif under
 *  `THREAT_HALF_REV` — by stamp, or (a game restored from another device)
 *  because this device holds no motif row for it and never read it. */
export async function gamesBehindThreatHalf(): Promise<string[]> {
  const readHere = await readOnThisDevice();
  const withRows = new Set<string>();
  await db.capabilityEvidence.each((r) => { if (r.sourceGameId && THREAT_MOTIF_TAGS.has(r.tag)) withRows.add(r.sourceGameId); });
  const games = await db.games
    .filter((g) => !g.isMasterGame && !!g.fullyAnalyzed && (g.annotations?.length ?? 0) > 0
      && !isFixtureGame(g) && (g.threatHalfRev !== THREAT_HALF_REV || (!withRows.has(g.id) && !readHere.has(g.id))))
    .toArray();
  return games.map((g) => g.id);
}

/** Games this device's skill record holds rows for. */
async function gamesWithRecord(): Promise<Set<string>> {
  const ids = await readOnThisDevice();
  await db.capabilityEvidence.each((r) => { if (r.sourceGameId) ids.add(r.sourceGameId); });
  return ids;
}

/** Games this device's pass has read (some answer no question, so they leave
 *  no record row to prove it). Device-local: never imported. */
const READ_HERE_KEY = 'skill-record-games-read';
async function readOnThisDevice(): Promise<Set<string>> {
  const row = await db.meta.get(READ_HERE_KEY).catch(() => undefined);
  try { return new Set(row ? (JSON.parse(row.value) as string[]) : []); } catch { return new Set(); }
}
async function rememberRead(ids: Set<string>): Promise<void> {
  await db.meta.put({ key: READ_HERE_KEY, value: JSON.stringify([...ids]) });
}

/** Device-local markers of a pass this device ran. They vouch for a record
 *  that never leaves the device, so a backup or sync must never carry them
 *  (`syncService.importUserData` drops them). */
export const DEVICE_LOCAL_META_KEYS: readonly string[] = [BACKFILL_DONE_KEY_EXPORT, RECORD_HEAL_KEY, 'misconceptions_backfill_v2', 'skill-record-games-read'];

/** The rebuild's progress, for the page that would otherwise read "not rated
 *  yet" while it runs. Null when no rebuild is running. */
export interface RebuildProgress { done: number; total: number }
let progress: RebuildProgress | null = null;
const listeners = new Set<(p: RebuildProgress | null) => void>();
function setProgress(p: RebuildProgress | null): void {
  progress = p;
  for (const l of listeners) l(p);
}
export function rebuildProgress(): RebuildProgress | null { return progress; }
export function onRebuildProgress(l: (p: RebuildProgress | null) => void): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export async function reconcileMisconceptionRules(
  schedule: BackfillSchedule = PRODUCTION_BACKFILL_SCHEDULE,
): Promise<RulesBackfillResult> {
  const r: RulesBackfillResult = { games: 0, reattributed: 0, held: 0, threats: 0 };
  // ONE READ PER BOOT ONCE DONE (David 2026-10-13: "Every app start it
  // analyzes games?"). Rows and games written after a revision already carry
  // it — the sweep stamps new rows and records both halves of a new game — so
  // once a pass completes for this pair of revisions, nothing can fall behind
  // until a revision is bumped. Finding the stragglers loads every game and
  // every slip row; that is paid once per revision, never per boot.
  const done = await db.meta.get(BACKFILL_DONE_KEY).catch(() => undefined);
  // HEAL ONCE: a device that restored a backup before the import dropped this
  // marker holds it without the record behind it. One check per device.
  const healed = await db.meta.get(RECORD_HEAL_KEY).catch(() => undefined);
  if (done?.value === BACKFILL_REVS && healed) return r;
  if (!healed) await db.meta.put({ key: RECORD_HEAL_KEY, value: 'checked' });
  if (schedule.startDelayMs > 0) await sleep(schedule.startDelayMs);
  const behindOther = new Set([...await gamesBehindRules(), ...await gamesBehindPositiveHalf()]);
  const games = [...new Set([...behindOther, ...await gamesBehindThreatHalf()])];
  r.games = games.length;
  if (games.length === 0) {
    await db.meta.put({ key: BACKFILL_DONE_KEY, value: BACKFILL_REVS });
    return r;
  }
  // Dynamic: autoAnalyzeGame pulls in the classifier and the engine helpers.
  const { autoAnalyzeGameMisconceptions, recordThreatHalfForGame } = await import('./autoAnalyzeGame');
  let first = true;
  let n = 0;
  const readHere = await readOnThisDevice();
  setProgress({ done: 0, total: games.length });
  for (const gameId of games) {
    setProgress({ done: n++, total: games.length });
    if (!first) await schedule.yieldBetweenRows();
    first = false;
    // THE STUDENT FIRST (David's phone, 2026-10-19): a live game's coach waited
    // behind this pass and the phone heated. Each game waits until the student
    // has been away from a live board for a while.
    await schedule.waitForQuiet?.();
    // Each game persists its own rows as it goes — a killed app keeps every
    // finished game and re-reads only the rest.
    // A game behind only the threat half reads only that — the other halves
    // are current and re-reading them would cost a whole sweep for nothing.
    const res = behindOther.has(gameId) ? await autoAnalyzeGameMisconceptions(gameId).catch(() => null) : null;
    r.reattributed += res?.reattributed ?? 0;
    r.held += res?.capabilitiesHeld ?? 0;
    r.threats += await recordThreatHalfForGame(gameId).catch(() => 0);
    // A row the sweep could not re-read (the game has no analysis left, or
    // the move is no longer flagged) is stamped, so it is not revisited on
    // every boot.
    await db.misconceptionTags
      .where('sourceGameId').equals(gameId)
      .filter((row) => row.source === 'auto-analysis' && row.rulesRev !== MISCONCEPTION_RULES_REV)
      .modify({ rulesRev: MISCONCEPTION_RULES_REV });
    await db.games.update(gameId, { positiveHalfRev: POSITIVE_HALF_REV });
    readHere.add(gameId);
    if (n % 25 === 0) await rememberRead(readHere);
  }
  await rememberRead(readHere);
  // Every game was visited and stamped: the pass is done for these revisions.
  setProgress(null);
  await db.meta.put({ key: BACKFILL_DONE_KEY, value: BACKFILL_REVS });
  void logAppAudit({
    kind: 'coach-surface-migrated',
    category: 'subsystem',
    source: 'misconceptionRulesBackfill.reconcileMisconceptionRules',
    summary: `games re-read under ${MISCONCEPTION_RULES_REV} / ${POSITIVE_HALF_REV}: ${r.games} game(s), ${r.reattributed} tag(s) moved, ${r.held} held capability row(s), ${r.threats} incoming-motif row(s)`,
  });
  return r;
}
