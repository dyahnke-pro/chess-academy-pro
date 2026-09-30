// THE THINK PAUSE (David 2026-09-30: "It should answer the question on its own
// like Danya does. A pause for the user to think, then the answer shown and
// explained"). A computer that asks the student a question puts THINK_MARK
// between the question and its answer. The voice speaks the question, waits
// THINK_PAUSE_MS, then shows the answer on the board and speaks it. Anywhere
// the text is shown or logged, the mark is stripped.
//
// A leaf: no imports, so a fact computer can use it.

/** Private separator — never produced by chess prose. */
export const THINK_MARK = '‖';

/** How long the student gets to think before the answer. */
export const THINK_PAUSE_MS = 2500;

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
