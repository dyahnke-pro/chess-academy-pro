/**
 * freeTierService — the metered free tier for the soft paywall.
 * --------------------------------------------------------------------------
 * David 2026-07-14: replace the hard "wall the whole app on launch" gate with a
 * free tier a non-Pro user can actually try. The allowance:
 *   - upload/import games        — unlimited (handled in accessPolicy, no ledger)
 *   - weakness ANALYSIS          — free to view (accessPolicy)
 *   - puzzles                    — 20 total, LIFETIME bucket (this ledger)
 *   - one masterclass opening    — user-picked, first-opened (this ledger)
 *   - kid section                — free for 7 days from first access (this ledger)
 *
 * This service owns the Dexie `freeTier` row + the pure policy helpers the gate
 * and the puzzle meter read. It is DORMANT unless the paywall gate is live AND
 * the user is not Pro — callers guard on that (see accessPolicy / usePuzzleMeter);
 * this module just tracks spend.
 *
 * The LLM decides nothing here (G0) — this is pure product-rule bookkeeping.
 */
import { db, type FreeTierRecord } from '../db/schema';
import openingManifests from '../data/opening-manifests.json';

/** Lifetime free puzzle allowance (one-time bucket, not per-day). */
export const FREE_PUZZLE_LIMIT = 20;

/** Lifetime free coach allowance (David 2026-08-06 — no trial-clock start,
 *  deliberately generous: TTS is cheap at current scale — see freeTierService
 *  doc comment on FreeTierRecord). Both buckets are independent; the coach
 *  route walls only once BOTH are spent (see accessPolicy). */
export const FREE_COACH_LESSON_LIMIT = 7;
export const FREE_COACH_CHAT_LIMIT = 50;

/** Free kid-section window: 7 days from first kid access. */
export const KID_FREE_MS = 7 * 24 * 60 * 60 * 1000;

const SINGLETON_ID = 'singleton';

/**
 * The pool of openings eligible for the ONE free opening pick = EXACTLY what
 * the app's MAIN opening tab (Masterclasses) shows. David 2026-07-14:
 * "Anything in the main opening tab is ok. If not in the main opening tab,
 * don't include it." The main tab's list is `getMasterclassOpeningIds()` =
 * every `opening-manifests.json` key (minus the `_comment`/`_schema` meta
 * keys) — so we derive the pool from the SAME source, and it auto-tracks the
 * tab as manifests are added/removed. Deliberately INCLUDES the masterclass
 * gambits that live in the main tab (King's/Evans/Benko/Budapest/Albin/
 * Schliemann); EXCLUDES the separate Gambits tab (`gambits.json`), the Elite/
 * pro-rep tab (`/openings/pro/*`), the Counter-Weapons tab, and the raw ECO
 * "All" tab.
 */
export const FREE_OPENING_POOL: ReadonlySet<string> = new Set(
  Object.keys(openingManifests).filter((k) => !k.startsWith('_')),
);

/** True when `openingId` is one of the eligible free-pick openings. */
export function isEligibleFreeOpening(openingId: string): boolean {
  return FREE_OPENING_POOL.has(openingId);
}

const DEFAULT_ROW: FreeTierRecord = {
  id: SINGLETON_ID,
  puzzlesSolved: 0,
  freeOpeningId: null,
  kidFirstAccessAt: null,
  coachLessonsUsed: 0,
  coachChatTurnsUsed: 0,
  coachUnlockSeenAt: null,
  updatedAt: 0,
};

/** Load the singleton ledger row, creating an in-memory default if absent.
 *  Never throws — a Dexie hiccup resolves to the default (fail-open-ish; the
 *  gate itself also requires the flag + non-Pro). Merges over DEFAULT_ROW so a
 *  row persisted before the coach fields existed backfills them as 0 instead
 *  of undefined (a stale row predates FREE_COACH_LESSON_LIMIT/FREE_COACH_CHAT_LIMIT). */
export async function loadFreeTier(): Promise<FreeTierRecord> {
  try {
    const row = await db.freeTier.get(SINGLETON_ID);
    return row ? { ...DEFAULT_ROW, ...row } : { ...DEFAULT_ROW };
  } catch {
    return { ...DEFAULT_ROW };
  }
}

async function patch(next: Partial<FreeTierRecord>): Promise<FreeTierRecord> {
  const cur = await loadFreeTier();
  const merged: FreeTierRecord = { ...cur, ...next, id: SINGLETON_ID, updatedAt: Date.now() };
  try {
    await db.freeTier.put(merged);
  } catch {
    // Persistence hiccup — return the merged value so the runtime mirror still
    // advances; it re-persists on the next write.
  }
  return merged;
}

/** Record one solved puzzle against the lifetime bucket. Returns the new row. */
export async function recordPuzzleSolved(): Promise<FreeTierRecord> {
  const cur = await loadFreeTier();
  return patch({ puzzlesSolved: cur.puzzlesSolved + 1 });
}

/** Whole puzzles left in the free bucket (never negative). Pure. */
export function puzzlesRemaining(state: Pick<FreeTierRecord, 'puzzlesSolved'>): number {
  return Math.max(0, FREE_PUZZLE_LIMIT - state.puzzlesSolved);
}

/** Whether the free puzzle bucket still has room. Pure. */
export function hasPuzzlesLeft(state: Pick<FreeTierRecord, 'puzzlesSolved'>): boolean {
  return puzzlesRemaining(state) > 0;
}

/** Record one coach lesson start against the free lifetime bucket. Call only
 *  on a genuinely NEW walkthrough start — resuming a paused one must not call
 *  this again (see CoachTeachPage.onStartWalkthroughForOpening). */
