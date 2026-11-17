// fortress — A PIECE DOWN, AND A DRAW THAT CANNOT BE BROKEN (Danya: "A
// fortress plus an active king can draw even down material when there's no
// way in"; "a fortress is a legitimate form of successful passive defence";
// "Queen against two minor pieces … each pawn is defended by a piece").
//
// THE BOARD after the move, either seat: an ending (`isEndgameByMaterial`),
// one side behind by a piece or more (`sideMaterial`, `CONVERSION_EDGE`), and
// the engine's read of the board a draw (the caller's best line after the
// move, White-POV; no read, no claim). The draw has to have a reason the
// board shows, the first that is true:
//   no-pawns      — the side ahead has no pawns left and its extra material is
//                   one minor piece: nothing to make a queen with, and one
//                   minor more does not force mate (rook and knight against
//                   rook);
//   bishop-colour — the side ahead's only pieces are bishops of one colour,
//                   and every pawn of the defender's stands on the other
//                   colour, where those bishops can never attack it.
// Said on the move that makes it: the reason did not hold on the board before.
// The wrong-coloured bishop with a rook's pawn against a bare king is the
// minors' matchup's to say (`minorMatchup`, `detectRookPawnCorner`).
//
// PURE: chess.js, the material readers and the engine lines the surface
// hands in.
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { isEndgameByMaterial } from './gamePhaseService';
import { sideMaterial, MATERIAL_VALUE } from './pieceValues';
import { CONVERSION_EDGE } from './conversionMethod';
import type { ReplyLine } from './bothSaved';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { withArticle } from '../utils/andList';

/** The engine's read of a draw: within this of level, White-POV. */
const FORTRESS_DRAW_CP = 50;

export type FortressReason =
  | { kind: 'no-pawns'; extra: 'n' | 'b' }
  | { kind: 'bishop-colour'; shade: 'light' | 'dark'; pawns: Square[] };

export interface Fortress {
  /** The side that holds (behind on material). */
  defender: Color;
  reason: FortressReason;
  key: string;
}

const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

function other(c: Color): Color { return c === 'w' ? 'b' : 'w'; }

/** The pieces (not pawns, not the king) of `color`, by type. */
function pieces(c: Chess, color: Color): PieceSymbol[] {
  const out: PieceSymbol[] = [];
  for (const x of c.board().flat()) if (x && x.color === color && x.type !== 'k' && x.type !== 'p') out.push(x.type);
  return out.sort();
}

/** What the side ahead has more of, piece for piece: its pieces with the
 *  defender's like pieces cancelled. */
function extraPieces(c: Chess, ahead: Color): PieceSymbol[] {
  const mine = pieces(c, ahead);
  for (const p of pieces(c, other(ahead))) {
    const i = mine.indexOf(p);
    if (i >= 0) mine.splice(i, 1);
  }
  return mine;
}

/** The board's reason the defender holds, or null. */
function fortressReason(fen: string, defender: Color): FortressReason | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const ahead = other(defender);
  const extra = extraPieces(c, ahead);
  const lone = extra.length === 1 && (extra[0] === 'n' || extra[0] === 'b')
    && pieces(c, ahead).length === pieces(c, defender).length + 1 ? extra[0] : null;
  if (lone && c.findPiece({ type: 'p', color: ahead }).length === 0) return { kind: 'no-pawns', extra: lone };
  const aheadPieces = pieces(c, ahead);
  if (aheadPieces.length > 0 && aheadPieces.every((p) => p === 'b')) {
    const shades = new Set(c.findPiece({ type: 'b', color: ahead }).map((b) => c.squareColor(b)));
    const theirs = c.findPiece({ type: 'p', color: defender });
    if (shades.size === 1 && theirs.length > 0 && theirs.every((sq) => !shades.has(c.squareColor(sq)))) {
      return { kind: 'bishop-colour', shade: shades.has('light') ? 'dark' : 'light', pawns: theirs };
    }
  }
  return null;
}

/**
 * The fortress the move `san` on `fenBefore` (either seat) makes, or null.
 * `replies`: the engine's lines from the board after the move, best first
 * (White-POV); [] where the surface has none.
 */
export function fortress(fenBefore: string, san: string, replies: readonly ReplyLine[]): Fortress | null {
  const best = replies[0] as ReplyLine | undefined;
  if (!best || best.mate != null || best.cp == null || Math.abs(best.cp) > FORTRESS_DRAW_CP) return null;
  let c: Chess;
  try { c = new Chess(fenBefore); c.move(san.replace(/[!?]+$/, '')); } catch { return null; }
  if (c.isGameOver()) return null;
  const fenAfter = c.fen();
  if (!isEndgameByMaterial(fenAfter)) return null;
  const w = sideMaterial(fenAfter, 'w');
  const b = sideMaterial(fenAfter, 'b');
  if (Math.abs(w - b) < CONVERSION_EDGE) return null;
  const defender: Color = w < b ? 'w' : 'b';
  const reason = fortressReason(fenAfter, defender);
  if (!reason) return null;
  // Made by this move: the board before held no such reason.
  if (fortressReason(fenBefore, defender)?.kind === reason.kind) return null;
  return { defender, reason, key: `fortress:${reason.kind}:${defender}` };
}

/** The squares the line names or lights: the defender's pawns on the
 *  colour the bishop never reaches. */
export function fortressSquares(f: Fortress): string[] {
  return f.reason.kind === 'bishop-colour' ? f.reason.pawns : [];
}

/** Said from the student's seat: `mine` when the student is the defender.
 *  Rotated on the board after the move. */
export function fortressLine(f: Fortress, mine: boolean, fenAfter: string): string {
  const k = stemKeyOf(`${fenAfter}|fortress`);
  const piece = Math.abs(sideMaterial(fenAfter, 'w') - sideMaterial(fenAfter, 'b')) === MATERIAL_VALUE.n;
  const down = piece ? 'a piece down' : 'down material';
  const Down = piece ? 'A piece down' : 'Down material';
  const r = f.reason;
  if (r.kind === 'no-pawns') {
    const lead = mine
      ? rotateStem([`You are ${down}, but it is a draw:`, `${Down}, you still hold:`], k)
      : rotateStem([`They are ${down}, but it is a draw:`, `${Down}, they still hold:`], k);
    return `${lead} ${mine ? 'they have' : 'you have'} no pawns left to make a queen, and one extra ${NAME[r.extra]} is not enough to force mate.`;
  }
  const lead = mine
    ? rotateStem([`You are ${down}, but this is a fortress:`, `${Down}, you hold, because this is a fortress:`], k)
    : rotateStem([`They are ${down} and have built a fortress:`, `${Down}, they hold, because this is a fortress:`], k);
  const own = mine ? 'your' : 'their';
  const bishop = `${mine ? 'their' : 'your'} ${r.shade === 'light' ? 'dark' : 'light'}-squared bishop`;
  // A sentence names at most two squares: more pawns are said by colour.
  const pawns = r.pawns.length === 1
    ? `${own} pawn on ${r.pawns[0]} stands on ${withArticle(`${r.shade} square`)}, where ${bishop} can never attack it.`
    : r.pawns.length === 2
      ? `${own} pawns on ${r.pawns[0]} and ${r.pawns[1]} stand on ${r.shade} squares, where ${bishop} can never attack them.`
      : `every pawn of ${mine ? 'yours' : 'theirs'} stands on ${withArticle(`${r.shade} square`)}, where ${bishop} can never attack it.`;
  return `${lead} ${pawns}`;
}
