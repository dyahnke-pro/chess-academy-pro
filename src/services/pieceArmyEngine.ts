// Pieces vs. Army — a FEW heroes (e.g. 2 knights, or 2 bishops on
// opposite colors) hunt a marching pawn army. Each turn the player moves
// ONE hero (capturing a pawn it lands on); then every pawn advances one
// rank. Capture them all before any pawn reaches the 8th rank (queens).
//
// Why a PAIR: a lone knight/bishop can't catch a scattered army (it
// strands itself / a bishop only sees one color). Two heroes give the
// coverage — 2 bishops cover both colors, 2 knights cover the board —
// so the army can actually be hunted down. (David's "few vs many".)
//
// Every level ships only after isArmySolvable proves it winnable.

export type ArmyPieceType = 'queen' | 'rook' | 'bishop' | 'knight';

export interface ArmyHero {
  type: ArmyPieceType;
  square: string;
}

export interface ArmyLevel {
  id: number;
  name: string;
  heroes: ArmyHero[];
  /** Enemy pawn squares (they march toward rank 8). */
  pawns: string[];
}

export interface ArmyState {
  heroes: ArmyHero[];
  pawns: string[];
  status: 'playing' | 'won' | 'lost';
  moveCount: number;
}

const FILES = 'abcdefgh';
const fileOf = (sq: string): number => FILES.indexOf(sq[0]);
const rankOf = (sq: string): number => parseInt(sq[1], 10) - 1; // 0-indexed
const toSq = (f: number, r: number): string => `${FILES[f]}${r + 1}`;
const onBoard = (f: number, r: number): boolean => f >= 0 && f < 8 && r >= 0 && r < 8;

const KNIGHT: ReadonlyArray<[number, number]> = [
  [1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2],
];
const ROOK_DIRS: ReadonlyArray<[number, number]> = [[0, 1], [0, -1], [1, 0], [-1, 0]];
const BISHOP_DIRS: ReadonlyArray<[number, number]> = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

function slideDirs(type: ArmyPieceType): ReadonlyArray<[number, number]> {
  if (type === 'rook') return ROOK_DIRS;
  if (type === 'bishop') return BISHOP_DIRS;
  return [...ROOK_DIRS, ...BISHOP_DIRS]; // queen
}

export function initArmyState(level: ArmyLevel): ArmyState {
  return {
    heroes: level.heroes.map((h) => ({ ...h })),
    pawns: [...level.pawns],
    status: 'playing',
    moveCount: 0,
  };
}

/**
 * Legal destinations for hero `index`: empty squares it can reach, plus
 * pawn squares it can capture. Other heroes block (and can't be landed
 * on); pawns are capturable (a slider stops on the captured pawn).
 */
export function armyHeroMoves(state: ArmyState, index: number): string[] {
  const hero = state.heroes[index];
  if (!hero) return [];
  const otherHeroes = new Set(
    state.heroes.filter((_, i) => i !== index).map((h) => h.square),
  );
  const pawns = new Set(state.pawns);
  const f0 = fileOf(hero.square);
  const r0 = rankOf(hero.square);
  const moves: string[] = [];

  if (hero.type === 'knight') {
    for (const [df, dr] of KNIGHT) {
      const f = f0 + df;
      const r = r0 + dr;
      if (!onBoard(f, r)) continue;
      const sq = toSq(f, r);
      if (otherHeroes.has(sq)) continue;
      moves.push(sq); // empty or pawn-capture
    }
    return moves;
  }

  for (const [df, dr] of slideDirs(hero.type)) {
    let f = f0 + df;
    let r = r0 + dr;
    while (onBoard(f, r)) {
      const sq = toSq(f, r);
      if (otherHeroes.has(sq)) break; // friendly piece blocks, not capturable
      moves.push(sq);
      if (pawns.has(sq)) break; // capture stops the slide
      f += df;
      r += dr;
    }
  }
  return moves;
}

/** Advance every pawn one rank toward rank 8. Most-advanced first so a
 *  column frees up as the front pawn moves. A hero or another pawn ahead
 *  blocks. A pawn reaching rank 8 promotes → the player loses. */
function advancePawns(pawns: string[], heroSquares: Set<string>): { pawns: string[]; promoted: boolean } {
  const sorted = [...pawns].sort((a, b) => rankOf(b) - rankOf(a));
  const next = new Set<string>();
  let promoted = false;
  for (const p of sorted) {
    const f = fileOf(p);
    const r = rankOf(p);
    const ahead = toSq(f, r + 1);
    const blocked = heroSquares.has(ahead) || next.has(ahead);
    if (r + 1 >= 8) { promoted = true; next.add(p); continue; } // can't go past 8
    if (blocked) { next.add(p); continue; }
    if (r + 1 === 7) promoted = true; // reaches the 8th rank (0-indexed 7)
    next.add(ahead);
  }
  return { pawns: [...next], promoted };
}

export function applyArmyMove(state: ArmyState, index: number, to: string): ArmyState {
  if (state.status !== 'playing') return state;
  if (!armyHeroMoves(state, index).includes(to)) return state;

  // Move the hero; capture a pawn if present.
  const heroes = state.heroes.map((h, i) => (i === index ? { ...h, square: to } : h));
  const pawns = state.pawns.filter((p) => p !== to);

  if (pawns.length === 0) {
    return { heroes, pawns, status: 'won', moveCount: state.moveCount + 1 };
  }

  const heroSquares = new Set(heroes.map((h) => h.square));
  const { pawns: advanced, promoted } = advancePawns(pawns, heroSquares);
  return {
    heroes,
    pawns: advanced,
    status: promoted ? 'lost' : 'playing',
    moveCount: state.moveCount + 1,
  };
}

export function armyPosition(state: ArmyState): Record<string, { pieceType: string }> {
  const LETTER: Record<ArmyPieceType, string> = { queen: 'Q', rook: 'R', bishop: 'B', knight: 'N' };
  const map: Record<string, { pieceType: string }> = {};
  for (const p of state.pawns) map[p] = { pieceType: 'bP' };
  for (const h of state.heroes) map[h.square] = { pieceType: `w${LETTER[h.type]}` };
  return map;
}

/**
 * Is the level winnable? DFS over (heroes, pawns) states with memo and a
 * node cap. The game self-terminates fast (a pawn promotes within ~6
 * advances), so depth is small; the cap keeps a pathological branch
 * bounded. Returns true only if a forced-win line is found within the
 * cap (conservative — we never ship a level we can't prove winnable).
 */
export function isArmySolvable(level: ArmyLevel, nodeCap = 400_000): boolean {
  const seen = new Set<string>();
  let nodes = 0;
  const key = (s: ArmyState): string =>
    s.heroes.map((h) => `${h.type}${h.square}`).join(',') + '|' + [...s.pawns].sort().join(',');

  function win(s: ArmyState): boolean {
    if (s.status === 'won') return true;
    if (s.status === 'lost') return false;
    if (++nodes > nodeCap) return false;
    const k = key(s);
    if (seen.has(k)) return false;
    seen.add(k);
    for (let i = 0; i < s.heroes.length; i++) {
      for (const to of armyHeroMoves(s, i)) {
        if (win(applyArmyMove(s, i, to))) return true;
      }
    }
    return false;
  }
  return win(initArmyState(level));
}
