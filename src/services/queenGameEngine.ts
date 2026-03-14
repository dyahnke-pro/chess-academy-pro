// ─── Queen Mini-Game Engine ───────────────────────────────────────────────────
// Custom game logic for the two queen mini-games in the Pawn's Journey curriculum.

// ─── Shared Types ────────────────────────────────────────────────────────────

/** A square on the board, e.g. 'a1', 'h8'. */
type Square = string;

interface Piece {
  type: 'queen' | 'pawn' | 'knight' | 'rook' | 'bishop';
  square: Square;
}

// ─── Board Utilities ─────────────────────────────────────────────────────────

function fileOf(sq: Square): number {
  return sq.charCodeAt(0) - 97; // a=0, h=7
}

function rankOf(sq: Square): number {
  return parseInt(sq[1], 10); // 1-8
}

function toSquare(file: number, rank: number): Square {
  return `${String.fromCharCode(97 + file)}${rank}`;
}

function isOnBoard(file: number, rank: number): boolean {
  return file >= 0 && file <= 7 && rank >= 1 && rank <= 8;
}

/** All squares occupied by any piece in the list. */
function occupiedSet(pieces: Piece[]): Set<Square> {
  return new Set(pieces.map((p) => p.square));
}

// ─── Queen Movement ──────────────────────────────────────────────────────────

const DIRECTIONS = [
  [0, 1], [0, -1], [1, 0], [-1, 0],   // rook-like
  [1, 1], [1, -1], [-1, 1], [-1, -1],  // bishop-like
] as const;

/**
 * Get all squares a queen can move to from `from`, considering blocking pieces.
 * The queen can capture enemy pieces but cannot pass through any piece.
 */
export function getQueenMoves(
  from: Square,
  allPieces: Piece[],
  friendlySquares: Set<Square> = new Set(),
): Square[] {
  const f = fileOf(from);
  const r = rankOf(from);
  const occupied = occupiedSet(allPieces);
  const moves: Square[] = [];

  for (const [df, dr] of DIRECTIONS) {
    let cf = f + df;
    let cr = r + dr;
    while (isOnBoard(cf, cr)) {
      const sq = toSquare(cf, cr);
      if (friendlySquares.has(sq)) break; // blocked by friendly piece
      if (occupied.has(sq)) {
        // Can capture enemy piece
        if (!friendlySquares.has(sq)) moves.push(sq);
        break;
      }
      moves.push(sq);
      cf += df;
      cr += dr;
    }
  }

  return moves;
}

// ─── Attack Calculations ─────────────────────────────────────────────────────

/** Squares attacked by a rook on `sq`. */
function rookAttacks(sq: Square, blockers: Set<Square>): Set<Square> {
  const f = fileOf(sq);
  const r = rankOf(sq);
  const attacks = new Set<Square>();
  const rookDirs = [[0, 1], [0, -1], [1, 0], [-1, 0]] as const;

  for (const [df, dr] of rookDirs) {
    let cf = f + df;
    let cr = r + dr;
    while (isOnBoard(cf, cr)) {
      const s = toSquare(cf, cr);
      attacks.add(s);
      if (blockers.has(s)) break;
      cf += df;
      cr += dr;
    }
  }

  return attacks;
}

/** Squares attacked by a bishop on `sq`. */
function bishopAttacks(sq: Square, blockers: Set<Square>): Set<Square> {
  const f = fileOf(sq);
  const r = rankOf(sq);
  const attacks = new Set<Square>();
  const bishopDirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const;

  for (const [df, dr] of bishopDirs) {
    let cf = f + df;
    let cr = r + dr;
    while (isOnBoard(cf, cr)) {
      const s = toSquare(cf, cr);
      attacks.add(s);
      if (blockers.has(s)) break;
      cf += df;
      cr += dr;
    }
  }

  return attacks;
}

