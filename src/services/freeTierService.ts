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
import gambitsData from '../data/gambits.json';
import proRepertoireData from '../data/pro-repertoires.json';

/** Lifetime free puzzle allowance (one-time bucket, not per-day). */
export const FREE_PUZZLE_LIMIT = 20;

/** Lifetime free coach allowance (David 2026-08-06 — no trial-clock start,
 *  deliberately generous: TTS is cheap at current scale — see freeTierService
 *  doc comment on FreeTierRecord). Both buckets are independent; the coach
 *  route walls only once BOTH are spent (see accessPolicy). */
export const FREE_COACH_LESSON_LIMIT = 7;
export const FREE_COACH_CHAT_LIMIT = 50;

/**
 * THE coach free-tier gate (David 2026-08-23: "free until they have hit $1.00
 * worth of tokens on deepseek"). A non-Pro user gets $1.00 of estimated coach
 * LLM token-cost, LIFETIME, before /coach/* walls. This SUPERSEDES the old
 * lesson/chat-turn count buckets as the gate — those counters stay for
 * analytics only. $1 of DeepSeek is generous: a coach turn is a fraction of a
 * cent, so this is hundreds of turns before anyone sees the wall.
 */
export const FREE_COACH_SPEND_LIMIT_USD = 1.0;

/** Free kid-section window: 7 days from first kid access. */
export const KID_FREE_MS = 7 * 24 * 60 * 60 * 1000;

const SINGLETON_ID = 'singleton';

/**
 * The pool of openings eligible for the ONE free opening pick. Originally
 * EXACTLY the main opening tab (David 2026-07-14: "Anything in the main
 * opening tab is ok. If not in the main opening tab, don't include it"),
 * derived from `opening-manifests.json` so it auto-tracks the tab as
 * manifests are added/removed.
 *
 * Widened 2026-08-09 (David: "They can pick an opening from the pro reps or
 * gambits, that's fine") to also include the separate Gambits tab
 * (`gambits.json`) and the Elite/pro-rep tab (`pro-repertoires.json`), now
 * that both are browsable free at the route (accessPolicy). Still EXCLUDES
 * the Counter-Weapons tab and the raw ECO "All" tab — those stay walled.
 */
export const FREE_OPENING_POOL: ReadonlySet<string> = new Set([
  ...Object.keys(openingManifests).filter((k) => !k.startsWith('_')),
  ...gambitsData.map((g) => g.id),
  ...proRepertoireData.openings.map((o) => o.id),
]);

/** True when `openingId` is one of the eligible free-pick openings. */
export function isEligibleFreeOpening(openingId: string): boolean {
  return FREE_OPENING_POOL.has(openingId);
}

const DEFAULT_ROW: FreeTierRecord = {
  id: SINGLETON_ID,
  puzzlesSolved: 0,
  freeOpeningId: null,
  freeOpeningIds: [],
  earnedOpeningCredits: 0,
  kidFirstAccessAt: null,
  coachLessonsUsed: 0,
  coachChatTurnsUsed: 0,
  coachSpendUsd: 0,
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
    return row ? normalizeRow({ ...DEFAULT_ROW, ...row }) : { ...DEFAULT_ROW };
  } catch {
    return { ...DEFAULT_ROW };
  }
}

/** Reconcile the legacy single `freeOpeningId` with the new `freeOpeningIds`
 *  set so a row persisted before the set existed backfills correctly (the
 *  DEFAULT_ROW merge alone would leave the set empty while the legacy id held a
 *  claim). Idempotent — pure. */
