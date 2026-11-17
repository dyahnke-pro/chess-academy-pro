// THE CAGE — a move that takes the squares their knight needs (Danya, S-ZY3
// 32.e4: "e4 takes d5; with c4 and d7 also covered, the knight can only
// shuttle between b6 and a8"; J4WzT: "b4 takes c5 away and leaves the knight
// only b8"). Restriction is a plan of its own: a knight with one square left
// does no work, and the side that caged it plays on with an extra piece.
//
// Computed: after the move, a knight of the other side that is not under
// attack itself has at most one square it can go to without being lost (a
// square counts as safe when the legal exchange there wins the mover nothing),
// the move took at least one of its squares away, and the moved piece itself
// covers every square taken. Pure (chess.js and the legal exchange read).
// Both seats.
import { Chess, type Color, type Square } from 'chess.js';
import { legalSeeGainFor, asIfToMove } from './positionReadingService';
import { andList } from '../utils/andList';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

const OPENING_SQUARES = new Set(['b1', 'g1', 'b8', 'g8', 'c3', 'f3', 'c6', 'f6']);

export interface PieceCage {
  /** The caged knight's square. */
  knight: string;
  /** The squares the move took from it. */
  taken: string[];
  /** The squares it still has (zero or one). */
  left: string[];
  /** The clause, after "Your move" / "Their …e4" or a move intro: "takes d5 from …". */
  clause: string;
  squares: string[];
}

/** The squares the knight on `sq` (side `side`) can go to without being lost
 *  on board `fen`: its own pieces' squares and squares the other side wins on
 *  are not counted. Null when the board cannot be read with `side` to move. */
function safeSquares(fen: string, sq: Square, side: Color): string[] | null {
  const asIf = asIfToMove(fen, side);
  if (!asIf) return null;
  let c: Chess;
  try { c = new Chess(asIf); } catch { return null; }
  const other: Color = side === 'w' ? 'b' : 'w';
  const out: string[] = [];
  for (const m of c.moves({ square: sq, verbose: true })) {
    const after = new Chess(asIf);
    try { after.move(m.san); } catch { continue; }
    if (legalSeeGainFor(after.fen(), m.to, other) <= 0) out.push(m.to);
  }
  return out;
}

/** Every square a knight on `sq` could step to on an empty board. */
function knightReach(sq: string): string[] {
  const f = sq.charCodeAt(0) - 97, r = Number(sq[1]);
  const out: string[] = [];
  for (const [df, dr] of [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]) {
    const nf = f + df, nr = r + dr;
    if (nf >= 0 && nf < 8 && nr >= 1 && nr <= 8) out.push(`${String.fromCharCode(97 + nf)}${nr}`);
  }
  return out;
}

export function pieceCage(fenBefore: string, san: string, mine: boolean): PieceCage | null {
  let before: Chess;
  let after: Chess;
  let to: Square;
  let mover: Color;
  try {
    before = new Chess(fenBefore);
    mover = before.turn();
    after = new Chess(fenBefore);
    const mv = after.move(san);
    // A capture or a check is its own lesson; the cage is a quiet squeeze.
    if (mv.captured || after.inCheck()) return null;
    to = mv.to;
  } catch { return null; }
  const side: Color = mover === 'w' ? 'b' : 'w';
  const theirs = mine ? 'their' : 'your';
  for (const row of after.board()) for (const cell of row) {
    if (!cell || cell.color !== side || cell.type !== 'n') continue;
    const sq = cell.square;
    // A knight at home or on its first square (c3, f3, c6, f6) is short of
    // squares in every opening — the centre is contested, that is all (the
    // replay's 2…Nc6 "takes e5 from their knight on f3" was no cage).
    if (OPENING_SQUARES.has(sq)) continue;
    // A knight already lost where it stands is trapped, a different lesson.
    if (legalSeeGainFor(after.fen(), sq, mover) > 0) continue;
    const was = safeSquares(fenBefore, sq, side);
    const now = safeSquares(after.fen(), sq, side);
    if (!was || !now || now.length > 1 || was.length <= now.length) continue;
    const taken = was.filter((s) => !now.includes(s));
    // THE MOVE ITSELF TAKES THEM: every square lost is now covered by the
    // moved piece (a pawn's or piece's own reach), never by a line it opened.
    if (taken.length === 0 || !taken.every((s) => after.attackers(s as Square, mover).includes(to))) continue;
    // A knight that had nowhere to go anyway is no news: it lost a real choice.
    if (was.length < 2) continue;
    const key = stemKeyOf(after.fen());
    const left = now;
    const takes = `takes ${andList(taken)} from ${theirs} knight on ${sq}`;
    const clause = left.length === 0
      ? rotateStem([`${takes}, and it has no safe square left`, `${takes} — the knight has nowhere safe to go now`], key)
      : rotateStem([`${takes}, which has only ${left[0]} left`, `${takes} — ${left[0]} is the one square it has left`], key);
    // The knight's whole reach, for the board: where it stands and what it lost.
    const reach = knightReach(sq).filter((s) => taken.includes(s) || left.includes(s));
    return { knight: sq, taken, left, clause, squares: [...new Set([to, sq, ...reach])] };
  }
  return null;
}
