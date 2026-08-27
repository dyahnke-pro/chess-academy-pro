// coachThread — the coaching discussion carried across TIME and surfaces (G0).
//
// David 2026-08-26: "can we carry this discussion past the playing surface?
// … out of the coach tab and into the app across TIME and surfaces." The
// deliberation (deliberation.ts) made the voice stateful WITHIN a position; this
// extends the same statefulness ACROSS sessions and surfaces. The weakness spine
// is already the app's long-term memory of what you're working on — this reads
// it as a persistent THREAD and lets any surface call back to it.
//
// HONEST SCOPE (not oversold): this is pattern-tag RECOGNITION, not episodic
// recollection. The coach does not remember what was said; it matches the
// current position's computed pattern against the active weakness tag and calls
// back. And the callback is EARNED + RARE (say-once per thread per session) so
// it can never nag. G0 intact: the thread and the match are computed from the
// weakness spine + the position's detected tags; the voice only phrases it.
//
// Doc: docs/plans/2026-08-26-coach-my-weakness-focus-lens.md §4.0 / §8.
import { getUnifiedWeaknessProfile } from './weaknessSpine';

export interface CoachingThread {
  /** The weakness tag (the thread's identity). */
  tag: string;
  /** Human label ("Removal of the guard", "Rook endgames"). */
  label: string;
  /** puzzles.json theme ids for the pattern — how a position's detected tags
   *  match the thread (may be empty for non-tactical weaknesses). */
  patternThemes: string[];
  /** How many times this pattern has been seen across all games (total). */
  count: number;
  /** When it last showed up — recency keeps a stale thread from resurfacing. */
  lastSeenAt: number;
}

/**
 * The single thing the coach is working on with you right now — the top
 * recency+severity weakness from the spine. Null when there's no data yet (a new
 * user / clean games) — the caller then says nothing rather than invent a thread.
 */
export async function getActiveCoachingThread(): Promise<CoachingThread | null> {
  const profile = await getUnifiedWeaknessProfile();
  const top = profile[0];
  if (!top) return null;
  return {
    tag: top.tag,
    label: top.label,
    patternThemes: [...top.puzzleThemes],
    count: top.total,
    lastSeenAt: top.lastSeenAt,
  };
}

// Say-once per thread per session: a callback is EARNED and RARE — never a nag.
// Module-level so it spans surfaces within a session; cleared on a fresh session.
const spokenThreads = new Set<string>();

/** Reset the say-once ledger — call at the start of a fresh coaching session. */
export function resetThreadCallbacks(): void {
  spokenThreads.clear();
}

/** Test/observability hook — has this thread's callback already fired this session. */
export function threadCallbackAlreadySpoken(tag: string): boolean {
  return spokenThreads.has(tag);
}

/** Does the current position TOUCH the active thread — its detected pattern tags
 *  overlap the thread's pattern (or name its tag)? Pure, no side effects. */
export function positionTouchesThread(thread: CoachingThread | null, detectedTags: readonly string[]): boolean {
  if (!thread) return false;
  const themes = new Set(thread.patternThemes);
  return detectedTags.some((t) => t === thread.tag || themes.has(t));
}

/**
 * A callback line when the CURRENT position touches the active thread — else ''.
 * `detectedTags` = the position's computed pattern tags (boardConcepts /
 * detectTactics themes). EARNED + say-once per thread per session, so it fires at
 * most once a session and only on a genuine recurrence — never a nag. The
 * consumer prepends this to the position's narration; the DNA register phrases it.
 */
export function threadCallbackFor(thread: CoachingThread | null, detectedTags: readonly string[]): string {
  if (!positionTouchesThread(thread, detectedTags)) return '';
  const t = thread as CoachingThread; // narrowed by positionTouchesThread
  if (spokenThreads.has(t.tag)) return '';
  spokenThreads.add(t.tag);
  const games = t.count >= 2 ? ` — that's ${t.count} games running now` : '';
  return `This is the ${t.label.toLowerCase()} we've been working on${games}.`;
}
