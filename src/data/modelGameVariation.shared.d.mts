// Types for the ONE model-game variation classifier (modelGameVariation.shared.mjs).
//
// Plain ESM so the tagging script and the gate test read the same rule.

export interface ClassifiableOpening {
  id: string;
  pgn?: string;
  variations?: { name: string; pgn?: string }[];
}

export interface ClassifiableGame {
  openingId: string;
  pgn: string;
}

/** Which rule filed the game: the variation it reached and followed deepest;
 *  one followed past the main line; the only one followed this deep; or, with
 *  the main line deepest, one whose identifying moves it played in order (or a
 *  prefix variation of the main line it reached). */
export type VariationTier = 'reached' | 'past-main' | 'only-deep' | 'under-main';

export interface VariationVerdict {
  name: string;
  tier: VariationTier;
}

export interface PlayedLine {
  uci: string[];
  /** Position after each ply: board, side to move, castling, en passant. */
  positions: string[];
}

export interface AnalyzedVariation {
  name: string;
  uci: string[];
  positions: string[];
  /** Plies of the identifying prefix by move order. */
  moveId: number;
  /** First ply past the last point the line coincides with another line. */
  positionId: number;
  /** Every position of the line is on the main line (a prefix variation). */
  onMainLine: boolean;
}

export interface AnalyzedOpening {
  main: PlayedLine;
  variations: AnalyzedVariation[];
}

export declare const TRANSPOSE_FLOOR: number;
export declare function playLine(pgnOrMoves: string | string[] | undefined): PlayedLine;
export declare function analyzeOpening(opening: ClassifiableOpening): AnalyzedOpening;
/** The variation the game played, or null for the main line. */
export declare function classifyGame(pgnOrMoves: string | string[], analysis: AnalyzedOpening): VariationVerdict | null;
export declare function createVariationClassifier(
  openings: ClassifiableOpening[],
): (game: ClassifiableGame) => VariationVerdict | null;
