// THE THINK PAUSE. A computer that asks the student a question puts THINK_MARK
// between the question and its answer. The voice speaks the question now; the
// ANSWER WAITS FOR THEIR MOVE (David 2026-10-18: "answer waits for my move" —
// this replaces the 2026-09-30 timed pause, which spoke the answer after
// 2.5 seconds whether they had played or not) and leads the next turn, so
// they work it out on the board first. Anywhere the text is shown or logged,
// the mark is stripped.
//
// A leaf: no imports, so a fact computer can use it.

/** Private separator — never produced by chess prose. */
export const THINK_MARK = '‖';

/** A question and its answer, the answer CLOSED by a second mark — so in a
 *  turn that joins several facts, only THIS answer waits for the student's
 *  move. An unclosed mark let every later sentence ride with it (prod walk on
 *  David's record, 2026-10-19: "Nxc6 was one of just two moves that kept the
 *  win" followed the answer and was heard two moves late). */
export function askThenAnswer(question: string, answer: string): string {
  return `${question} ${THINK_MARK} ${answer} ${THINK_MARK}`;
}

/** "question ‖ answer ‖ more" → [what is said now, what waits for the move];
 *  null when there is no mark. Segments alternate: outside the marks is said
 *  now, inside them is owed. */
export function splitThink(text: string): [string, string] | null {
  if (!text.includes(THINK_MARK)) return null;
  const parts = text.split(THINK_MARK).map((p) => p.trim());
  const now = parts.filter((_, k) => k % 2 === 0).filter(Boolean).join(' ');
  const owed = parts.filter((_, k) => k % 2 === 1).filter(Boolean).join(' ');
  return now && owed ? [now, owed] : null;
}

/** The text as it is shown or logged — the mark removed. */
export function stripThink(text: string): string {
  return text.split(THINK_MARK).map((s) => s.trim()).filter(Boolean).join(' ');
}
