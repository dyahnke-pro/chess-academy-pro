// theirWorstPiece — THE OTHER SIDE'S WORST PIECE (Danya have-check, 2026-11-19).
//
// Danya: "Black's a8 bishop is dreadful — incarcerated behind its own pawns";
// "dominant bishop vs passive knight". The worst-piece read (`pieceWish`) only
// ever looked at the student's own pieces, so the other half of the lesson —
// their piece that is doing nothing, and that you want to keep that way — was
// never said. Same finder (`findWorstPlacedPiece`), the other seat.
//
// Backed by the engine's best line: the piece stays where it is for four moves.
// PURE: chess.js and the line handed in (G0).
import { Chess, type Color, type Square } from 'chess.js';
import { findWorstPlacedPiece, worstReason } from './nextPlans';
import { PIECE_NAME, other, playLine } from './engineLineRead';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

export interface TheirWorstPiece { square: Square; piece: string; kind: string; text: string; squares: Square[] }

/** The opponent's worst-placed piece on `fen`, from `student`'s seat, or null. */
export function theirWorstPiece(fen: string, student: Color, bestLine: readonly string[] | null): TheirWorstPiece | null {
  if (Number(fen.split(' ')[5] ?? '0') < 10) return null;
  let w: ReturnType<typeof findWorstPlacedPiece>;
  try { w = findWorstPlacedPiece(new Chess(fen), other(student)); } catch { return null; }
  if (!w || w.kind === 'no-file-rook') return null;
  // Backed by the engine: in its best line the piece neither moves nor is
  // traded off for four moves — it stays out of the game.
  if (!bestLine || bestLine.length < 4) return null;
  if (playLine(fen, bestLine, 8).moves.some((m) => m.from === w!.sq || m.to === w!.sq)) return null;
  const name = PIECE_NAME[w.type] ?? 'piece';
  const close = rotateStem([
    "Leave it there: don't offer to trade it off.",
    'Keep it that way, and never trade it off for one of your good pieces.',
  ], stemKeyOf(fen));
  const text = `Their worst piece is the ${name} on ${w.sq}: it ${worstReason(w)}. ${close}`;
  return { square: w.sq, piece: w.type, kind: w.kind, text, squares: [w.sq] };
}
