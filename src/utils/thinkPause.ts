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

/** "question ‖ answer" → [question, answer]; null when there is no mark. */
export function splitThink(text: string): [string, string] | null {
  const i = text.indexOf(THINK_MARK);
  if (i < 0) return null;
  const q = text.slice(0, i).trim();
  const a = text.slice(i + THINK_MARK.length).trim();
  return q && a ? [q, a] : null;
}

/** The text as it is shown or logged — the mark removed. */
export function stripThink(text: string): string {
  return text.split(THINK_MARK).map((s) => s.trim()).filter(Boolean).join(' ');
}
