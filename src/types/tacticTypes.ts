// ─── Stockfish-Based Tactic Classification Types ────────────────────────────
//
// Used by tacticClassifier.ts to return deterministic, structured tactic labels
// so the LLM coach explains tactics rather than identifies them.

export interface TacticClassification {
  /** Centipawn eval swing (positive = advantage gained/lost) */
  evalSwing: number;
  /** Move quality grade based on eval delta */
  moveQuality: MoveQuality;
  /** Detected tactical patterns — can be multiple (e.g., fork + check) */
  tactics: TacticPattern[];
  /** Pieces that are undefended and attacked */
  hangingPieces: HangingPiece[];
}

export type MoveQuality =
  | 'brilliant'
  | 'great'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder';

export interface TacticPattern {
  type: TacticPatternType;
  /** Squares involved in the tactic (e.g., fork source + targets) */
  involvedSquares: string[];
  /** Human-readable description, e.g., "Knight on d5 forks queen on c7 and rook on f6" */
  description: string;
}

export type TacticPatternType =
  | 'fork'
  | 'pin'
  | 'skewer'
  | 'discovery'
  | 'double_check'
  | 'back_rank'
  | 'removal_of_guard'
  | 'none';

export interface HangingPiece {
  square: string;
  piece: string;
  color: 'w' | 'b';
}

/** Piece name lookup for human-readable descriptions */
export const PIECE_NAMES: Record<string, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};
