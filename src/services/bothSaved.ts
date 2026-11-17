// bothSaved — TWO PIECES HANGING, ONE MOVE THAT SAVES BOTH (Danya speedrun
// FozbG 27.Ne7: "Rook and knight both hang: find a knight move that also
// defends the rook — Ne7"; and "Rc2 saves the rook but drops d5; Nb6 guards c8
// but …Qxb6").
//
// The board before a move: two of the mover's pieces (not pawns) can be won by
// a legal capture. The move played is one of them stepping to a square where it
// guards the other, and after it neither is lost: each stands safe by the legal
// exchange, or — the one the engine has to vouch for — the engine's best reply
// does not take it and every line of theirs that does take it scores worse for
// them. Grounded twice: the hanging pieces by legal SEE, the save by the board
// and the engine's own reads. The sibling of `desperado` (two hanging, sell the
// one you cannot save).
// PURE: chess.js, the position reader and the engine reads the surface hands in.
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { findHangingBySee, legalSeeGainFor } from './positionReadingService';
import { PIECE_NAMES } from '../types/tacticTypes';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

const NAME = PIECE_NAMES as Readonly<Record<PieceSymbol, string>>;

/** One engine line from the board after the move: White-POV cp, its moves. */
export interface ReplyLine {
  cp: number | null;
  mate: number | null;
  moves: readonly string[];
}

export interface BothSaved {
  /** The piece that moved, from and to. */
  moved: { piece: PieceSymbol; from: Square; to: Square };
  /** The other hanging piece, now guarded by the moved one. */
  other: { piece: PieceSymbol; square: Square };
  san: string;
  key: string;
}

/** White-POV score of a line, mate folded in. */
function score(l: ReplyLine): number | null {
  if (l.mate != null) return l.mate > 0 ? 100000 - l.mate : -100000 - l.mate;
  return l.cp;
}

/** Is the piece on `square` lost after the move (`fenAfter`, `them` to move)?
 *  Safe by the legal exchange, or the engine vouches: its best reply does not
 *  take it and every line that does scores worse for them by 30cp or more. */
function lost(fenAfter: string, square: Square, them: Color, replies: readonly ReplyLine[]): boolean {
  if (legalSeeGainFor(fenAfter, square, them) === 0) return false;
  if (replies.length < 2) return true;
  const takes = (l: ReplyLine): boolean => (l.moves[0] ?? '').slice(2, 4) === square;
  if (takes(replies[0])) return true;
  const best = score(replies[0]);
  if (best == null) return true;
  const sign = them === 'w' ? 1 : -1;
  const capture = replies.filter(takes);
  // The engine has to have read the capture to vouch for it.
  if (capture.length === 0) return true;
  return capture.some((l) => { const s = score(l); return s == null || (best - s) * sign < 30; });
}

/** The save of two hanging pieces made by `san` on `fenBefore`, or null.
 *  `replies`: the engine's lines from the board after the move (their reply
 *  first), best first; [] where the surface has none. */
export function bothSaved(fenBefore: string, san: string, replies: readonly ReplyLine[]): BothSaved | null {
  let c: Chess;
  try { c = new Chess(fenBefore); } catch { return null; }
  if (c.inCheck()) return null;
  const me = c.turn();
  const them: Color = me === 'w' ? 'b' : 'w';
  const hanging = findHangingBySee(fenBefore).filter((h) => h.color === me && h.piece !== 'p');
  if (hanging.length < 2) return null;
  let mv;
  try { mv = c.move(san); } catch { return null; }
  // A capture or a check is a different idea (the trade, the in-between move).
  if (mv.captured || c.inCheck()) return null;
  if (!hanging.some((h) => h.square === mv.from)) return null;
  const fenAfter = c.fen();
  const others = hanging.filter((h) => h.square !== mv.from);
  for (const o of others) {
    if (!c.attackers(o.square, me).includes(mv.to)) continue;
    // Every piece that hung before stands after the move.
    const all = [mv.to, ...others.map((x) => x.square)] as Square[];
    if (all.some((s) => lost(fenAfter, s, them, replies))) continue;
    return {
      moved: { piece: mv.piece, from: mv.from, to: mv.to },
      other: { piece: o.piece, square: o.square },
      san: mv.san,
      key: `both-saved:${mv.from}${mv.to}`,
    };
  }
  return null;
}

/** Said from the mover's seat (`own`: your / their). It names the piece and
 *  its square, never the move: Learn names no student move. Rotated on the
 *  board after the move. */
export function bothSavedLine(b: BothSaved, own: 'your' | 'their', fenAfter: string): string {
  const p = NAME[b.moved.piece];
  const o = NAME[b.other.piece];
  const two = `the ${p} on ${b.moved.from} and the ${o} on ${b.other.square}`;
  return rotateStem([
    `Two of ${own} pieces were hanging, ${two}. The ${p} saves both: it steps to ${b.moved.to} and guards the ${o}.`,
    `${cap(own)} ${p} on ${b.moved.from} and ${o} on ${b.other.square} were both hanging. One move saves the two of them: the ${p} goes to ${b.moved.to}, out of the attack, and guards the ${o}.`,
    `With ${two} both hanging, look for a move of one that guards the other. The ${p} to ${b.moved.to} does it.`,
  ], stemKeyOf(fenAfter));
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