/** Squares attacked by a knight on `sq`. */
function knightAttacks(sq: Square): Set<Square> {
  const f = fileOf(sq);
  const r = rankOf(sq);
  const attacks = new Set<Square>();
  const jumps = [
    [1, 2], [2, 1], [-1, 2], [-2, 1],
    [1, -2], [2, -1], [-1, -2], [-2, -1],
  ];

  for (const [df, dr] of jumps) {
    if (isOnBoard(f + df, r + dr)) {
      attacks.add(toSquare(f + df, r + dr));
    }
  }

  return attacks;
}

/**
 * Get all squares attacked by a set of enemy pieces.
 * Blockers include all pieces on the board (for sliding piece ray-casting).
 */
export function getAttackedSquares(
  enemyPieces: Piece[],
  allBlockers: Set<Square>,
): Set<Square> {
  const attacked = new Set<Square>();

  for (const piece of enemyPieces) {
    let pieceAttacks: Set<Square>;
    switch (piece.type) {
      case 'rook':
        pieceAttacks = rookAttacks(piece.square, allBlockers);
        break;
      case 'bishop':
        pieceAttacks = bishopAttacks(piece.square, allBlockers);
        break;
      case 'knight':
        pieceAttacks = knightAttacks(piece.square);
        break;
      default:
        pieceAttacks = new Set<Square>();
    }

    for (const sq of pieceAttacks) {
      attacked.add(sq);
    }
  }

  return attacked;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAME 1 — QUEEN VS. ARMY
// ═══════════════════════════════════════════════════════════════════════════════

export interface QueenArmyLevel {
  id: number;
  pawns: Square[];
  knight: Square | null;          // Level 3 adds a knight
  queenStart: Square;
  showPromotionHighlight: boolean; // red squares on rank 8
  showQueenMoves: boolean;         // highlight queen's legal moves
}

export interface QueenArmyState {
  queen: Square;
  pawns: Square[];
  knight: Square | null;
  status: 'playing' | 'won' | 'lost';
  moveCount: number;
}

export const QUEEN_ARMY_LEVELS: QueenArmyLevel[] = [
  {
    id: 1,
    pawns: ['b2', 'd2', 'f2', 'c3', 'e3', 'g4'],
    knight: null,
    queenStart: 'd5',
    showPromotionHighlight: true,
    showQueenMoves: true,
  },
  {
    id: 2,
    pawns: ['a2', 'c3', 'e2', 'g3', 'b5', 'd5', 'f5', 'h4'],
    knight: null,
    queenStart: 'e4',
    showPromotionHighlight: true,
    showQueenMoves: false,
  },
  {
    id: 3,
    pawns: ['a2', 'b3', 'c2', 'e3', 'f2', 'g4', 'h3', 'b5', 'd5', 'f5'],
    knight: 'g6',
    queenStart: 'd4',
    showPromotionHighlight: false,
    showQueenMoves: false,
  },
];

export function initQueenArmyState(level: QueenArmyLevel): QueenArmyState {
  return {
    queen: level.queenStart,
    pawns: [...level.pawns],
    knight: level.knight,
    status: 'playing',
    moveCount: 0,
  };
}

/**
 * Process a queen move in Queen vs Army.
 * Returns the new state after the move + pawn advancement.
 */
export function processQueenArmyMove(
  state: QueenArmyState,
  to: Square,
): QueenArmyState {
  if (state.status !== 'playing') return state;

  // Build piece list for movement validation
  const allPieces: Piece[] = [
    { type: 'queen', square: state.queen },
    ...state.pawns.map((sq): Piece => ({ type: 'pawn', square: sq })),
  ];
  if (state.knight) {
    allPieces.push({ type: 'knight', square: state.knight });
  }

  const legalMoves = getQueenMoves(state.queen, allPieces);
  if (!legalMoves.includes(to)) return state;

  // Move queen — capture pawn if present
  const newPawns = state.pawns.filter((p) => p !== to);
  let newKnight = state.knight;

  // Can the queen capture the knight too?
  if (newKnight === to) {
    newKnight = null;
  }

  // Check win: all pawns captured
  if (newPawns.length === 0) {
    return {
      queen: to,
      pawns: [],
      knight: newKnight,
      status: 'won',
      moveCount: state.moveCount + 1,
    };
  }

  // Advance remaining pawns one rank upward (toward rank 8)
  const advancedPawns: Square[] = [];
  let anyPromoted = false;

  for (const pawnSq of newPawns) {
    const newRank = rankOf(pawnSq) + 1;
    if (newRank > 8) {
      anyPromoted = true;
      break;
    }
    if (newRank === 8) {
      anyPromoted = true;
      break;
    }
    const newSq = toSquare(fileOf(pawnSq), newRank);
    // Pawns don't collide with each other or the queen for simplicity
    advancedPawns.push(newSq);
  }

  if (anyPromoted) {
    return {
      queen: to,
      pawns: newPawns,
      knight: newKnight,
      status: 'lost',
      moveCount: state.moveCount + 1,
    };
  }

  return {
    queen: to,
    pawns: advancedPawns,
    knight: newKnight,
    status: 'playing',
    moveCount: state.moveCount + 1,
  };
}

/**
 * Get the position object for a Queen vs Army state.
 */
export function queenArmyPosition(
  state: QueenArmyState,
): Record<string, { pieceType: string }> {
  const pos: Record<string, { pieceType: string }> = {};
  pos[state.queen] = { pieceType: 'wQ' };
  for (const p of state.pawns) {
    pos[p] = { pieceType: 'bP' };
  }
  if (state.knight) {
    pos[state.knight] = { pieceType: 'bN' };
  }
  return pos;
}

/**
 * Get highlight squares for Queen vs Army based on level config.
 */
export function queenArmyHighlights(
  state: QueenArmyState,
  level: QueenArmyLevel,
): { promotionSquares: Square[]; queenMoveSquares: Square[] } {
  const promotionSquares: Square[] = [];
  const queenMoveSquares: Square[] = [];

  if (level.showPromotionHighlight) {
    for (let f = 0; f < 8; f++) {
      promotionSquares.push(toSquare(f, 8));
    }
  }

  if (level.showQueenMoves && state.status === 'playing') {
    const allPieces: Piece[] = [
      { type: 'queen', square: state.queen },
      ...state.pawns.map((sq): Piece => ({ type: 'pawn', square: sq })),
    ];
    if (state.knight) {
      allPieces.push({ type: 'knight', square: state.knight });
    }
    const moves = getQueenMoves(state.queen, allPieces);
    queenMoveSquares.push(...moves);
  }

  return { promotionSquares, queenMoveSquares };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAME 2 — QUEEN'S GAUNTLET
// ═══════════════════════════════════════════════════════════════════════════════

export interface GauntletEnemy {
  type: 'rook' | 'bishop';
  square: Square;
}

export interface QueenGauntletLevel {
  id: number;
  enemies: GauntletEnemy[];
  queenStart: Square;
  target: Square;
  showAttackedSquares: boolean; // red squares
  showSafeSquares: boolean;     // green squares (level 1 only)
}

export interface QueenGauntletState {
  queen: Square;
  enemies: GauntletEnemy[];
  target: Square;
  status: 'playing' | 'won' | 'lost';
  moveCount: number;
}

export const QUEEN_GAUNTLET_LEVELS: QueenGauntletLevel[] = [
  {
    id: 1,
    enemies: [
      { type: 'rook', square: 'd4' },
      { type: 'bishop', square: 'f5' },
    ],
    queenStart: 'a1',
    target: 'h8',
    showAttackedSquares: true,
    showSafeSquares: true,
  },
  {
    id: 2,
    enemies: [
      { type: 'rook', square: 'c3' },
      { type: 'bishop', square: 'f6' },
      { type: 'rook', square: 'e1' },
      { type: 'bishop', square: 'b5' },
    ],
    queenStart: 'a2',
    target: 'h7',
    showAttackedSquares: true,
    showSafeSquares: false,
  },
  {
    id: 3,
    enemies: [
      { type: 'rook', square: 'c4' },
      { type: 'rook', square: 'f2' },
      { type: 'bishop', square: 'b6' },
      { type: 'bishop', square: 'g5' },
      { type: 'rook', square: 'e7' },
      { type: 'bishop', square: 'd1' },
    ],
    queenStart: 'a3',
    target: 'h6',
    showAttackedSquares: false,
    showSafeSquares: false,
  },
];

export function initGauntletState(level: QueenGauntletLevel): QueenGauntletState {
  return {
    queen: level.queenStart,
    enemies: [...level.enemies],
    target: level.target,
    status: 'playing',
    moveCount: 0,
  };
}

/**
 * Process a queen move in Queen's Gauntlet.
 * Returns the new state. Instantly loses if the queen lands on an attacked square.
 */
export function processGauntletMove(
  state: QueenGauntletState,
  to: Square,
): QueenGauntletState {
  if (state.status !== 'playing') return state;

  // Build pieces for movement validation
  const allPieces: Piece[] = [
    { type: 'queen', square: state.queen },
    ...state.enemies.map((e): Piece => ({ type: e.type, square: e.square })),
  ];

  // Queen can't move to enemy-occupied squares (no captures in gauntlet)
  const enemySquares = new Set(state.enemies.map((e) => e.square));
  const legalMoves = getQueenMoves(state.queen, allPieces, enemySquares);
  if (!legalMoves.includes(to)) return state;

  // Check if target square is attacked
  const blockers = new Set([to, ...state.enemies.map((e) => e.square)]);
  const attacked = getAttackedSquares(
    state.enemies.map((e) => ({ type: e.type, square: e.square })),
    blockers,
  );

  if (attacked.has(to)) {
    return {
      ...state,
      queen: to,
      status: 'lost',
      moveCount: state.moveCount + 1,
    };
  }

  // Check win: reached target
  if (to === state.target) {
    return {
      ...state,
      queen: to,
      status: 'won',
      moveCount: state.moveCount + 1,
    };
  }

  return {
    ...state,
    queen: to,
    status: 'playing',
    moveCount: state.moveCount + 1,
  };
}

/**
 * Get the position object for a Gauntlet state.
 */
export function gauntletPosition(
  state: QueenGauntletState,
): Record<string, { pieceType: string }> {
  const pos: Record<string, { pieceType: string }> = {};
  pos[state.queen] = { pieceType: 'wQ' };
  for (const e of state.enemies) {
    pos[e.square] = { pieceType: e.type === 'rook' ? 'bR' : 'bB' };
  }
  return pos;
}

/**
 * Compute attacked and safe squares for Gauntlet highlighting.
 */
export function gauntletHighlights(
  state: QueenGauntletState,
  level: QueenGauntletLevel,
): { attackedSquares: Set<Square>; safeSquares: Set<Square> } {
  const blockerSet = new Set([
    state.queen,
    ...state.enemies.map((e) => e.square),
  ]);
  const attacked = getAttackedSquares(
    state.enemies.map((e) => ({ type: e.type, square: e.square })),
    blockerSet,
  );

  // Add enemy piece squares themselves as attacked
  for (const e of state.enemies) {
    attacked.add(e.square);
  }

  const safeSquares = new Set<Square>();

  if (level.showSafeSquares) {
    for (let f = 0; f < 8; f++) {
      for (let r = 1; r <= 8; r++) {
        const sq = toSquare(f, r);
        if (!attacked.has(sq) && sq !== state.queen) {
          safeSquares.add(sq);
        }
      }
    }
  }

  return {
    attackedSquares: level.showAttackedSquares ? attacked : new Set(),
    safeSquares,
  };
}
