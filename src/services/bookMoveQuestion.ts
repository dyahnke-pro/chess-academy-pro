// bookMoveQuestion — a chapter lesson's own question: "what does the book play
// here?" (David 2026-10-05: "teach lessons based off of chapters"). The book's
// diagram is the board, the book's line (chess.js-validated at ingest) is the
// answer. The student finds the first move; a miss climbs a computed hint
// ladder (the piece, then its square, then the move). Matched by COORDINATES,
// never the SAN string (G4.5.2). Nothing here is invented — G3.
import { Chess, type Square } from 'chess.js';
import { PIECE_NAMES } from '../types/tacticTypes';

export interface BookMoveAnswer {
  from: Square;
  to: Square;
  san: string;
  piece: string;
}

/** The book's first move on its diagram, or null when the line is empty or
 *  does not play from that board (then there is no question to ask). */
export function bookMoveAnswer(fen: string, moves: readonly string[]): BookMoveAnswer | null {
  if (moves.length === 0) return null;
  try {
    const c = new Chess(fen);
    const m = c.move(moves[0]);
    return m ? { from: m.from, to: m.to, san: m.san, piece: PIECE_NAMES[m.piece] ?? 'piece' } : null;
  } catch { return null; }
}

export type BookMoveTry = 'right' | 'wrong' | 'illegal';

/** Grade one try by coordinates. A promotion counts by its squares (the book
 *  line carries the piece). */
export function gradeBookMove(fen: string, answer: BookMoveAnswer, from: string, to: string): BookMoveTry {
  if (from === answer.from && to === answer.to) return 'right';
  try {
    const c = new Chess(fen);
    return c.moves({ verbose: true }).some((m) => m.from === from && m.to === to) ? 'wrong' : 'illegal';
  } catch { return 'illegal'; }
}

/** The hint after `misses` wrong tries: the piece, then the square it leaves
 *  from, then the move itself. Computed from the answer; you/they. */
export function bookMoveHint(answer: BookMoveAnswer, misses: number): string {
  if (misses <= 1) return `Not the book's move. It is a ${answer.piece} move.`;
  if (misses === 2) return `Look at your ${answer.piece} on ${answer.from}.`;
  return `The book plays ${answer.san}.`;
}

/** What the coach says when the student finds it. */
export function bookMoveFound(answer: BookMoveAnswer, misses: number): string {
  return misses === 0 ? `${answer.san} — the book's move, first try.` : `${answer.san} — the book's move.`;
}
