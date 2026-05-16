import type { ChessPiece } from './index';

/** A single sweep level — kid moves a chess piece to capture all
 *  target pawns in as few moves as possible. Same level-config shape
 *  as PieceMazeLevel but with `targets` (plural) instead of a single
 *  goal square, and obstacles are blockers the kid can't move through
 *  (separate from targets which are captured by moving onto them). */
export interface PieceSweepLevel {
  piece: ChessPiece;
  id: number;
  name: string;
  pieceStart: string;
  /** Squares the kid must capture. Win when all are captured. */
  targets: string[];
  /** Squares the kid can't move through or onto (separate from targets). */
  obstacles: string[];
  /** Optimal-move count for 3 stars. */
  par: number;
}

export interface PieceSweepLevelProgress {
  completed: boolean;
  bestMoves: number;
  stars: number;
}

export interface PieceSweepProgress {
  levels: Record<string, PieceSweepLevelProgress>;
}
