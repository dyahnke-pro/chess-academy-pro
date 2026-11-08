// pieceWish — THE PIECE THAT WANTS A BETTER SQUARE, and which square, and why
// (census #15, the wishlist; WO wire-19, David 2026-11-08: "These are all very
// important computers … Wire them in!").
//
// ONE COMPUTER, TWO SURFACES. Learn's piece-activity behaviour (`danyaBehaviors`)
// named the student's bad or idle piece with WHERE it wants to go and why, and
// Review's worst-piece facet said the same idea with no square at all: "your
// worst-placed piece is the bishop on c8 — so the plan is to reroute it
// somewhere it actually does a job". That is the vague line the specificity
// rule bans ("the piece, the square, the target, the job"). Both now read this.
//
// The piece is THE ONE WORST PIECE (`nextPlans.findWorstPlacedPiece`, WO-DEPTH-01
// 2026-11-08: this computer used to pick its own — the board's 'bad' read
// first — and on David's games it named a different piece from the plan
// thread's on most boards where both spoke); the square is the one route
// reader's (`worstPieceRoute`). No route, no line: "a better square" teaches
// nothing. A middlegame idea only — in the opening a piece is passive because
// it is not out yet. The rook with no open file is the open-file idea's, said
// there.
//
// PURE: chess.js and the board reads. No engine.
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { findWorstPlacedPiece, worstPieceRoute, worstReason, type WorstKind } from './nextPlans';
import { pieceRef } from './pieceRef';
import { openSentence } from '../utils/openSentence';

export interface PieceWish {
  /** The piece's square now. */
  square: Square;
  piece: PieceSymbol;
  /** Where it wants to go. */
  target: Square;
  /** The stops on the way (lit, never read out). */
  via: Square[];
  /** The sentence, from the viewer's seat. */
  text: string;
  /** Why it is the piece — the one finder's reason. */
  kind: Exclude<WorstKind, 'no-file-rook'>;
}

/**
 * The `viewer`'s worst piece and where it wants to go, or null. Never the
 * piece on `lastTo` (the square a move just put it on: the move's own point is
 * speaking, and "reroute it" beside "Na4 does two jobs" is two coaches) — and
 * never another piece in its place: one board, one worst piece.
 */
export function pieceWish(fen: string, viewer: Color, lastTo: string | null): PieceWish | null {
  if (Number(fen.split(' ')[5] ?? '0') < 10) return null;
  let w: ReturnType<typeof findWorstPlacedPiece>;
  try { w = findWorstPlacedPiece(new Chess(fen), viewer); } catch { return null; }
  if (!w || w.kind === 'no-file-rook' || w.sq === lastTo) return null;
  const r = worstPieceRoute(fen, w.sq);
  if (!r) return null;
  const words = openSentence(pieceRef(fen, w.sq, viewer)?.words ?? `your piece on ${w.sq}`);
  return { square: w.sq, piece: w.type, target: r.target, via: r.via, kind: w.kind, text: `${words} ${worstReason(w)}. It wants ${r.target}, ${r.aim}.` };
}
