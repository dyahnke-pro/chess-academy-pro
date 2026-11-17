// outOfReach — PUT THE PIECE WHERE NOTHING CAN CHASE IT (Danya speedruns
// kYbh2NTFsS8, 21…Ba4: "put the bishop where nothing can attack it; on f5 it
// could be chased by g4"; S-ZY3NtFO20, 21.Qa6: "no black piece can attack it";
// Ytkf3qZTj74, 12…Qe5: the queen brought back from a1).
//
// The board fact: the moved piece (knight, bishop, rook or queen) lands on a
// square where no pawn of the other side can ever stand to attack it, and no
// move of theirs brings a smaller piece onto it. It is said only against a
// square that WAS chaseable: the square it left (a smaller piece hit it there,
// or one move would have), or the engine's other square for the same piece.
// Equal or bigger pieces may still reach it — the line says "smaller". Both
// seats. PURE: chess.js.
import { openSentence } from '../utils/openSentence';
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { MATERIAL_VALUE } from './pieceValues';
import { sideToMoveAs } from './threatOut';
import { PIECE_NAMES } from '../types/tacticTypes';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

const NAME = PIECE_NAMES as Readonly<Record<PieceSymbol, string>>;
const worth = (t: PieceSymbol): number => (t === 'k' ? 100 : MATERIAL_VALUE[t] ?? 0);

/** What chases a piece of worth `v` on `sq`: a smaller piece already on it, or
 *  the move that brings one. */
type Chase = { now: { square: Square; piece: PieceSymbol } } | { move: string };

export interface OutOfReach {
  piece: PieceSymbol;
  square: Square;
  /** The square it was weighed against, and what chases it there. */
  contrast: { square: Square; chase: Chase; left: boolean };
}

/** A pawn of `them` stands where it could still attack `sq`: on a file beside
 *  it, behind it (a pawn only moves forward). */
function pawnCanReach(c: Chess, sq: Square, them: Color): boolean {
  const f = sq.charCodeAt(0);
  const r = Number(sq[1]);
  for (const df of [-1, 1]) {
    const ff = f + df;
    if (ff < 97 || ff > 104) continue;
    const file = String.fromCharCode(ff);
    for (let rr = 1; rr <= 8; rr += 1) {
      const p = c.get(`${file}${rr}` as Square);
      if (!p || p.type !== 'p' || p.color !== them) continue;
      if (them === 'w' ? rr < r : rr > r) return true;
    }
  }
  return false;
}

/** What chases a piece of worth `v` on `sq` (`them` to move on `fen`), or null. */
function chaseOf(fen: string, sq: Square, them: Color, v: number): Chase | null {
  const asThem = sideToMoveAs(fen, them);
  if (!asThem) return null;
  let c: Chess;
  try { c = new Chess(asThem); } catch { return null; }
  for (const a of c.attackers(sq, them)) {
    const t = c.get(a)?.type;
    if (t && worth(t) < v) return { now: { square: a, piece: t } };
  }
  for (const m of c.moves({ verbose: true })) {
    if (m.to === sq) continue;
    c.move(m);
    const hit = c.attackers(sq, them).some((a) => worth(c.get(a)?.type ?? 'k') < v);
    c.undo();
    if (hit) return { move: m.san };
  }
  return null;
}

/** The move `san` from `fenBefore` puts its piece out of reach, or null.
 *  `altUcis`: the engine's top moves before it (UCI), where the surface has
 *  them — another square for the same piece is the contrast. */
export function outOfReach(fenBefore: string, san: string, altUcis: readonly string[]): OutOfReach | null {
  let after: Chess;
  let mv;
  try {
    after = new Chess(fenBefore);
    mv = after.move(san);
  } catch { return null; }
  if (!['n', 'b', 'r', 'q'].includes(mv.piece) || mv.captured || after.inCheck() || after.isGameOver()) return null;
  if (new Chess(fenBefore).inCheck()) return null;
  const me = mv.color;
  const them: Color = me === 'w' ? 'b' : 'w';
  const v = worth(mv.piece);
  if (pawnCanReach(after, mv.to, them)) return null;
  if (chaseOf(after.fen(), mv.to, them, v)) return null;
  // The square it left.
  const left = chaseOf(fenBefore, mv.from, them, v);
  if (left) return { piece: mv.piece, square: mv.to, contrast: { square: mv.from, chase: left, left: true } };
  // The engine's other square for the same piece.
  for (const u of altUcis) {
    if (u.slice(0, 2) !== mv.from || u.slice(2, 4) === mv.to) continue;
    let alt;
    const probe = new Chess(fenBefore);
    try { alt = probe.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { continue; }
    if (alt.captured || probe.inCheck()) continue;
    const chase = chaseOf(probe.fen(), alt.to, them, v);
    if (chase) return { piece: mv.piece, square: mv.to, contrast: { square: alt.to, chase, left: false } };
  }
  return null;
}

/** Who cannot reach a piece of this kind. */
const SMALLER: Record<string, string> = {
  n: 'no pawn of theirs can kick it',
  b: 'no pawn of theirs can kick it',
  r: 'no pawn of theirs can kick it, and no knight or bishop can hit it next move',
  q: 'no pawn of theirs can kick it, and no smaller piece can hit it next move',
};

/** Said from the mover's seat (`own`: your / their), one idea a sentence,
 *  phrasings rotated on the board. */
export function outOfReachLine(o: OutOfReach, own: 'your' | 'their', fen: string): string {
  const p = NAME[o.piece];
  const reach = (own === 'your' ? SMALLER[o.piece] : SMALLER[o.piece].replace('of theirs', 'of yours'));
  const key = stemKeyOf(`${fen}|outOfReach|${o.square}`);
  const lead = rotateStem([
    `${cap(own)} ${p} on ${o.square} is out of reach: ${reach}.`,
    `On ${o.square} ${own} ${p} is safe for now: ${reach}.`,
    `${cap(own)} ${p} settles on ${o.square}, where ${reach}.`,
  ], key);
  const c = o.contrast;
  const chased = 'now' in c.chase
    ? (c.left ? `On ${c.square} the ${NAME[c.chase.now.piece]} on ${c.chase.now.square} was already hitting it.` : `On ${c.square} the ${NAME[c.chase.now.piece]} on ${c.chase.now.square} would hit it.`)
    : `On ${c.square}, ${c.chase.move} would have chased it.`;
  return `${lead} ${chased}`;
}

function cap(s: string): string {
  return openSentence(s);
}
