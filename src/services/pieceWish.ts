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
// The piece is the board's own read (`findPieceQuality` 'bad', else the
// least-active minor, `worstPieceNote`); the square is the route computer's
// (`computePieceRoute` for a knight's outpost, `computeSliderRoute` for a
// bishop's diagonal or a rook's file, at most one stop on the way). No route,
// no line: "a better square" teaches nothing. A middlegame idea only — in the
// opening a piece is passive because it is not out yet.
//
// PURE: chess.js and the board reads. No engine.
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { computePieceRoute, computeSliderRoute } from './forwardTeaching';
import { findPieceQuality } from './positionReadingService';
import { worstPieceNote } from './nextPlans';
import { pieceRef } from './pieceRef';
import { openSentence } from '../utils/openSentence';

export interface PieceWish {
  /** The piece's square now. */
  square: Square;
  piece: PieceSymbol;
  /** Where it wants to go. */
  target: Square;
  /** The one stop on the way, when the route has one (lit, never read out). */
  via: Square | null;
  /** The sentence, from the viewer's seat. */
  text: string;
  /** Why it is the piece: the board's 'bad' read, or the idle minor. */
  kind: 'rim-knight' | 'bad-bishop' | 'idle';
}

/** The route and what the target gives the piece, in words that follow "It
 *  wants e6, …". */
function routeTo(fen: string, sq: Square): { target: Square; via: Square | null; aim: string } | null {
  const k = computePieceRoute(fen, sq);
  if (k && k.route.length <= 2) {
    const back = k.backedBy ? `, and the ${k.backedBy[0]}-pawn backs it up` : '';
    return { target: k.target, via: k.route.length === 2 ? k.route[0] : null, aim: `an outpost no pawn can chase it from${back}` };
  }
  const s = computeSliderRoute(fen, sq);
  if (s && s.route.length <= 2) {
    const aim = s.piece === 'b'
      ? `where it sweeps a long diagonal instead of ${s.scopeNow} square${s.scopeNow === 1 ? '' : 's'}`
      : `on the ${s.target[0]}-file, with no pawn of its own in the way`;
    return { target: s.target, via: s.route.length === 2 ? s.route[0] : null, aim };
  }
  return null;
}

/**
 * The `viewer`'s bad or idle piece and where it wants to go, or null. Never the
 * piece on `lastTo` (the square a move just put it on: the move's own point is
 * speaking, and "reroute it" beside "Na4 does two jobs" is two coaches).
 */
export function pieceWish(fen: string, viewer: Color, lastTo: string | null): PieceWish | null {
  if (Number(fen.split(' ')[5] ?? '0') < 10) return null;
  // While a king is in check the check is the only question; nothing is
  // rerouted (the one worst-piece finder's own gate, `findWorstPlacedPiece`).
  try { if (new Chess(fen).isCheck()) return null; } catch { return null; }
  const words = (sq: Square): string => openSentence(pieceRef(fen, sq, viewer)?.words ?? `your piece on ${sq}`);
  const bad = findPieceQuality(fen).find((n) => n.color === viewer && n.quality === 'bad' && n.square !== lastTo);
  if (bad) {
    const r = routeTo(fen, bad.square);
    if (!r) return null;
    const kind: PieceWish['kind'] = bad.kind === 'rim-knight' ? 'rim-knight' : 'bad-bishop';
    const head = kind === 'rim-knight' ? 'is stuck on the rim' : 'is hemmed in behind its own pawns';
    return { square: bad.square, piece: bad.piece, target: r.target, via: r.via, kind, text: `${words(bad.square)} ${head}. It wants ${r.target}, ${r.aim}.` };
  }
  const idle = worstPieceNote(fen, viewer);
  if (!idle || (idle.piece !== 'n' && idle.piece !== 'b') || idle.scope > 1 || idle.square === lastTo) return null;
  const r = routeTo(fen, idle.square);
  if (!r) return null;
  return { square: idle.square, piece: idle.piece, target: r.target, via: r.via, kind: 'idle', text: `${words(idle.square)} is doing nothing. It wants ${r.target}, ${r.aim}.` };
}

