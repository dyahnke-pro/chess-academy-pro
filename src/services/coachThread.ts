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
  /** How many times this pattern has been seen — OCCURRENCES, across all games. */
  count: number;
  /** How many DISTINCT games those occurrences came from (C10, 2026-09-22).
   *  `count` is not this: ten slips in six games is count 10, games 6 — and
   *  the callback used to read `count` as "10 games running now". 0 when the
   *  source has no game at all (a repertoire drill, board vision). */
  games: number;
  /** ms of the last DRILL on this weakness, or null when it has never been
   *  drilled. "We've been working on this" is a claim about sessions that
   *  happened; it may only be said when this is non-null. */
  drilledAt: number | null;
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
    games: top.gameIds.length,
    drilledAt: top.lastDrilledAt,
    lastSeenAt: top.lastSeenAt,
  };
}

/** The evidence clause — occurrences AND the distinct games they came from,
 *  never one number wearing the other's name. Silent for a single occurrence
 *  (nothing to count). Exported so the gate can hold every branch. */
export function threadEvidenceClause(t: Pick<CoachingThread, 'count' | 'games'>): string {
  if (t.count < 2) return '';
  const slips = `${t.count} slips`;
  if (t.games >= 2) return ` — ${slips} across ${t.games} games`;
  if (t.games === 1) return ` — ${slips} in one game`;
  return ` — ${slips} so far`;
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
  // TWO CLAIMS, EACH EARNED BY ITS OWN COMPUTED FACT (C10, 2026-09-22). This
  // used to say "the X we've been working on — that's N games running now"
  // where N was OCCURRENCES and no drill had ever happened: five minutes after
  // an import it told the student they had been working on something for ten
  // games. "We've been working on" is true only when a drill session exists
  // (`drilledAt`); the count names slips and the games they came from.
  const evidence = threadEvidenceClause(t);
  const label = t.label.toLowerCase();
  return t.drilledAt !== null
    ? `This is the ${label} we've been working on${evidence}.`
    : `This is the ${label} from your games${evidence}.`;
}
