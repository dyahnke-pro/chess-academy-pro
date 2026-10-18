// THE THINK PAUSE. A computer that asks the student a question puts THINK_MARK
// between the question and its answer. The voice speaks the question now; the
// ANSWER WAITS FOR THEIR MOVE (David 2026-10-18: "answer waits for my move" —
// this replaces the 2026-09-30 timed pause, which spoke the answer after
// 2.5 seconds whether they had played or not) and leads the next turn, so
// they work it out on the board first. Anywhere the text is shown or logged,
// the marks are stripped.
//
// THE MOVE MAY ANSWER IT (David 2026-10-18: "Or after the move if it was
// wrong"). Every question carries a CHECK — what a move that answers it looks
// like — so a student who answered it on the board hears a short credit
// instead of the full answer. A question with no single right move ("how do
// you find a plan?") carries `always`: its answer is said after any move.
// `thinkLine` is the only way to build a question and the check is required,
// so a new question cannot be written without deciding it.
//
// A leaf: no imports, so a fact computer can use it.

/** Private separator — never produced by chess prose. */
export const THINK_MARK = '‖';
/** Private separator around the encoded check. */
const CHECK_MARK = '⁒';

/** What a move that answers the question looks like (squares, never SAN —
 *  the same move renders two ways). */
export type ThinkCheck =
  /** No single right move: the answer is said after any move. */
  | { kind: 'always' }
  /** Right when the move is NOT one of these (from+to, e.g. "e4d5"). */
  | { kind: 'avoid'; uci: readonly string[] }
  /** Right when the student moved the piece on this square. */
  | { kind: 'from'; square: string }
  /** Right when the move captures on this square or the moved piece attacks it. */
  | { kind: 'hit'; square: string }
  /** Right when the move is `best` (from+to), or none of these pieces can be won any more. */
  | { kind: 'parry'; best: string; squares: readonly string[] };

const SQ = /^[a-h][1-8]$/;
const UCI = /^[a-h][1-8][a-h][1-8]$/;

function encode(c: ThinkCheck): string {
  switch (c.kind) {
    case 'always': return 'always';
    case 'avoid': return `avoid:${c.uci.map((u) => u.slice(0, 4)).join('.')}`;
    case 'from': return `from:${c.square}`;
    case 'hit': return `hit:${c.square}`;
    case 'parry': return `parry:${c.best.slice(0, 4)}:${c.squares.join('.')}`;
  }
}

function decode(s: string): ThinkCheck | null {
  const [kind, a = '', b = ''] = s.trim().split(':');
  const list = (x: string): string[] => x.split('.').filter(Boolean);
  switch (kind) {
    case 'always': return { kind };
    case 'avoid': return list(a).length > 0 && list(a).every((u) => UCI.test(u)) ? { kind, uci: list(a) } : null;
    case 'from': return SQ.test(a) ? { kind, square: a } : null;
    case 'hit': return SQ.test(a) ? { kind, square: a } : null;
    case 'parry': return UCI.test(a) && list(b).every((q) => SQ.test(q)) ? { kind, best: a, squares: list(b) } : null;
    default: return null;
  }
}

/** A question, its answer and its check — the one way to build one. */
export function thinkLine(question: string, answer: string, check: ThinkCheck): string {
  return `${question} ${THINK_MARK} ${answer} ${CHECK_MARK}${encode(check)}${CHECK_MARK}`;
}

const CHECK_RE = new RegExp(`\\s*${CHECK_MARK}([^${CHECK_MARK}]*)${CHECK_MARK}`, 'g');

function dropCheck(text: string): string {
  return text.replace(CHECK_RE, '');
}

/** "question ‖ answer" → [question, answer]; null when there is no mark. */
export function splitThink(text: string): [string, string] | null {
  const i = text.indexOf(THINK_MARK);
  if (i < 0) return null;
  const q = dropCheck(text.slice(0, i)).trim();
  const a = dropCheck(text.slice(i + THINK_MARK.length)).trim();
  return q && a ? [q, a] : null;
}

/** The question's check; `always` when the text carries none. */
export function thinkCheckOf(text: string): ThinkCheck {
  const m = new RegExp(`${CHECK_MARK}([^${CHECK_MARK}]*)${CHECK_MARK}`).exec(text);
  return (m && decode(m[1])) || { kind: 'always' };
}

/** The text as it is shown or logged — the marks removed. */
export function stripThink(text: string): string {
  return dropCheck(text).split(THINK_MARK).map((s) => s.trim()).filter(Boolean).join(' ');
}
