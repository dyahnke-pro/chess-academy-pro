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

import { matchFundamental, type WeaknessSignal } from './weaknessSignal';
import { recurrenceFor, recurrenceLine, type RecurrenceRegister } from './misconceptionCallbacks';

export interface FundamentalRecurrenceInput {
  /** The fundamentals attributed to THIS move, most important first. */
  ids: readonly string[];
  /** The student's weakness signals (the spine, joined). */
  signals: readonly WeaknessSignal[];
  /** The game being narrated, when the caller knows it — so a row the sweep
   *  already wrote for THIS game is not counted as a prior game. Learn passes
   *  nothing: its game is live and unrecorded, so every row is prior. */
  currentGameId?: string | null;
  register: RecurrenceRegister;
  /** Per-game say-once ledger, keyed on the weakness LABEL — mutated. */
  seenLabels: Set<string>;
  now?: number;
}

/**
 * The recurrence clause for the first attributed fundamental that the student's
 * record proves has recurred in ANOTHER game, or null. Null is the answer for a
 * fresh install, an unmatched fundamental, a fundamental whose only prior rows
 * are this same game, and a label already spoken this game.
 */
export function fundamentalRecurrenceLine(input: FundamentalRecurrenceInput): string | null {
  for (const id of input.ids) {
    const hit = matchFundamental(id, input.signals);
    if (!hit) continue;
    if (input.seenLabels.has(hit.label)) continue;
    const read = recurrenceFor(hit, input.currentGameId);
    if (!read) continue;
    input.seenLabels.add(hit.label);
    return recurrenceLine(hit.label, read, input.register, input.now);
  }
  return null;
}