export async function recordCoachLessonUsed(): Promise<FreeTierRecord> {
  const cur = await loadFreeTier();
  return patch({ coachLessonsUsed: cur.coachLessonsUsed + 1 });
}

/** Lessons left in the free bucket (never negative). Pure. */
export function coachLessonsRemaining(state: Pick<FreeTierRecord, 'coachLessonsUsed'>): number {
  return Math.max(0, FREE_COACH_LESSON_LIMIT - state.coachLessonsUsed);
}

/** Whether the free coach-lesson bucket still has room. Pure. */
export function hasCoachLessonsLeft(state: Pick<FreeTierRecord, 'coachLessonsUsed'>): boolean {
  return coachLessonsRemaining(state) > 0;
}

/** Record one coach chat turn against the free lifetime bucket. */
export async function recordCoachChatTurnUsed(): Promise<FreeTierRecord> {
  const cur = await loadFreeTier();
  return patch({ coachChatTurnsUsed: cur.coachChatTurnsUsed + 1 });
}

/** Chat turns left in the free bucket (never negative). Pure. */
export function coachChatTurnsRemaining(state: Pick<FreeTierRecord, 'coachChatTurnsUsed'>): number {
  return Math.max(0, FREE_COACH_CHAT_LIMIT - state.coachChatTurnsUsed);
}

/** Whether the free coach-chat bucket still has room. Pure. */
export function hasCoachChatTurnsLeft(state: Pick<FreeTierRecord, 'coachChatTurnsUsed'>): boolean {
  return coachChatTurnsRemaining(state) > 0;
}

/** Whether ANY coach budget remains — the route-level mount decision. The two
 *  buckets are independent spends (a lesson start doesn't touch chat turns and
 *  vice versa); the coach route walls only once BOTH are exhausted. Pure. */
export function hasCoachAccessLeft(
  state: Pick<FreeTierRecord, 'coachLessonsUsed' | 'coachChatTurnsUsed'>,
): boolean {
  return hasCoachLessonsLeft(state) || hasCoachChatTurnsLeft(state);
}

/** Whether the "the coach is free to try" announcement still needs to be
 *  shown. Pure. True for every non-Pro user who hasn't seen it yet —
 *  including a pre-existing row, which backfills `coachUnlockSeenAt: null`
 *  via loadFreeTier (see FreeTierRecord doc comment). */
export function needsCoachUnlockAnnouncement(
  state: Pick<FreeTierRecord, 'coachUnlockSeenAt'>,
): boolean {
  return state.coachUnlockSeenAt == null;
}

/** Mark the coach-unlock announcement as shown/dismissed (idempotent). */
export async function markCoachUnlockAnnouncementSeen(): Promise<FreeTierRecord> {
  const cur = await loadFreeTier();
  if (cur.coachUnlockSeenAt != null) return cur;
  return patch({ coachUnlockSeenAt: Date.now() });
}

export type ClaimResult =
  | 'ok' // just claimed this opening as the free one
  | 'already-claimed-this' // already the claimed free opening
  | 'denied-other' // a DIFFERENT opening is already the free one
  | 'not-eligible'; // not in the free pool (gambit / pro-rep / etc.)

/**
 * Pure check: may a non-Pro user VIEW this opening for free? True when it's
 * eligible AND (no opening claimed yet OR it's the one already claimed). No
 * side effect — the gate uses this to decide, then persists via
 * `claimFreeOpening` in an effect.
 */
export function canViewOpening(
  openingId: string,
  state: Pick<FreeTierRecord, 'freeOpeningId'>,
): boolean {
  if (!isEligibleFreeOpening(openingId)) return false;
  return state.freeOpeningId == null || state.freeOpeningId === openingId;
}

/** Claim `openingId` as THE one free opening (idempotent). Persists on first
 *  claim; returns the outcome + resulting row. */
export async function claimFreeOpening(
  openingId: string,
): Promise<{ result: ClaimResult; row: FreeTierRecord }> {
  const cur = await loadFreeTier();
  if (!isEligibleFreeOpening(openingId)) return { result: 'not-eligible', row: cur };
  if (cur.freeOpeningId === openingId) return { result: 'already-claimed-this', row: cur };
  if (cur.freeOpeningId != null) return { result: 'denied-other', row: cur };
  const row = await patch({ freeOpeningId: openingId });
  return { result: 'ok', row };
}

/**
 * Whether the 7-day free kid window is still open. Pure.
 *   - never accessed (null) → true (not started; access is still free and will
 *     start the clock on first touch).
 *   - within 7 days of first access → true.
 *   - past 7 days → false (walled).
 */
export function kidWindowActive(
  state: Pick<FreeTierRecord, 'kidFirstAccessAt'>,
  now: number = Date.now(),
): boolean {
  if (state.kidFirstAccessAt == null) return true;
  return now - state.kidFirstAccessAt < KID_FREE_MS;
}

/** Whole days left in the kid free window (null once expired / not started
 *  differently — 7 when unstarted). Pure, for upsell copy. */
export function kidDaysLeft(
  state: Pick<FreeTierRecord, 'kidFirstAccessAt'>,
  now: number = Date.now(),
): number {
  if (state.kidFirstAccessAt == null) return 7;
  const ms = state.kidFirstAccessAt + KID_FREE_MS - now;
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

/** Stamp the first kid-section access if not already set (idempotent). Returns
 *  the row. Safe to call on every kid mount. */
export async function stampKidAccess(): Promise<FreeTierRecord> {
  const cur = await loadFreeTier();
  if (cur.kidFirstAccessAt != null) return cur;
  return patch({ kidFirstAccessAt: Date.now() });
}
