/**
 * THE one reading of minor-piece development (WO-DANYA-01, 2026-09-26).
 *
 * Seven services each kept a private copy, and they disagreed: five counted
 * "any minor on any of b1/c1/f1/g1" as undeveloped, one counted per piece
 * type. So a knight re-routed Nd2-f1 (the Ruy's standard manoeuvre) was
 * "still at home" to Learn's development nag and "developed" to review's —
 * one coach, two answers about the same board. Per TYPE is the true reading:
 * a knight on f1 has left home; only a knight on b1/g1 or a bishop on c1/f1
 * has not.
 *
 * The full home table (rooks, queen, king too) lives here as well, so no
 * computer keeps its own copy of the starting squares.
 *
 * A leaf: chess.js types only. Gate: src/test/oneDevelopmentReading.test.ts.
 */
import type { Chess, Color, Square } from 'chess.js';

export type MinorType = 'n' | 'b';

const HOME: Record<Color, Record<'p' | 'n' | 'b' | 'r' | 'q' | 'k', readonly Square[]>> = {
  w: { p: [], n: ['b1', 'g1'], b: ['c1', 'f1'], r: ['a1', 'h1'], q: ['d1'], k: ['e1'] },
  b: { p: [], n: ['b8', 'g8'], b: ['c8', 'f8'], r: ['a8', 'h8'], q: ['d8'], k: ['e8'] },
};

/** Is this piece (any type but a pawn) on ITS OWN starting square? Case-
 *  insensitive on the type, so FEN letters work too. */
export function isOnHomeSquare(type: string, color: Color, square: string): boolean {
  const t = type.toLowerCase();
  const homes = (HOME[color] as Record<string, readonly Square[]>)[t];
  return !!homes && homes.includes(square.toLowerCase() as Square);
}

/** The starting squares of `color`'s pieces of one type. */
export function homeSquaresOf(type: 'n' | 'b' | 'r' | 'q' | 'k', color: Color): readonly Square[] {
  return HOME[color][type];
}

export function isMinor(type: string): type is MinorType {
  return type === 'n' || type === 'b';
}

/** Is this piece a knight/bishop standing on ITS OWN starting square? */
export function isMinorAtHome(type: string, color: Color, square: string): boolean {
  return isMinor(type) && isOnHomeSquare(type, color, square);
}

export interface Minor { type: MinorType; square: Square }

function minors(chess: Chess, color: Color): Minor[] {
  const out: Minor[] = [];
  for (const row of chess.board()) for (const cell of row) {
    if (cell && cell.color === color && isMinor(cell.type)) out.push({ type: cell.type, square: cell.square });
  }
  return out;
}

/** `color`'s knights and bishops still on their starting squares. */
export function minorsAtHome(chess: Chess, color: Color): Minor[] {
  return minors(chess, color).filter((m) => isMinorAtHome(m.type, color, m.square));
}

export function homeMinorCount(chess: Chess, color: Color): number {
  return minorsAtHome(chess, color).length;
}

export function developedMinorCount(chess: Chess, color: Color): number {
  return minors(chess, color).filter((m) => !isMinorAtHome(m.type, color, m.square)).length;
}

export function totalMinorCount(chess: Chess, color: Color): number {
  return minors(chess, color).length;
}
