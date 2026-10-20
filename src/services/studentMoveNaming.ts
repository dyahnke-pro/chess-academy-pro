// WHICH OF THE STUDENT'S MOVES A SENTENCE NAMES (OS-10, David's record
// 2026-10-19: "Strong players play Nf3 here" said BEFORE his 2.Nf3, "your
// bishop on f1 usually goes to c4 (Bc4)", "your knight has a fork waiting on
// c7 — via b5"). LEARN NAMES NO MOVE UNASKED: every Learn fact answers this,
// REQUIRED, so a new producer cannot compile until it says what it names —
// and the door holds a fact while a move it names is the student's to play.
// A LEAF: chess.js only.
import { Chess } from 'chess.js';

export interface NamedMove { from: string; to: string }

/** 'none' — the sentence names no move of the student's UNASKED (a verdict on
 *  a move already played, their threat, the book move after the student left
 *  it, or an answer the student asked for — Why?, Show me, a question).
 *  Otherwise: the student's moves it names, and `fen`, the board the student
 *  moves on NEXT — never the board the fact is graded on, which can be a past
 *  one (the book move is graded where the student left it). */
export type NamesStudentMove = 'none' | { student: 'w' | 'b'; fen: string; moves: readonly NamedMove[] };

export const NAMES_NO_MOVE: NamesStudentMove = 'none';

export function namesMoves(student: 'w' | 'b', fen: string, ...moves: ReadonlyArray<NamedMove | null | undefined>): NamesStudentMove {
  const real = moves.filter((m): m is NamedMove => !!m);
  return real.length ? { student, fen, moves: real } : 'none';
}

/** The move a SAN names on `fen` (for the side to move there), as coordinates. */
export function namedSan(fen: string, san: string): NamedMove | null {
  try { const m = new Chess(fen).move(san.replace(/^…/, '')); return m ? { from: m.from, to: m.to } : null; } catch { return null; }
}

/** The student's moves inside a line of SANs played from `lineFen` — every ply
 *  of `student`'s after the first `skip` plies (a line that opens with the move
 *  just played skips it: that move is no longer theirs to find). `nowFen` is
 *  the board the student moves on next. */
export function studentMovesInLine(lineFen: string, sans: readonly string[], student: 'w' | 'b', nowFen: string, skip = 0): NamesStudentMove {
  const out: NamedMove[] = [];
  try {
    const c = new Chess(lineFen);
    sans.forEach((s, i) => {
      const mover = c.turn();
      const m = c.move(s.replace(/^…/, ''));
      if (i >= skip && mover === student) out.push({ from: m.from, to: m.to });
    });
  } catch { /* the plies replayed so far still count */ }
  return namesMoves(student, nowFen, ...out);
}

/** Is a move this sentence names legal for the student on the board they move
 *  on next — whoever is to move there? Legal-for-the-side, so a move one reply
 *  away is held too. */
export function namesPlayableStudentMove(n: NamesStudentMove): boolean {
  if (n === 'none') return false;
  const parts = n.fen.split(' ');
  if (parts.length < 4) return false;
  parts[1] = n.student;
  parts[3] = '-';
  let legal: Array<{ from: string; to: string }>;
  try { legal = new Chess(parts.join(' ')).moves({ verbose: true }); } catch { return false; }
  return n.moves.some((m) => legal.some((l) => l.from === m.from && l.to === m.to));
}

/** The board after `sans` from `fen` (a reply may carry a leading "…"), or
 *  `fen` itself when a move does not play — the board the student moves on
 *  next, for a fact said after their move and the reply. */
export function boardAfterSans(fen: string, sans: ReadonlyArray<string | null | undefined>): string {
  try {
    const c = new Chess(fen);
    for (const s of sans) if (s) c.move(s.replace(/^…/, ''));
    return c.fen();
  } catch { return fen; }
}

/** The student's moves a producer's own arrows already point at: every 'play'
 *  arrow (a move offered to play), and every ply of a drawn line made by the
 *  student (its board has the student to move). Read off the arrows the
 *  producer computed, never off the prose. */
export function namesFromArrows(
  arrows: ReadonlyArray<{ from: string; to: string; role?: string; fen?: string }> | null | undefined,
  student: 'w' | 'b',
  nowFen: string,
): NamesStudentMove {
  const out: NamedMove[] = [];
  for (const a of arrows ?? []) {
    if (a.role === 'play') { out.push({ from: a.from, to: a.to }); continue; }
    if (a.role === 'line' && a.fen && a.fen.split(' ')[1] === student) out.push({ from: a.from, to: a.to });
  }
  return namesMoves(student, nowFen, ...out);
}
