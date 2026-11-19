// queenNet — LIST THE QUEEN'S ESCAPES (Danya speedrun hv0P 12.Nd4: "to trap
// the queen, list its escapes: everything is covered except …Qe6, so Nd4
// covers e6"; 13.Qc1: "cover b2 first"; LJa5 9…Bg4: "…Bg4 on the boxed-in
// queen").
//
// The move takes a safe square away from the other side's queen, and leaves
// it one safe square or none:
//   · the queen stands in the mover's half (it went raiding), or
//   · the move attacks it and it has no safe square left.
// A square is SAFE when the queen can go there and not be won by the legal
// exchange (the one trapped-piece rule, `trappedPiece`). The claim is the
// count of squares — never "trapped": a block or a counter-move may still
// save it, which is the engine's question, not this one.
// PURE: chess.js and the legal static exchange.
import { openSentence } from '../utils/openSentence';
import { Chess, type Color, type Square } from 'chess.js';
import { legalSeeGainOn } from './positionReadingService';
import { MATERIAL_VALUE } from './pieceValues';
import { sideToMoveAs } from './threatOut';
import { PIECE_NAMES } from '../types/tacticTypes';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { seatPieceWords } from './pieceRef';

export interface QueenNet {
  /** Their queen. */
  queen: Square;
  queenColor: Color;
  /** The safe squares the move took away (covered by the moved piece). */
  taken: Square[];
  /** The safe squares left. */
  left: Square[];
  /** The move attacks the queen. */
  hits: boolean;
  /** The mover's piece and where it went. */
  piece: string;
  to: Square;
  key: string;
}

/** The squares the queen on `square` can go to without being won by the
 *  legal exchange, its owner handed the move; null when the read cannot stand
 *  (the owner is in check, or the board cannot be flipped). */
export function queenSafeSquares(fen: string, square: Square): Square[] | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const q = c.get(square);
  if (!q || q.type !== 'q') return null;
  const own = sideToMoveAs(fen, q.color);
  if (!own) return null;
  const probe = new Chess(own);
  if (probe.inCheck()) return null;
  const out: Square[] = [];
  for (const m of probe.moves({ verbose: true })) {
    if (m.from !== square) continue;
    const a = new Chess(own);
    a.move(m.san);
    if (legalSeeGainOn(a, m.to) - (m.captured ? MATERIAL_VALUE[m.captured] : 0) < 1) out.push(m.to);
  }
  return out;
}

/** In the mover's half: ranks 1–4 for White's side, 5–8 for Black's. */
function inHalfOf(square: Square, side: Color): boolean {
  const r = Number(square[1]);
  return side === 'w' ? r <= 4 : r >= 5;
}

/** The net the move `san` on `fenBefore` draws round the other side's queen,
 *  or null. */
export function queenNet(fenBefore: string, san: string): QueenNet | null {
  let c: Chess;
  let mv;
  try { c = new Chess(fenBefore); mv = c.move(san); } catch { return null; }
  if (mv.piece === 'k' || c.inCheck()) return null;
  const them: Color = mv.color === 'w' ? 'b' : 'w';
  const fenAfter = c.fen();
  for (const row of c.board()) for (const cell of row) {
    if (!cell || cell.color !== them || cell.type !== 'q') continue;
    // The queen the move took is no net; one that just captured is the
    // trade's, read by the capture.
    if (mv.captured === 'q') continue;
    const beforeSafe = queenSafeSquares(fenBefore, cell.square);
    const afterSafe = queenSafeSquares(fenAfter, cell.square);
    if (!beforeSafe || !afterSafe || afterSafe.length > 1) continue;
    // The squares the moved piece now covers, which were safe before.
    const covered = new Set<Square>();
    for (const s of beforeSafe) if (!afterSafe.includes(s) && c.attackers(s, mv.color).includes(mv.to)) covered.add(s);
    const taken = [...covered];
    if (taken.length === 0) continue;
    const hits = c.attackers(cell.square, mv.color).includes(mv.to);
    const raid = inHalfOf(cell.square, mv.color);
    if (!(raid || (hits && afterSafe.length === 0))) continue;
    return { queen: cell.square, queenColor: them, taken, left: afterSafe, hits, piece: mv.piece, to: mv.to, key: `queen-net:${cell.square}:${afterSafe.join('')}` };
  }
  return null;
}

/** Said from the student's seat (`moverIsStudent`): the mover's piece takes
 *  the squares, and what is left. Learn names no student move: the piece and
 *  its square carry it. Rotated on the board after. */
export function queenNetLine(n: QueenNet, moverIsStudent: boolean, fenAfter: string): string {
  const own = moverIsStudent ? 'your' : 'their';
  const queenOwn = moverIsStudent ? 'their' : 'your';
  const piece = PIECE_NAMES[n.piece];
  const taken = n.taken.length === 1 ? n.taken[0] : `${n.taken.slice(0, -1).join(', ')} and ${n.taken[n.taken.length - 1]}`;
  const left = n.left.length === 0
    ? 'It has no safe square left.'
    : `Its only safe square left is ${n.left[0]}.`;
  // Each piece by what it is (`pieceRef`): the squares that matter are the
  // ones taken and the one left; the pieces' own squares are lit, not read.
  const mover = seatPieceWords(fenAfter, n.to, own, `${own} ${piece} on ${n.to}`);
  const queen = seatPieceWords(fenAfter, n.queen, queenOwn, `${queenOwn} queen on ${n.queen}`);
  const lead = n.hits
    ? `${cap(mover)} hits ${queen} and covers ${taken}.`
    : `${cap(queen)} is running short of squares: ${mover} covers ${taken}.`;
  const habit = moverIsStudent
    ? ['List the queen\'s escapes.', 'Count the queen\'s squares.']
    : ['Count your queen\'s squares before it goes raiding.', 'List your queen\'s escapes.'];
  return rotateStem([
    `${lead} ${left}`,
    `${habit[0]} ${lead} ${left}`,
    `${lead} ${left} ${habit[1]}`,
  ], stemKeyOf(fenAfter));
}

function cap(s: string): string {
  return openSentence(s);
}
