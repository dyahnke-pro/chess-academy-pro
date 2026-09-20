// misconceptionCallbacks — "we've talked about this" (David 2026-07-11,
// "LOVE THIS"). A real coach remembers you: when a freshly-captured slip
// matches a pattern already in the weakness buckets, the reveal says so with
// COMPUTED history — the count and the recency come from the Dexie records,
// never from the model (G0; the number-fidelity net guards the phrasing).

import { db } from '../db/schema';
import { getMisconceptionTag } from '../data/misconceptionTags';
import type { MisconceptionTagRecord } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

function ordinal(n: number): string {
  const words: Record<number, string> = { 2: 'second', 3: 'third', 4: 'fourth', 5: 'fifth', 6: 'sixth' };
  return words[n] ?? `${n}th`;
}

/** CONCRETE OVER GENERIC (the first Narration Voice Rule). Two roundings were
 *  costing the student real information: 9 days read as "1 week ago" — David
 *  asked for this in DAYS — and anything past a month collapsed to "a while
 *  back", which is exactly the vague filler rule 1 bans. Days stay days for a
 *  fortnight, then weeks, then real months. */
function recencyPhrase(lastPriorAt: number, now: number): string {
  const days = Math.floor((now - lastPriorAt) / DAY_MS);
  if (days <= 0) return 'earlier today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 32) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) {
    const months = Math.max(1, Math.round(days / 30));
    return months === 1 ? 'about a month ago' : `about ${months} months ago`;
  }
  return 'over a year ago';
}

/**
 * Pure composer — the callback sentence for a tag given its full COUNTED
 * record history (newest capture included). Returns null when this is the
 * first occurrence (nothing to call back to) or the tag is unknown.
 */
/** WHERE THE PREVIOUS OCCURRENCE HAPPENED — optional, and honestly absent when
 *  the source cannot say (a drill has no opponent; an older record has no game
 *  link). Mirrors `WeaknessProvenance` on the spine so one shape describes
 *  "where did this come from" everywhere (CLAUDE.md capability parity). */
export interface CallbackContext {
  opponentName?: string | null;
  /** ms — when the game was PLAYED. Never the capture clock: see the note on
   *  `recencyPhrase` below. */
  playedAt?: number;
}

export function composeCallbackLine(
  tag: string,
  records: ReadonlyArray<Pick<MisconceptionTagRecord, 'createdAt' | 'counted'>>,
  now: number = Date.now(),
  /** The previous occurrence's game, when known. David 2026-09-16: "Name the
   *  game! Date and opponent if available." */
  prior?: CallbackContext,
): string | null {
  const def = getMisconceptionTag(tag);
  if (!def) return null;
  // NEVER call back on the catch-all holding pen (David 2026-07-19: the reveal
  // said "We've seen this before — uncategorized" and counted unrelated opening
  // slips as one "pattern"). `other`/uncategorized is a review queue, not a real
  // recurring misconception — distinct errors land here with different
  // customLabels, so a shared count is meaningless AND it voices an internal
  // label. Skip the callback entirely; it only fires for a genuine named tag.
  if (def.id === 'other' || def.bucket === 'uncategorized') return null;
  const counted = records
    .filter((r) => r.counted !== false)
    .map((r) => r.createdAt)
    .sort((a, b) => a - b);
  const n = counted.length;
  if (n < 2) return null;
  // 🔒 THE CLOCK. Prefer the PLAY time over the capture time whenever the caller
  // can supply it. `createdAt` is when the APP recorded the slip — on an
  // imported archive that is the day the user hit Import, so every slip in a
  // three-year archive would read "earlier today". `weaknessLifecycle` anchors
  // on the play clock for exactly this reason; so does this.
  const lastPrior = prior?.playedAt ?? counted[n - 2];
  return composeFrom(def.label, n, lastPrior, now, prior);
}

