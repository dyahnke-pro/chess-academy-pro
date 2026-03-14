// ─── Rook Mini-Game Types ─────────────────────────────────────────────────────

export interface RookMazeLevel {
  id: number;
  name: string;
  rookStart: string;
  target: string;
  obstacles: string[];
  par: number;
  highlightTarget: boolean;
  highlightLegalMoves: boolean;
}

export interface RowClearerLevel {
  id: number;
  name: string;
  rooks: string[];
  enemies: string[];
  par: number;
  highlightCaptures: boolean;
  highlightLegalMoves: boolean;
}

export interface MiniGameLevelProgress {
  completed: boolean;
  bestMoves: number;
  stars: number;
}

export interface RookGameProgress {
  rookMaze: Record<number, MiniGameLevelProgress>;
  rowClearer: Record<number, MiniGameLevelProgress>;
}