function normalizeRow(row: FreeTierRecord): FreeTierRecord {
  const ids = Array.isArray(row.freeOpeningIds) ? row.freeOpeningIds.filter(Boolean) : [];
  const set = new Set(ids);
  if (row.freeOpeningId && !set.has(row.freeOpeningId)) set.add(row.freeOpeningId);
  const merged = [...set];
  return {
    ...row,
    freeOpeningIds: merged,
    freeOpeningId: row.freeOpeningId ?? merged[0] ?? null,
    earnedOpeningCredits: Math.max(0, row.earnedOpeningCredits ?? 0),
  };
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

/** Accrue estimated coach LLM (DeepSeek) token cost against the lifetime free
 *  budget. Called at the one LLM chokepoint (coachCostService.recordApiUsage).
 *  Ignores non-positive/NaN costs so an unpriced model never advances the gate. */
export async function recordCoachSpend(costUsd: number): Promise<FreeTierRecord> {
  const cur = await loadFreeTier();
  if (!(costUsd > 0)) return cur;
  return patch({ coachSpendUsd: cur.coachSpendUsd + costUsd });
}

/** USD of free coach budget left (never negative). Pure. */
export function coachSpendRemaining(state: Pick<FreeTierRecord, 'coachSpendUsd'>): number {
  return Math.max(0, FREE_COACH_SPEND_LIMIT_USD - state.coachSpendUsd);
}

/** Whether ANY free coach budget remains — the route-level mount decision.
 *  David 2026-08-23: gate on cumulative DeepSeek token COST ($1 lifetime), not
 *  on lesson/chat-turn counts. Pure. */
export function hasCoachAccessLeft(state: Pick<FreeTierRecord, 'coachSpendUsd'>): boolean {
  return state.coachSpendUsd < FREE_COACH_SPEND_LIMIT_USD;
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
type OpeningSlotState = Pick<FreeTierRecord, 'freeOpeningId' | 'freeOpeningIds' | 'earnedOpeningCredits'>;

/** The set of openings the user has claimed for free (legacy id folded in). Pure. */
function claimedOpenings(state: OpeningSlotState): string[] {
  const ids = Array.isArray(state.freeOpeningIds) ? state.freeOpeningIds.filter(Boolean) : [];
  const set = new Set(ids);
  if (state.freeOpeningId) set.add(state.freeOpeningId);
  return [...set];
}

/** Total free-opening slots: the base 1 plus every earned reward credit. Pure. */
export function openingAllowance(state: Pick<FreeTierRecord, 'earnedOpeningCredits'>): number {
  return 1 + Math.max(0, state.earnedOpeningCredits ?? 0);
}

/** Free-opening slots still available to claim (never negative). Pure. */
export function openingSlotsRemaining(state: OpeningSlotState): number {
  return Math.max(0, openingAllowance(state) - claimedOpenings(state).length);
}

/** True when the user could still claim ANOTHER eligible opening for free
 *  (a slot is open). Drives the "this one's free" badge. Pure. */
export function hasFreeOpeningRoom(state: OpeningSlotState): boolean {
  return openingSlotsRemaining(state) > 0;
}

export function canViewOpening(openingId: string, state: OpeningSlotState): boolean {
  if (!isEligibleFreeOpening(openingId)) return false;
  const claimed = claimedOpenings(state);
  return claimed.includes(openingId) || claimed.length < openingAllowance(state);
}

/** Claim `openingId` as one of the free openings (idempotent). Persists on
 *  first claim if a slot is open; returns the outcome + resulting row. */
export async function claimFreeOpening(
  openingId: string,
): Promise<{ result: ClaimResult; row: FreeTierRecord }> {
  const cur = await loadFreeTier();
  if (!isEligibleFreeOpening(openingId)) return { result: 'not-eligible', row: cur };
  const claimed = claimedOpenings(cur);
  if (claimed.includes(openingId)) return { result: 'already-claimed-this', row: cur };
  if (claimed.length >= openingAllowance(cur)) return { result: 'denied-other', row: cur };
  const nextIds = [...claimed, openingId];
  const row = await patch({ freeOpeningIds: nextIds, freeOpeningId: nextIds[0] });
  return { result: 'ok', row };
}

/** Grant `n` extra free-opening credits (referral qualified / review tap-through,
 *  David 2026-09-06). Raises the allowance so the user can claim another opening.
 *  Returns the resulting row. `n` clamps to >= 0. */
export async function grantOpeningCredits(n: number): Promise<FreeTierRecord> {
  const add = Math.max(0, Math.floor(n));
  if (add === 0) return loadFreeTier();
  const cur = await loadFreeTier();
  return patch({ earnedOpeningCredits: Math.max(0, cur.earnedOpeningCredits ?? 0) + add });
}

/** Set earned credits to at least `n` (server-truth sync, max-wins so a local
 *  value is never lowered by a stale fetch). Returns the resulting row. */
export async function syncOpeningCredits(n: number): Promise<FreeTierRecord> {
  const target = Math.max(0, Math.floor(n));
  const cur = await loadFreeTier();
  const have = Math.max(0, cur.earnedOpeningCredits ?? 0);
  if (target <= have) return cur;
  return patch({ earnedOpeningCredits: target });
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
