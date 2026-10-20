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

/** The student's move that a waiting answer is resolved against: the board
 *  they moved from, the move, and the board as it stands when it is spoken
 *  (after the coach's reply). */
export interface PlayedMove { fenBefore: string; san: string; fenNow: string }

/** How a waiting answer reads once the student has moved: credit when they
 *  found it, the past tense about the board it was asked on when they did not,
 *  null when it no longer matters. REQUIRED on every question — an answer
 *  spoken as a present-tense description of a board that is gone was the
 *  defect (Black walk 2026-10-19: "nothing of yours can be taken" read on
 *  11…Bh4 and heard after 12…Nxb3). */
export type AnswerResolver = (move: PlayedMove) => string | null;

/** A segment with no words — the "." a sentence-closer adds after a closing
 *  mark (replay 2026-10-19: "…seizing the open c-file? ."). */
const hasWords = (p: string): boolean => /[\p{L}\p{N}]/u.test(p);

/** A waiting answer is tagged with one private-use character that names its
 *  resolver. Not a letter or digit, so every text key, dedupe and word count
 *  ignores it; `stripThink` removes it. */
const TOKEN_BASE = 0xe000;
const TOKEN_SPAN = 0x1800;
const TOKEN_RE = /[\ue000-\uf7ff]/g;
const resolvers = new Map<string, AnswerResolver>();
let nextToken = 0;

/** A question and its answer, the answer CLOSED by a second mark — so in a
 *  turn that joins several facts, only THIS answer waits for the student's
 *  move. An unclosed mark let every later sentence ride with it (prod walk on
 *  David's record, 2026-10-19: "Nxc6 was one of just two moves that kept the
 *  win" followed the answer and was heard two moves late). */
export function askThenAnswer(question: string, answer: string, resolve: AnswerResolver): string {
  const token = String.fromCharCode(TOKEN_BASE + (nextToken++ % TOKEN_SPAN));
  resolvers.set(token, resolve);
  return `${question} ${THINK_MARK}${token} ${answer} ${THINK_MARK}`;
}

/** The line ENDED as a sentence — inside its closing mark when it ends on one.
 *  A question's line ends on the mark, so a closer that read only the last
 *  character put its "." AFTER the mark, where it was said as a sentence of
 *  its own ("…the open c-file? ." and "It wins a pawn. .", replays
 *  2026-10-19). Every closer that may receive a question line uses this. */
const TRAILING_MARKS = new RegExp(`[\\s${THINK_MARK}\\ue000-\\uf7ff]*$`, 'u');
export function closeSentence(text: string): string {
  const bare = text.trim();
  const tail = TRAILING_MARKS.exec(bare)?.[0] ?? '';
  const body = bare.slice(0, bare.length - tail.length);
  if (!body || /[.!?…]["'’”)\]]*$/.test(body)) return bare;
  return `${body}.${tail}`;
}

/** The text with its answer tags removed and the marks kept — what a test
 *  or a log compares. */
export function withoutTags(text: string): string {
  return text.replace(TOKEN_RE, '');
}

/** The waiting answers of `owed` (the second half of `splitThink`), each read
 *  against the move the student played; an answer whose resolver says it no
 *  longer matters is dropped, and an untagged one is never spoken. */
export function resolveOwed(owed: string, move: PlayedMove): string {
  const out: string[] = [];
  for (const m of owed.matchAll(/([\ue000-\uf7ff])([^\ue000-\uf7ff]*)/g)) {
    const r = resolvers.get(m[1]);
    resolvers.delete(m[1]);
    if (!r) continue;
    let said: string | null = null;
    try { said = r(move); } catch { said = null; }
    if (said && hasWords(said)) out.push(said.trim());
  }
  return out.join(' ');
}

/** "question ‖ answer ‖ more" → [what is said now, what waits for the move];
 *  null when there is no mark. Segments alternate: outside the marks is said
 *  now, inside them is owed. */
export function splitThink(text: string): [string, string] | null {
  if (!text.includes(THINK_MARK)) return null;
  const parts = text.split(THINK_MARK).map((p) => (hasWords(p) ? p.trim() : ''));
  const now = parts.filter((_, k) => k % 2 === 0).filter(Boolean).join(' ').replace(TOKEN_RE, '');
  const owed = parts.filter((_, k) => k % 2 === 1).filter(Boolean).join(' ');
  return now && owed ? [now, owed] : null;
}

/** The text as it is shown or logged — the mark removed. */
export function stripThink(text: string): string {
  return text.replace(TOKEN_RE, '').split(THINK_MARK).map((s) => s.trim()).filter(hasWords).join(' ');
}