/**
 * Dexie-backed lookup: the callback line for a JUST-CAPTURED tag (the fresh
 * record is already stored, so it's part of the count). Null on first
 * occurrence, unknown tag, or any storage error — the callback is a bonus,
 * never a blocker.
 */
export async function buildMisconceptionCallback(tag: string): Promise<string | null> {
  try {
    const records = await db.misconceptionTags.where('tag').equals(tag).toArray();
    return composeCallbackLine(tag, records);
  } catch {
    return null;
  }
}

// ── THE SAME SENTENCE, FROM THE WHOLE SPINE ────────────────────────────────
// David 2026-09-16: "Name the game! Date and opponent if available."
//
// The callback above keys on the 26-tag closed misconception set — the slips
// the coach caught by ASKING. But most of a student's holes are `analysis:*`
// clusters derived from their mistake puzzles and classified tactics, and those
// got no callback at all: the app could tell you it had seen a misconception
// before, and could not tell you it had seen you miss forks four times. Same
// sentence, wider source (CLAUDE.md capability parity).

/** One composer, two vocabularies — so the two can never drift into saying the
 *  same thing differently. */
function composeFrom(label: string, occurrences: number, lastPriorAt: number, now: number, prior?: CallbackContext): string | null {
  if (occurrences < 2) return null; // nothing to call BACK to
  // NAME THE GAME when we can; omit the clause entirely when we cannot. Naming
  // the wrong player is worse than naming none (empty > generic > invented).
  const who = prior?.opponentName ? ` against ${prior.opponentName}` : '';
  return `We've seen this before — ${label.toLowerCase()}. That's the ${ordinal(occurrences)} time this pattern has come up; the last one was${who} ${recencyPhrase(lastPriorAt, now)}.`;
}

/** Cluster ids whose label is a PLACEHOLDER, not a pattern. Calling back on
 *  "mistakes in the middlegame" is the `other`-tag dilution in a different
 *  costume: it counts unrelated slips as one recurring thing and teaches
 *  nothing. `bucketForMistake` calls these the vaguest buckets itself. */
const GENERIC_CLUSTERS = new Set([
  'analysis:phase:opening',
  'analysis:phase:middlegame',
  'analysis:phase:endgame',
]);

/** The minimal weakness shape this needs — structurally satisfied by
 *  `UnifiedWeakness`, without importing it (keeps this a leaf). */
export interface CallbackWeakness {
  tag: string;
  label: string;
  total: number;
  lastSeenAt: number;
  positions: ReadonlyArray<{ from?: { opponentName?: string | null; playedAt?: number } }>;
}

/**
 * The callback line for ANY weakness cluster — analysis or coach. Reads the
 * PRIOR occurrence's provenance (positions are newest-first, so [1] is the one
 * before this), which is why the spine had to carry provenance first.
 *
 * Null when the cluster is a generic placeholder, or when there is nothing to
 * call back to.
 */
export function composeWeaknessCallback(w: CallbackWeakness, now: number = Date.now()): string | null {
  if (GENERIC_CLUSTERS.has(w.tag)) return null;
  const prior = w.positions[1]?.from;
  // The PLAY clock when the source knows it; the row's own lastSeenAt otherwise.
  // Never `createdAt` — on an imported archive that is the day they hit Import.
  const lastPriorAt = prior?.playedAt ?? w.lastSeenAt;
  return composeFrom(w.label, w.total, lastPriorAt, now, {
    opponentName: prior?.opponentName,
    playedAt: prior?.playedAt,
  });
}

/**
 * THE IN-FLOW RECURRENCE CLAUSE — the review walk's register, not the reveal's.
 *
 * The review already had a recurrence beat ("This one keeps recurring in your
 * games — missed forks — a good pattern to drill."). It could say a hole recurs
 * and never how OFTEN or WHERE, because the count and the game were computed
 * upstream and dropped at every layer in between (the spine threw away the
 * provenance its sources carried; `WeaknessSignal` then threw away the count).
 * Both now survive, so the beat can name them.
 *
 * Every clause is conditional on its source actually knowing the answer — an
 * unknown count simply does not appear, and an unknown opponent never becomes
 * "your opponent" (empty > generic > invented).
 */
