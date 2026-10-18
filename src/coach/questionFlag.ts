// questionFlag — A QUESTION THE COACH STILL CANNOT READ IS FLAGGED (David
// 2026-10-18: after "say it another way", a second miss tells the student the
// question is flagged so it can be answered in the future).
//
// One memory per surface: the last turn there was a miss (asked back, or the
// stock fallback). A second miss in a row is answered with the flag line and
// recorded — durably, in PostHog — with the student's own words, so the
// question can be read and taught later. Any answered turn clears it. The
// coach never says "I" (RULEBOOK V1/V2): the line is said of the coach.
import { captureEvent } from '../services/analytics';
import { NOT_UNDERSTOOD_LINE } from './chatTurn';
import { STEMS } from './smallTalk';

/** The replies that mean "the question was not understood" — a clarification
 *  ("open a board first", "which position?") is an answer, not a miss. */
const NOT_UNDERSTOOD = new Set<string>([NOT_UNDERSTOOD_LINE, ...STEMS.unclear]);
const norm = (t: string): string => t.trim().replace(/\s+/g, ' ');

/** Was this reply a "did not understand"? The stock fallback counts too. */
export function isNotUnderstood(text: string, stock: boolean): boolean {
  return stock || NOT_UNDERSTOOD.has(norm(text));
}

export const FLAG_LINE = "That one's flagged for David, so the coach can answer it next time.";

const missedLast = new Map<string, string>();

/** The outcome of one turn on `surface`. Returns the flag line when this is
 *  the second miss in a row (and records the question), else null. */
export function noteTurnOutcome(surface: string, ask: string, missed: boolean): string | null {
  if (!missed) { missedLast.delete(surface); return null; }
  const first = missedLast.get(surface);
  if (first === undefined) { missedLast.set(surface, ask); return null; }
  missedLast.delete(surface);
  captureEvent('coach_question_flagged', { surface, question: ask.slice(0, 500), first_try: first.slice(0, 500) });
  return FLAG_LINE;
}

/** Test seam: forget every surface's memory. */
export function resetQuestionFlags(): void { missedLast.clear(); }
