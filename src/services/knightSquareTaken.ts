// A PAWN ON THE KNIGHT'S SQUARE (Danya, NnQmN 2…c6: "…c6 takes away the b8
// knight's natural square"). The knights' best first squares are c3/f3 and
// c6/f6; a c- or f-pawn pushed there while its knight is still at home sends
// the knight out by a worse road, a tempo the side pays for in development.
//
// Computed: the move is a c- or f-pawn's one-step push onto its knight's
// natural square (c3, f3, c6, f6) while that knight still stands on b1/g1,
// b8/g8, and the move cost its mover at least an inaccuracy against the best
// move — so a system move that plays …c6 on purpose (the Caro-Kann, the
// Slav) is never called wrong for it. The roads the knight has left are read
// off the board. Pure (chess.js). Both seats.
import { Chess, type Square } from 'chess.js';
import { INACCURACY_CP } from './engineConstants';
import { orList } from '../utils/andList';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

/** The pawn's square → the knight's home square. */
const HOME: Record<string, string> = { c3: 'b1', f3: 'g1', c6: 'b8', f6: 'g8' };

export interface KnightSquareTaken {
  pawnSquare: string;
  knight: string;
  /** The squares the knight can still come out to. */
  roads: string[];
  clause: string;
  squares: string[];
}

/** `costCp`: what the move cost its mover against the best move (>= 0), or
 *  null when the surface does not know — then nothing is said. */
export function knightSquareTaken(fenBefore: string, san: string, mine: boolean, costCp: number | null): KnightSquareTaken | null {
  if (costCp === null || costCp < INACCURACY_CP) return null;
  let after: Chess;
  let mv;
  try { after = new Chess(fenBefore); mv = after.move(san); } catch { return null; }
  if (mv.piece !== 'p' || mv.captured) return null;
  const home = HOME[mv.to];
  if (!home || mv.from[0] !== mv.to[0] || Math.abs(Number(mv.from[1]) - Number(mv.to[1])) !== 1) return null;
  const knight = after.get(home as Square);
  if (!knight || knight.type !== 'n' || knight.color !== mv.color) return null;
  // The roads left: the knight's squares that stand empty now.
  const roads: string[] = [];
  const f = home.charCodeAt(0) - 97, r = Number(home[1]);
  for (const [df, dr] of [[1, 2], [-1, 2], [2, 1], [-2, 1], [1, -2], [-1, -2], [2, -1], [-2, -1]]) {
    const nf = f + df, nr = r + dr;
    if (nf < 0 || nf > 7 || nr < 1 || nr > 8) continue;
    const sq = `${String.fromCharCode(97 + nf)}${nr}`;
    if (sq !== mv.to && !after.get(sq as Square)) roads.push(sq);
  }
  const own = mine ? 'your' : 'their';
  const key = stemKeyOf(after.fen());
  const out = roads.length === 0 ? 'and it has no square to come out to now' : `so it has to come out by ${orList(roads)}`;
  const clause = rotateStem([
    `takes ${mv.to} from ${own} knight on ${home}, its natural square, ${out}`,
    `blocks ${mv.to}, the natural square of ${own} knight on ${home}, ${out}`,
  ], key);
  return { pawnSquare: mv.to, knight: home, roads, clause, squares: [home, ...roads] };
}