export function recurrenceClause(
  label: string,
  occurrences?: number,
  prior?: CallbackContext,
  now: number = Date.now(),
): string {
  const times = occurrences && occurrences >= 2 ? `, the ${ordinal(occurrences)} time now` : '';
  const who = prior?.opponentName ? ` against ${prior.opponentName}` : '';
  const when = prior?.playedAt ? ` — the last one was${who} ${recencyPhrase(prior.playedAt, now)}` : (who ? ` — the last one was${who}` : '');
  return `This one keeps recurring in your games — ${label.toLowerCase()}${times}${when}. Worth drilling.`;
}

// ── THE RECURRENCE READ — counted in GAMES, honest about THIS game ───────────
// WO-LOOP-01 (2026-09-20). Two defects in the way the in-flow clause counted:
// (1) `total` counts ROWS, so two loose pieces in ONE game read as "the second
// time now — the last one was against <this game's opponent>", which is not a
// recurrence across games at all; (2) whether the current game's own rows had
// already been swept in depended on timing, so the count was off by one either
// way. The unit is now the GAME: prior games are the provenance rows whose
// gameId is not the one being narrated, and the moment being narrated is game
// N+1. Learn passes no id (its game is live and unrecorded), so every row is
// prior — which is exactly right.

export interface RecurrenceGame {
  gameId: string;
  opponentName?: string | null;
  playedAt?: number;
}

/** The minimal signal shape — structurally satisfied by `WeaknessSignal`. */
export interface RecurrenceSource {
  total?: number;
  openCount?: number;
  /** Distinct games this hole was recorded in, newest first, when the source
   *  carries provenance. Absent on coach-only shapes that never had a game. */
  games?: readonly RecurrenceGame[];
}

export interface RecurrenceRead {
  /** How many games this makes, INCLUDING the one being narrated; undefined
   *  when the source proves recurrence but cannot count games. */
  occurrences?: number;
  /** The most recent PRIOR game, when known. */
  prior?: CallbackContext;
}

export function recurrenceFor(sig: RecurrenceSource, currentGameId?: string | null): RecurrenceRead | null {
  if (sig.games) {
    const prior = sig.games.filter((g) => g.gameId !== currentGameId);
    if (prior.length === 0) return null;
    return { occurrences: prior.length + 1, prior: { opponentName: prior[0].opponentName, playedAt: prior[0].playedAt } };
  }
  // No provenance at all (a coach-only shape): recurrence is proven only by the
  // open-instance count, and no game can be named.
  if ((sig.openCount ?? 0) < 2 && (sig.total ?? 0) < 2) return null;
  return { occurrences: sig.total !== undefined && sig.total >= 2 ? sig.total : undefined };
}

export type RecurrenceRegister = 'review' | 'live';

/** ONE composer, TWO registers (the two-register law). Every clause appears
 *  only when its source knows it: no count → no ordinal; no game → no "against". */
export function recurrenceLine(label: string, read: RecurrenceRead, register: RecurrenceRegister, now: number = Date.now()): string {
  const times = read.occurrences && read.occurrences >= 2 ? `, the ${ordinal(read.occurrences)} game now` : '';
  const who = read.prior?.opponentName ? ` against ${read.prior.opponentName}` : '';
  const when = read.prior?.playedAt
    ? ` — the last one was${who} ${recencyPhrase(read.prior.playedAt, now)}`
    : (who ? ` — the last one was${who}` : '');
  if (register === 'review') {
    return `This one keeps recurring in your games — ${label.toLowerCase()}${times}${when}. Worth drilling.`;
  }
  return `You've walked into this before — ${label.toLowerCase()}${times}${when}.`;
}
