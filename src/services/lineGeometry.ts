/**
 * lineGeometry — the board's lines, once (census 2026-10-10).
 *
 * The three tactic detectors (`tacticsDetector`, `tacticClassifier`,
 * `missedTacticService`) each carried their own copy of the ray directions,
 * the coordinate helpers, the ray trace and — for a discovered attack the move
 * just made — the discovery test. The copies drifted: on 2026-09-23 the
 * classifier learned that a piece moving ALONG the line it blocks uncovers
 * nothing, and the missed-tactic copy kept reading straight through it, so a
 * discovery that never happened could be filed as a miss. One home now.
 */
import type { Chess, Square, Color, PieceSymbol } from 'chess.js';

export const BISHOP_DIRS: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
export const ROOK_DIRS: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

export function squareToCoords(sq: Square): [number, number] {
  return [sq.charCodeAt(0) - 97, parseInt(sq[1]) - 1];
}

export function coordsToSquare(file: number, rank: number): Square | null {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return `${String.fromCharCode(97 + file)}${rank + 1}` as Square;
}

export interface RayPiece { square: Square; type: PieceSymbol; color: Color }

/** The pieces met along a ray from a square, nearest first, up to `maxPieces`. */
export function traceRay(chess: Chess, fromSquare: Square, dir: [number, number], maxPieces: number = 2): RayPiece[] {
  const [startFile, startRank] = squareToCoords(fromSquare);
  const pieces: RayPiece[] = [];
  let file = startFile + dir[0];
  let rank = startRank + dir[1];
  while (file >= 0 && file <= 7 && rank >= 0 && rank <= 7) {
    const sq = coordsToSquare(file, rank);
    if (!sq) break;
    const piece = chess.get(sq);
    if (piece) {
      pieces.push({ square: sq, type: piece.type, color: piece.color });
      if (pieces.length >= maxPieces) break;
    }
    file += dir[0];
    rank += dir[1];
  }
  return pieces;
}

const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

/**
 * THE DISCOVERY A MOVE JUST MADE: the move from `from` to `to` uncovered a
 * friendly slider behind `from`, now bearing on an enemy piece worth a knight
 * or more. A piece that moved ALONG the line still blocks it — nothing was
 * uncovered (walk 2026-09-23: …d6 "revealing" the queen on the knight it
 * still stood in front of). Null when the move uncovered nothing.
 */
export function discoveryRevealed(chessAfter: Chess, from: Square, to: Square, movingColor: Color): { behind: RayPiece; target: RayPiece } | null {
  for (const dir of [...BISHOP_DIRS, ...ROOK_DIRS]) {
    const behindPieces = traceRay(chessAfter, from, [-dir[0], -dir[1]] as [number, number]);
    if (behindPieces.length === 0) continue;
    const behind = behindPieces[0];
    if (behind.color !== movingColor) continue;
    const diagonal = dir[0] !== 0 && dir[1] !== 0;
    const canSlide = behind.type === 'q' || (behind.type === 'b' && diagonal) || (behind.type === 'r' && !diagonal);
    if (!canSlide) continue;
    const first = traceRay(chessAfter, from, dir, 1)[0];
    if (!first || first.square === to) continue;
    if (first.color !== movingColor && VALUE[first.type] >= 3) return { behind, target: first };
  }
  return null;
}
