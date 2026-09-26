// undeveloped — ONE answer to "is this piece merely undeveloped?" (walk 5,
import { isOnHomeSquare } from '../services/development';
// 2026-09-23). Two computers — the passivity ablation (`pieceQuality`) and the
// worst-placed-piece plan (`nextPlans.findWorstPlacedPiece`) — both named a
// bishop still on c8 at move 8–10 as the passive / worst piece and handed the
// student a reroute sermon for a piece that had simply not moved yet. A piece
// on its home square in the opening is a DEVELOPMENT fact, which has its own
// clause; it becomes a placement fact only once the game has left the opening.
// Leaf: imports only the development leaf, so any fact-computer may use it.

/** The opening, for this question: before this full move, a home-square piece
 *  is undeveloped rather than misplaced. */
export const UNDEVELOPED_BEFORE_MOVE = 12;

export function isUndevelopedInOpening(fen: string, color: 'w' | 'b', type: string, square: string): boolean {
  const fullMove = Number.parseInt(fen.split(' ')[5] ?? '1', 10) || 1;
  return fullMove < UNDEVELOPED_BEFORE_MOVE && type.toLowerCase() !== 'k' && isOnHomeSquare(type, color, square);
}
