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
import { MISCONCEPTION_RULES_REV, RECORD_PRICE_REV, THREAT_HALF_REV } from '../data/misconceptionTags';
import { THREAT_MOTIF_TAGS } from './learnRecordTerms';
import { isFixtureGame } from './fixtureGames';
import { gameDateMs } from '../utils/gameDate';
import { PRODUCTION_BACKFILL_SCHEDULE, sleep, type BackfillSchedule } from './backfillSchedule';
import { emitWeaknessModelChanged } from './weaknessModelEvents';
import type { MisconceptionTagRecord, MistakePuzzle } from '../types';

export { POSITIVE_HALF_REV } from '../data/misconceptionTags';
import { POSITIVE_HALF_REV } from '../data/misconceptionTags';

/** The meta row that says the pass is complete for the current revisions. */
const BACKFILL_DONE_KEY = 'misconception-rules-backfill';
const BACKFILL_DONE_KEY_EXPORT = BACKFILL_DONE_KEY;
const RECORD_HEAL_KEY = 'skill-record-heal-v1';
/** The copies racing passes wrote have been collapsed on this device (#130). */
const RECORD_DEDUPE_KEY = 'skill-record-dedupe-v1';
const BACKFILL_REVS = `${MISCONCEPTION_RULES_REV}|${POSITIVE_HALF_REV}|${THREAT_HALF_REV}|${RECORD_PRICE_REV}`;

interface RulesBackfillResult {
  /** Games re-read: rows behind the rules revision, or no positive half yet. */
  games: number;
  /** Rows whose tag moved. */
  reattributed: number;
  /** Held-capability evidence rows recorded (the green half). */
  held: number;
  /** Incoming-motif rows recorded (`threatAnswerEvidence`). */
  threats: number;
  /** Games re-priced with one search per move (`recordReprice`, L6). */
  repriced: number;
  /** Slip rows whose grade moved under the one price. */
  repricedRows: number;
  /** Duplicate slip rows and puzzles collapsed (#130). */
  collapsed: number;
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
  return newestFirst(games);
}

