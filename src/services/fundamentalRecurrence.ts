// fundamentalRecurrence — the sentence that closes the loop out loud.
//
// THE APP IN ONE LINE (CLAUDE.md, level I): the coach learns you, and what it
// learned changes what it says next. Until 2026-09-20 every half of that was
// built and none of it was AUDIBLE for a fundamental: the sweep recorded the
// slip (`autoAnalyzeGame` → `misconceptionTags.fundamentalId`), the spine
// aggregated it (`weaknessSpine.aggregateFundamentals` → `fundamental:<id>`
// rows with provenance), `matchFundamental` joined it — and had ZERO production
// callers. A computer wired one way, with prose describing the half that was
// not connected (PLAN.md, "the one disease behind everything landed tonight").
//
// ONE computer, TWO registers (the two-register law): review speaks it in the
// retrospective voice, Learn in the present tense. Same count, same game, same
// join — only the wrapper differs. Deterministic, no rating, no model: the
// count and the opponent come from the student's own records or the clause is
// not spoken at all (empty > generic > invented).

import { matchFundamental, matchTag, type WeaknessSignal } from './weaknessSignal';
import { recurrenceFor, recurrenceLine, type RecurrenceRegister } from './misconceptionCallbacks';

/** What the move touched: a fundamental the attributor named, or a recorded
 *  mistake tag (`misconceptionTags`) / a capability tag. */
type RecallMatch = { fundamental: string } | { tag: string };

/** One per-game memory of what the coach has already recalled — keyed by
 *  direction AND weakness, so "you've walked into this before" and "this time
 *  you held it" are each said once a game per weakness, on every surface.
 *  Mutated by `recall`. */
export type RecallMemory = Set<string>;

interface RecallInput {
  /** What this move touched, most important first. */
  matches: readonly RecallMatch[];
  /** The student repeated the slip, or held the question this time. */
  direction: 'failed' | 'held';
  /** Review speaks in the retrospective voice, Learn in the present tense; a
   *  drill (a puzzle, not a game) names the games it caught them in. */
  register: 'live' | 'review' | 'drill';
  /** The student's weakness signals (the spine, joined). */
  signals: readonly WeaknessSignal[];
  /** The game being narrated, when the caller knows it — so a row the sweep
   *  already wrote for THIS game is not counted as a prior game. Learn passes
   *  nothing: its game is live and unrecorded, so every row is prior. */
  currentGameId?: string | null;
  memory: RecallMemory;
  /** Only weaknesses open in at least this many records, the most recurring
   *  first (the causal chain names only a hole the student KEEPS falling in). */
  minOpen?: number;
  now?: number;
}

/**
 * THE ONE MEMORY COMPUTER (David 2026-10-15: "Unify!"). The recurrence clause
 * for the first match the student's record proves happened in ANOTHER game,
 * or null. Null is the answer for a fresh install, an unmatched fundamental or
 * tag, a weakness whose only rows are this same game, and a weakness already
 * recalled in this direction this game.
 */
export function recall(input: RecallInput): string | null {
  let hits = input.matches
    .map((m) => ('fundamental' in m ? matchFundamental(m.fundamental, input.signals) : matchTag(m.tag, input.signals)))
    .filter((h): h is WeaknessSignal => h !== null);
  if (input.minOpen !== undefined) {
    const min = input.minOpen;
    hits = hits.filter((h) => h.openCount >= min).sort((a, b) => b.openCount - a.openCount);
  }
  const register: RecurrenceRegister = input.direction === 'held' ? 'held' : input.register;
  for (const hit of hits) {
    const key = `${input.direction}:${hit.label}`;
    if (input.memory.has(key)) continue;
    const read = recurrenceFor(hit, input.currentGameId);
    if (!read) continue;
    input.memory.add(key);
    return recurrenceLine(hit.label, read, register, input.now);
  }
  return null;
}
