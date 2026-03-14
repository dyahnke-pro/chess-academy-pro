// ─── Leap Frog Level Config ──────────────────────────────────────────────────

export interface LeapFrogLevel {
  level: number;
  name: string;
  dangerSquares: string[];
  friendlyPieces: Array<{ square: string; piece: string }>;
  showDangerHighlights: boolean;
  showValidMoveHighlights: boolean;
  showTreasureGlow: boolean;
}

// ─── Knight Sweep Level Config ───────────────────────────────────────────────

export interface KnightSweepLevel {
  level: number;
  name: string;
  knightStart: string;
  enemyPieces: Array<{ square: string; piece: string }>;
  par: number;
  showEnemyGlow: boolean;
  showValidMoveHighlights: boolean;
}

// ─── Leap Frog: knight on e1, treasure on e8 ────────────────────────────────

function buildLevel3DangerSquares(): string[] {
  const safe = new Set(['e1', 'd3', 'c5', 'b7', 'd6', 'e8']);
  const squares: string[] = [];
  for (let f = 0; f < 8; f++) {
    for (let r = 1; r <= 8; r++) {
      const sq = `${String.fromCharCode(97 + f)}${r}`;
      if (!safe.has(sq)) squares.push(sq);
    }
  }
  return squares;
}

export const LEAP_FROG_LEVELS: LeapFrogLevel[] = [
  {
    // Level 1 — Clear safe path, 2 danger zones, reachable in 5 moves
    // Paths: e1→d3→c5→d7→f6→e8  or  e1→f3→d4→e6→c7→e8
    level: 1,
    name: 'Easy Hop',
    dangerSquares: ['b4', 'h5'],
    friendlyPieces: [
      { square: 'd5', piece: 'wP' },
      { square: 'f4', piece: 'wP' },
      { square: 'c3', piece: 'wP' },
    ],
    showDangerHighlights: true,
    showValidMoveHighlights: true,
    showTreasureGlow: true,
  },
  {
    // Level 2 — Narrower safe path, 4 danger zones, may require backtracking
    // Blocked: d3, e5, c7, g7 — path: e1→f3→d4→f5→d6→e8
    // Also: e1→g2→f4→d5→f6→e8
    level: 2,
    name: 'Tricky Path',
    dangerSquares: ['d3', 'e5', 'c7', 'g7'],
    friendlyPieces: [
      { square: 'e4', piece: 'wR' },
      { square: 'b6', piece: 'wB' },
    ],
    showDangerHighlights: true,
    showValidMoveHighlights: false,
    showTreasureGlow: true,
  },
  {
    // Level 3 — Most squares are danger zones, only one valid path
    // Safe: e1 → d3 → c5 → b7 → d6 → e8
    level: 3,
    name: 'Dark Forest',
    dangerSquares: buildLevel3DangerSquares(),
    friendlyPieces: [
      { square: 'e4', piece: 'wP' },
      { square: 'f6', piece: 'wR' },
    ],
    showDangerHighlights: false,
    showValidMoveHighlights: false,
    showTreasureGlow: false,
  },
];

// ─── Knight Sweep: capture all enemies in fewest moves ───────────────────────

export const KNIGHT_SWEEP_LEVELS: KnightSweepLevel[] = [
  {
    // Level 1 — 3 enemies clustered near center, par=6
    // Knight on d4 attacks b3, f3, e6 directly
    level: 1,
    name: 'Easy Sweep',
    knightStart: 'd4',
    enemyPieces: [
      { square: 'f3', piece: 'bP' },
      { square: 'e6', piece: 'bP' },
      { square: 'b3', piece: 'bP' },
    ],
    par: 6,
    showEnemyGlow: true,
    showValidMoveHighlights: true,
  },
  {
    // Level 2 — 5 enemies spread across board including corners, par=10
    level: 2,
    name: 'Wide Sweep',
    knightStart: 'e4',
    enemyPieces: [
      { square: 'a1', piece: 'bR' },
      { square: 'h8', piece: 'bR' },
      { square: 'c6', piece: 'bB' },
      { square: 'f2', piece: 'bN' },
      { square: 'g5', piece: 'bP' },
    ],
    par: 10,
    showEnemyGlow: true,
    showValidMoveHighlights: false,
  },
  {
    // Level 3 — 7 enemies in complex spread, par=14
    level: 3,
    name: 'Grand Sweep',
    knightStart: 'e4',
    enemyPieces: [
      { square: 'b2', piece: 'bP' },
      { square: 'g1', piece: 'bN' },
      { square: 'a5', piece: 'bB' },
      { square: 'h6', piece: 'bP' },
      { square: 'c8', piece: 'bR' },
      { square: 'f8', piece: 'bR' },
      { square: 'd1', piece: 'bQ' },
    ],
    par: 14,
    showEnemyGlow: false,
    showValidMoveHighlights: false,
  },
];

export const KNIGHT_START_SQUARE = 'e1';
export const TREASURE_SQUARE = 'e8';
