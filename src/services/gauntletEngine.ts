// gauntletEngine.ts — the reusable "one piece vs many" gauntlet.
//
// The hero (a single queen / rook / bishop / knight) must CAPTURE every
// enemy in the army. But every move must be a capture, and if the hero
// lands on a square still defended by a remaining enemy, the hero is
// taken — game over. So the kid has to find the SAFE capture order:
// take the undefended piece first, which un-guards the next, and carve
// a path through the whole army. (Teaches: don't grab a defended piece;
// remove the defender first; desperado/capture-order.)
//
// King-less puzzle boards (like queenGameEngine), so movement uses a
// small self-contained geometry rather than chess.js (which requires
// both kings). Every move is still fully validated here — the LLM
// never touches any of this (kid non-negotiable #17).

export type GauntletPieceType = 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';

export interface GauntletPiece {
  type: GauntletPieceType;
  square: string; // 'a1'..'h8'
}

export interface GauntletLevel {
  id: number;
  name: string;
  hero: GauntletPiece;
  enemies: GauntletPiece[];
  /** Show the red "defended squares" overlay (training wheels — early levels). */
  showGuarded: boolean;
}

export interface GauntletState {
  hero: GauntletPiece;
  enemies: GauntletPiece[];
  status: 'playing' | 'won' | 'lost';
  moveCount: number;
}

// ─── geometry (file/rank 0-7) ───────────────────────────────────────
function fileOf(sq: string): number { return sq.charCodeAt(0) - 97; }
function rankOf(sq: string): number { return Number(sq[1]) - 1; }
function toSq(f: number, r: number): string { return `${String.fromCharCode(97 + f)}${r + 1}`; }
function onBoard(f: number, r: number): boolean { return f >= 0 && f < 8 && r >= 0 && r < 8; }

const ROOK_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const BISHOP_DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const KNIGHT_OFF = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];

function slideDirs(type: GauntletPieceType): number[][] {
  if (type === 'rook') return ROOK_DIRS;
  if (type === 'bishop') return BISHOP_DIRS;
  if (type === 'queen') return [...ROOK_DIRS, ...BISHOP_DIRS];
  return [];
}

/** Squares a single piece ATTACKS, given a set of blocker squares. */
export function pieceAttacks(piece: GauntletPiece, blockers: Set<string>): Set<string> {
  const out = new Set<string>();
  const f = fileOf(piece.square);
  const r = rankOf(piece.square);
  if (piece.type === 'knight') {
    for (const [df, dr] of KNIGHT_OFF) {
      if (onBoard(f + df, r + dr)) out.add(toSq(f + df, r + dr));
    }
    return out;
  }
  if (piece.type === 'pawn') {
    // Enemy pawns are "black" — they attack the two squares one rank DOWN.
    for (const df of [-1, 1]) {
      if (onBoard(f + df, r - 1)) out.add(toSq(f + df, r - 1));
    }
    return out;
  }
  for (const [df, dr] of slideDirs(piece.type)) {
    let nf = f + df, nr = r + dr;
    while (onBoard(nf, nr)) {
      const sq = toSq(nf, nr);
      out.add(sq);
      if (blockers.has(sq)) break; // ray stops at first blocker (incl. that square)
      nf += df; nr += dr;
    }
  }
  return out;
}

/** Union of every enemy's attacked squares (all pieces block sliders). */
export function enemyGuardedSquares(enemies: GauntletPiece[], heroSquare: string | null): Set<string> {
  const blockers = new Set<string>(enemies.map((e) => e.square));
  if (heroSquare) blockers.add(heroSquare);
  const out = new Set<string>();
  for (const e of enemies) {
    for (const sq of pieceAttacks(e, blockers)) out.add(sq);
  }
  return out;
}

/** Enemy squares the hero can legally CAPTURE this turn (every move is a capture). */
export function heroCaptureTargets(state: GauntletState): string[] {
  const enemySquares = new Set(state.enemies.map((e) => e.square));
  const allBlockers = new Set<string>([...enemySquares]);
  const f = fileOf(state.hero.square);
  const r = rankOf(state.hero.square);
  const targets: string[] = [];

  if (state.hero.type === 'knight') {
    for (const [df, dr] of KNIGHT_OFF) {
      const sq = onBoard(f + df, r + dr) ? toSq(f + df, r + dr) : null;
      if (sq && enemySquares.has(sq)) targets.push(sq);
    }
    return targets;
  }
  for (const [df, dr] of slideDirs(state.hero.type)) {
    let nf = f + df, nr = r + dr;
    while (onBoard(nf, nr)) {
      const sq = toSq(nf, nr);
      if (allBlockers.has(sq)) {
        if (enemySquares.has(sq)) targets.push(sq); // first blocker is an enemy → capturable
        break;
      }
      nf += df; nr += dr;
    }
  }
  return targets;
}

export function initGauntletState(level: GauntletLevel): GauntletState {
  return {
    hero: { ...level.hero },
    enemies: level.enemies.map((e) => ({ ...e })),
    status: 'playing',
    moveCount: 0,
  };
}

/**
 * Capture the enemy on `to`. Returns a new state. If `to` isn't a legal
 * capture, returns the state unchanged. If the landing square is still
 * defended by a remaining enemy, the hero is lost.
 */
export function applyGauntletCapture(state: GauntletState, to: string): GauntletState {
  if (state.status !== 'playing') return state;
  if (!heroCaptureTargets(state).includes(to)) return state;

  const remaining = state.enemies.filter((e) => e.square !== to);
  const hero: GauntletPiece = { type: state.hero.type, square: to };
  const moveCount = state.moveCount + 1;

  // Defended landing square → hero is recaptured.
  const guarded = enemyGuardedSquares(remaining, to);
  if (guarded.has(to)) {
    return { hero, enemies: remaining, status: 'lost', moveCount };
  }
  if (remaining.length === 0) {
    return { hero, enemies: remaining, status: 'won', moveCount };
  }
  return { hero, enemies: remaining, status: 'playing', moveCount };
}

/** Board map for KidChessboard static display (hero white, enemies black). */
const PIECE_LETTER: Record<GauntletPieceType, string> = {
  queen: 'Q', rook: 'R', bishop: 'B', knight: 'N', pawn: 'P',
};
export function gauntletPosition(state: GauntletState): Record<string, { pieceType: string }> {
  const pos: Record<string, { pieceType: string }> = {};
  pos[state.hero.square] = { pieceType: `w${PIECE_LETTER[state.hero.type]}` };
  for (const e of state.enemies) pos[e.square] = { pieceType: `b${PIECE_LETTER[e.type]}` };
  return pos;
}

/**
 * Is the level winnable? DFS over capture orders where every capture
 * lands on an UNDEFENDED square. Used to validate shipped levels — a
 * gauntlet with no safe order would be an unfair, unsolvable puzzle.
 */
export function isGauntletSolvable(level: GauntletLevel): boolean {
  const seen = new Set<string>();
  function key(s: GauntletState): string {
    return `${s.hero.square}|${[...s.enemies.map((e) => e.square)].sort().join(',')}`;
  }
  function dfs(state: GauntletState): boolean {
    if (state.enemies.length === 0) return true;
    const k = key(state);
    if (seen.has(k)) return false;
    seen.add(k);
    for (const target of heroCaptureTargets(state)) {
      const next = applyGauntletCapture(state, target);
      if (next.status === 'lost') continue; // unsafe capture — skip
      if (dfs(next)) return true;
    }
    return false;
  }
  return dfs(initGauntletState(level));
}
