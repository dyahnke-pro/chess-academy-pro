// pawnLines — WHAT A PAWN MOVE DID TO THE LINES THROUGH ITS TWO SQUARES (S4
// pawns, Danya's speedruns: "every pawn move opens a diagonal or frees a
// square — make it a habit to check which lines changed"). A pawn never moves
// back, so the line it opens stays open and the line it closes stays closed.
// One read, both seats, chess.js only (the castling square a pawn opens is
// `castlingTakenAway`'s, which reads any move):
//
//  - THE GUARD CUT (`pawnCutsGuard`, his "…c4 cuts the line between the b3
//    queen and the f7 bishop", "…c3 interferes: it blocks the queen's diagonal
//    to a5"): the square the pawn landed on stood between an enemy bishop,
//    rook or queen and a piece of its own that it guarded. After the move that
//    piece is hanging — attacked and lost by the count (`legalSeeGainFor`) —
//    and it was not before.
//
// Silent on everything else: a line opened onto an empty square of no
// consequence, or a guard cut from a piece nobody attacks, is no lesson.
//
// PURE: chess.js + the SEE reader.
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { legalSeeGainFor } from './positionReadingService';
import { squaresProof, type Proof } from './proof';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

export interface PawnLineRead {
  key: string;
  text: string;
  squares: string[];
  proof: Proof | null;
  /** The seat of the side whose pawn moved. */
  mine: boolean;
  /** Material the cut leaves hanging, in pawns (the guard cut only). */
  gain: number | null;
}

type Vec = readonly [number, number];
const DIAG: readonly Vec[] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const ORTHO: readonly Vec[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

const fileOf = (sq: string): number => sq.charCodeAt(0) - 97;
const rankOf = (sq: string): number => Number(sq[1]) - 1;
const sqAt = (f: number, r: number): Square | null => (f < 0 || f > 7 || r < 0 || r > 7 ? null : (`${String.fromCharCode(97 + f)}${r + 1}` as Square));

function slides(type: PieceSymbol): readonly Vec[] {
  return type === 'b' ? DIAG : type === 'r' ? ORTHO : type === 'q' ? [...DIAG, ...ORTHO] : [];
}

/** The unit step from `a` to `b` when they share a line a `type` slides on. */
function stepTo(a: string, b: string, type: PieceSymbol): Vec | null {
  const df = fileOf(b) - fileOf(a);
  const dr = rankOf(b) - rankOf(a);
  if (df === 0 && dr === 0) return null;
  const v: Vec = [Math.sign(df), Math.sign(dr)];
  const straight = df === 0 || dr === 0;
  const diagonal = Math.abs(df) === Math.abs(dr);
  if (!straight && !diagonal) return null;
  return slides(type).some(([x, y]) => x === v[0] && y === v[1]) ? v : null;
}

/** The squares strictly between `a` and `b` along `v`. */
function between(a: string, b: string, v: Vec): Square[] {
  const out: Square[] = [];
  for (let f = fileOf(a) + v[0], r = rankOf(a) + v[1]; ; f += v[0], r += v[1]) {
    const s = sqAt(f, r);
    if (!s || s === b) break;
    out.push(s);
  }
  return out;
}

function sliders(c: Chess, color: Color): Array<{ square: Square; type: PieceSymbol }> {
  const out: Array<{ square: Square; type: PieceSymbol }> = [];
  for (const row of c.board()) for (const p of row) if (p && p.color === color && slides(p.type).length) out.push({ square: p.square, type: p.type });
  return out;
}

function played(fenBefore: string, san: string): { before: Chess; after: Chess; from: Square; to: Square; color: Color; captured: boolean } | null {
  let before: Chess;
  let after: Chess;
  try { before = new Chess(fenBefore); after = new Chess(fenBefore); } catch { return null; }
  let m;
  try { m = after.move(san); } catch { return null; }
  if (m.piece !== 'p') return null;
  return { before, after, from: m.from, to: m.to, color: m.color, captured: !!m.captured };
}

/** THE GUARD THE PAWN CUT: the square the pawn landed on stood between an
 *  enemy slider and a piece of its own it guarded, and that piece is hanging
 *  now and was not before. */
export function pawnCutsGuard(fenBefore: string, san: string, mine: boolean): PawnLineRead | null {
  const p = played(fenBefore, san);
  if (!p || p.captured) return null;
  const me = p.color;
  const them: Color = me === 'w' ? 'b' : 'w';
  const afterFen = p.after.fen();
  for (const s of sliders(p.before, them)) {
    const v = stepTo(s.square, p.to, s.type);
    if (!v) continue;
    if (!between(s.square, p.to, v).every((q) => !p.before.get(q))) continue;
    // The first piece past the square, on the same line.
    let guarded: { square: Square; type: PieceSymbol } | null = null;
    for (let f = fileOf(p.to) + v[0], r = rankOf(p.to) + v[1]; ; f += v[0], r += v[1]) {
      const q = sqAt(f, r);
      if (!q) break;
      const x = p.before.get(q);
      if (!x) continue;
      if (x.color === them && x.type !== 'k' && x.type !== 'p') guarded = { square: q, type: x.type };
      break;
    }
    if (!guarded) continue;
    // A piece the pawn itself attacks is hit by the pawn, not cut off.
    if (p.after.attackers(guarded.square, me).includes(p.to)) continue;
    const gain = legalSeeGainFor(afterFen, guarded.square, me);
    if (gain < 1 || gain <= legalSeeGainFor(fenBefore, guarded.square, me)) continue;
    const own = mine ? 'your' : 'their';
    const other = mine ? 'their' : 'your';
    const victim = `${other} ${NAME[guarded.type]} on ${guarded.square}`;
    const guard = `${other} ${NAME[s.type]} on ${s.square}`;
    const pawn = `${own} pawn on ${p.to}`;
    const text = rotateStem([
      `${cap(victim)} just lost its guard: ${pawn} cuts it off from ${guard}. The ${NAME[guarded.type]} is hanging now.`,
      `${cap(pawn)} stands between ${guard} and ${victim}. That ${NAME[guarded.type]} has no guard left, and it is hanging.`,
      `With ${pawn}, ${guard} no longer guards ${victim}. The ${NAME[guarded.type]} is hanging.`,
    ], stemKeyOf(`${fenBefore}|${san}`));
    const squaresSaid = [p.to, s.square, guarded.square];
    return { key: `guard-cut:${p.to}:${guarded.square}`, text, squares: squaresSaid, proof: squaresProof(text, squaresSaid), mine, gain };
  }
  return null;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
