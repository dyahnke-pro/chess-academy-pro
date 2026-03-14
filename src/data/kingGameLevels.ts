// ─── King Game Level Configurations ─────────────────────────────────────────
// Used by KingEscapeGame and KingMarchGame (WO-10)

export interface KingGameLevel {
  level: number;
  fen: string;
  description: string;
  showDangerSquares: boolean;
  showSafeSquares: boolean;
}

export interface KingMarchLevel extends KingGameLevel {
  goalSquare: string;
}

// ─── King Escape ────────────────────────────────────────────────────────────
// King is in check — must move to a safe square.

export const KING_ESCAPE_LEVELS: KingGameLevel[] = [
  {
    // Rook e4 checks on e-file. Safe: d1, d2, f1, f2 (4 squares).
    level: 1,
    fen: '7k/8/8/8/4r3/8/8/4K3 w - - 0 1',
    description: 'Your king is in danger! Move it to a green safe square.',
    showDangerSquares: true,
    showSafeSquares: true,
  },
  {
    // Rook e4 + Bishop a4. Bishop blocks d1. Safe: d2, f1, f2 (3 squares).
    level: 2,
    fen: '7k/8/8/8/b3r3/8/8/4K3 w - - 0 1',
    description: 'Harder now! Attacked from two directions. Find a safe square.',
    showDangerSquares: true,
    showSafeSquares: false,
  },
  {
    // Rook e4 + Bishop a4 + Knight f3. Knight blocks d2. Safe: f1, f2 (2 squares).
    level: 3,
    fen: '7k/8/8/8/b3r3/5n2/8/4K3 w - - 0 1',
    description: 'No hints this time! Find the safe square on your own.',
    showDangerSquares: false,
    showSafeSquares: false,
  },
];

// ─── King March ─────────────────────────────────────────────────────────────
// Walk the king from e1 to e8 through a minefield of attacked squares.
// Enemy pieces are stationary. King cannot capture enemy pieces.

export const KING_MARCH_LEVELS: KingMarchLevel[] = [
  {
    // 2 bishops (b3, g5). Wide safe corridor.
    // Path: e1→e2→d3→d4→c5→c6→d7→e8 (7 moves)
    level: 1,
    fen: 'k7/8/8/6b1/8/1b6/8/4K3 w - - 0 1',
    goalSquare: 'e8',
    description: 'March your king from e1 to e8! Avoid the red danger zones.',
    showDangerSquares: true,
    showSafeSquares: true,
  },
  {
    // Rook a5, Bishop g5, Knight d4, Bishop b3. Narrower path.
    // Path: e1→f2→g3→g4→h5→g6→g7→f8→e8 (8 moves)
    level: 2,
    fen: 'k7/8/8/r5b1/3n4/1b6/8/4K3 w - - 0 1',
    goalSquare: 'e8',
    description: 'More obstacles! Find the safe path to e8.',
    showDangerSquares: true,
    showSafeSquares: false,
  },
  {
    // Ra5, Bg5, Nd4, Bb3, Be3, Ba1. Single winding path.
    // Path: e1→f1→g2→g3→g4→h5→g6→g7→f8→e8 (9 moves)
    level: 3,
    fen: 'k7/8/8/r5b1/3n4/1b2b3/8/b3K3 w - - 0 1',
    goalSquare: 'e8',
    description: 'The ultimate challenge! Navigate through the minefield to reach e8.',
    showDangerSquares: false,
    showSafeSquares: false,
  },
];