/** Newest game first, so the heat map's recent weeks fill before the old ones. */
function newestFirst(games: ReadonlyArray<{ id: string; date?: string | null }>): string[] {
  return [...games]
    .sort((a, b) => (gameDateMs(b.date) ?? 0) - (gameDateMs(a.date) ?? 0))
    .map((g) => g.id);
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
  return newestFirst(games);
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
export const DEVICE_LOCAL_META_KEYS: readonly string[] = [BACKFILL_DONE_KEY_EXPORT, RECORD_HEAL_KEY, RECORD_DEDUPE_KEY, 'misconceptions_backfill_v2', 'skill-record-games-read'];

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

/** ONE SLIP, ONE ROW (#130). Passes over one game that raced each filed its
 *  slips (David's record, 2026-10-20: 95 rows, 8 slips); the writer runs one
 *  at a time now, and this collapses the copies already written. A slip row is
 *  the same game, board, move and skill, auto-analysis only (a live capture is
 *  its own row); the row kept is the counted one, then the most worked, then
 *  the first. A puzzle is the same game, board and move; the one the student
 *  has tried most is kept. */
export async function collapseDuplicateRecordRows(): Promise<{ rows: number; puzzles: number }> {
  const rowRank = (x: MisconceptionTagRecord): number => (x.counted === false ? 0 : 1_000_000) + x.masteryHits * 1000;
  const extraRows = extras(
    await db.misconceptionTags.filter((x) => x.source === 'auto-analysis' && !!x.sourceGameId).toArray(),
    (x) => `${x.sourceGameId}|${x.fen}|${x.playedSan ?? ''}|${x.tag}`,
    (a, b) => rowRank(b) - rowRank(a) || a.createdAt - b.createdAt,
  );
  const extraPuzzles = extras(
    await db.mistakePuzzles.filter((p) => p.sourceGameId.length > 0).toArray(),
    (p: MistakePuzzle) => `${p.sourceGameId}|${p.fen}|${p.playerMoveSan}`,
    (a, b) => b.attempts - a.attempts || a.createdAt.localeCompare(b.createdAt),
  );
  if (extraRows.length > 0) await db.misconceptionTags.bulkDelete(extraRows);
  if (extraPuzzles.length > 0) await db.mistakePuzzles.bulkDelete(extraPuzzles);
  if (extraRows.length + extraPuzzles.length > 0) {
    emitWeaknessModelChanged();
    void logAppAudit({
      kind: 'coach-surface-migrated',
      category: 'subsystem',
      source: 'misconceptionRulesBackfill.collapseDuplicateRecordRows',
      summary: `collapsed ${extraRows.length} duplicate slip row(s) and ${extraPuzzles.length} duplicate puzzle(s)`,
    });
  }
  return { rows: extraRows.length, puzzles: extraPuzzles.length };
}

/** The ids past the first of each group, the groups ordered best first. */
function extras<T extends { id: string }>(items: readonly T[], key: (x: T) => string, best: (a: T, b: T) => number): string[] {
  const groups = new Map<string, T[]>();
  for (const x of items) groups.set(key(x), [...(groups.get(key(x)) ?? []), x]);
  const out: string[] = [];
  for (const g of groups.values()) if (g.length > 1) out.push(...[...g].sort(best).slice(1).map((x) => x.id));
  return out;
}

export async function reconcileMisconceptionRules(
  schedule: BackfillSchedule = PRODUCTION_BACKFILL_SCHEDULE,
): Promise<RulesBackfillResult> {
  const r: RulesBackfillResult = { games: 0, reattributed: 0, held: 0, threats: 0, repriced: 0, repricedRows: 0, collapsed: 0 };
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
  const deduped = await db.meta.get(RECORD_DEDUPE_KEY).catch(() => undefined);
  if (done?.value === BACKFILL_REVS && healed && deduped) return r;
  if (!healed) await db.meta.put({ key: RECORD_HEAL_KEY, value: 'checked' });
  if (schedule.startDelayMs > 0) await sleep(schedule.startDelayMs);
  if (!deduped) {
    const c = await collapseDuplicateRecordRows();
    r.collapsed = c.rows + c.puzzles;
    await db.meta.put({ key: RECORD_DEDUPE_KEY, value: 'done' });
  }
  const { gamesBehindPrice, repriceGameRecord } = await import('./recordReprice');
  const behindPrice = new Set(await gamesBehindPrice());
  const behindOther = new Set([...await gamesBehindRules(), ...await gamesBehindPositiveHalf()]);
  const behindThreat = await gamesBehindThreatHalf();
  const games = [...new Set([...behindPrice, ...behindOther, ...behindThreat])];
  r.games = games.length;
  if (games.length === 0) {
    await db.meta.put({ key: BACKFILL_DONE_KEY, value: BACKFILL_REVS });
    return r;
  }
  // Dynamic: autoAnalyzeGame pulls in the classifier and the engine helpers.
  const { autoAnalyzeGameMisconceptions, recordThreatHalfForGame } = await import('./autoAnalyzeGame');
  const readHere = await readOnThisDevice();
  let first = true;
  const pace = async (): Promise<void> => {
    if (!first) await schedule.yieldBetweenRows();
    first = false;
    // THE STUDENT FIRST (David's phone, 2026-10-19): a live game's coach waited
    // behind this pass and the phone heated. Each game waits until the student
    // has been away from a live board for a while.
    await schedule.waitForQuiet?.();
  };
  // ONE GAME'S RECORD, read off its stored analysis — the classifier, the held
  // half and the incoming-motif half. Board only: no engine. Each game persists
  // its own rows as it goes, so a killed app keeps every finished game.
  const readRecord = async (gameId: string): Promise<void> => {
    // The schedule's hand-back between rows: a live Learn game stops this
    // game's re-read within one row, not one game (the Learn freeze).
    const res = await autoAnalyzeGameMisconceptions(gameId, undefined, { betweenRows: schedule.yieldBetweenRows }).catch(() => null);
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
  };

  // PASS 1 — THE BOARD, NEWEST GAME FIRST, NO ENGINE (David's phone,
  // 2026-10-20: "Still not filled in!"). The one-price revision put all 344 of
  // his analysed games behind an engine re-price, and every game's board-only
  // halves waited behind its re-price — on a phone engine that stalls, so 0
  // incoming-motif rows were ever recorded and eleven skills read grey. The
  // record is read from the stored analysis first, for every game; the price
  // refines it after.
  const boardGames = [...new Set([...behindThreat, ...behindOther])];
  let n = 0;
  setProgress({ done: 0, total: boardGames.length });
  for (const gameId of boardGames) {
    setProgress({ done: n++, total: boardGames.length });
    await pace();
    await readRecord(gameId);
    if (n % 25 === 0) await rememberRead(readHere);
  }
  await rememberRead(readHere);
  setProgress(null);

  // PASS 2 — ONE PRICE (L6): each move re-priced in one search, then the
  // game's record read again under the new price (its halves re-recorded, the
  // stamps cleared so they are). Persisted per game (stamped), so a killed app
  // re-prices only the rest. A stored move is priced in ONE search on the same
  // engine Learn and the review price with, as background reads: they stand
  // aside for the screen in use (`BACKGROUND_SCORER`).
  const scorer = behindPrice.size > 0 ? (await import('./refutedAlternative')).BACKGROUND_SCORER : null;
  for (const gameId of scorer ? behindPrice : []) {
    await pace();
    const priced = await repriceGameRecord(gameId, { scorer: scorer as NonNullable<typeof scorer>, yieldBetween: schedule.yieldBetweenRows }).catch(() => null);
    if (!priced) continue;
    r.repriced += 1;
    r.repricedRows += priced.rowsRelabeled;
    await db.games.update(gameId, { positiveHalfRev: undefined, threatHalfRev: undefined });
    await readRecord(gameId);
  }
  await rememberRead(readHere);
  // Every game was visited and stamped: the pass is done for these revisions.
  await db.meta.put({ key: BACKFILL_DONE_KEY, value: BACKFILL_REVS });
  void logAppAudit({
    kind: 'coach-surface-migrated',
    category: 'subsystem',
    source: 'misconceptionRulesBackfill.reconcileMisconceptionRules',
    summary: `games re-read under ${MISCONCEPTION_RULES_REV} / ${POSITIVE_HALF_REV} / ${RECORD_PRICE_REV}: ${r.games} game(s), ${r.reattributed} tag(s) moved, ${r.held} held capability row(s), ${r.threats} incoming-motif row(s), ${r.repriced} game(s) re-priced, ${r.repricedRows} slip row(s) relabelled, ${r.collapsed} duplicate(s) collapsed`,
  });
  return r;
}
