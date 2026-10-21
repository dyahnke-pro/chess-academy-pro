/**
 * The small board helpers every pattern check shares (WO-CAMPAIGN-MASTER,
 * Lane D). Pure: chess.js only.
 */
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import type { PatternDefinition } from '../missionCard';
import { CAPTURE_VALUE } from '../../services/pieceValues';

/** A pattern's check plus the reads the miner needs. `nearMisses` names every
 *  way this board is the pattern with exactly ONE condition missing (sorted,
 *  unique); empty when the pattern is present or two or more are missing. The
 *  names are the module's own and its header defines each one. */
export interface PatternProbe extends PatternDefinition {
  nearMisses: (fen: string, side: Color) => readonly string[];
  /** Every name `nearMisses` (and `nearMissesAfter`) can return. */
  nearMissCodes: readonly string[];
  /** A pattern whose truth depends on the move that made the board reads it
   *  here, given that move (free-piece: a piece that just captured and is
   *  taken back is an exchange, not a gift). Absent → `present` on the board.
   *  `present(fen)` alone answers from the board only and is never looser. */
  presentAfter?: (fen: string, last: LastMove, side: Color) => boolean;
  nearMissesAfter?: (fen: string, last: LastMove, side: Color) => readonly string[];
}

/** The move that produced a board: where it landed and what it took. */
export interface LastMove {
  to: Square;
  captured?: PieceSymbol;
}

/** Piece values for pricing captures; the king only ever means "more than
 *  anything" (the same table `pinGeometry` and `tacticsDetector` price with). */
/** Exchange worth (the king counts as never capturable): the app's one table. */
export const VALUE = CAPTURE_VALUE;

export function load(fen: string): Chess | null {
  try { return new Chess(fen); } catch { return null; }
}

export function other(c: Color): Color {
  return c === 'w' ? 'b' : 'w';
}

/** `fen` with `color` to move and the en-passant square cleared, whatever the
 *  check state — the reading every attack scan in the app takes
 *  (`tacticsDetector.getAttackedSquares`). Not a legality claim. */
export function turnedTo(fen: string, color: Color): Chess | null {
  const parts = fen.split(' ');
  parts[1] = color;
  parts[3] = '-';
  return load(parts.join(' '));
}

export interface Placed { square: Square; type: PieceSymbol; color: Color }

export function pieces(board: Chess): Placed[] {
  const out: Placed[] = [];
  for (const row of board.board()) for (const cell of row) {
    if (cell) out.push({ square: cell.square, type: cell.type, color: cell.color });
  }
  return out;
}

export function kingSquare(board: Chess, color: Color): Square | null {
  return pieces(board).find((p) => p.type === 'k' && p.color === color)?.square ?? null;
}

/** The board after a legal move, or null. */
export function afterMove(board: Chess, move: { from: string; to: string; promotion?: string }): Chess | null {
  const next = load(board.fen());
  if (!next) return null;
  try { next.move(move); return next; } catch { return null; }
}

/** The side's home rank: 1 for White, 8 for Black. */
export function homeRank(color: Color): number {
  return color === 'w' ? 1 : 8;
}

export const fileOf = (sq: Square): number => sq.charCodeAt(0) - 97;
export const rankOf = (sq: Square): number => Number(sq[1]);

/** The eight squares around `sq` that exist on the board. */
export function neighbours(sq: Square): Square[] {
  const out: Square[] = [];
  const f = fileOf(sq);
  const r = rankOf(sq);
  for (const df of [-1, 0, 1]) for (const dr of [-1, 0, 1]) {
    if (df === 0 && dr === 0) continue;
    const nf = f + df;
    const nr = r + dr;
    if (nf >= 0 && nf <= 7 && nr >= 1 && nr <= 8) out.push(`${String.fromCharCode(97 + nf)}${nr}` as Square);
  }
  return out;
}

/** Sorted, unique — every `nearMisses` answer goes through this. */
export function codes(list: readonly string[]): string[] {
  return [...new Set(list)].sort();
}

const KNIGHT_JUMPS: ReadonlyArray<readonly [number, number]> = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];

/** The squares a knight on `sq` jumps to. */
export function knightJumps(sq: Square): Square[] {
  const out: Square[] = [];
  const f = fileOf(sq);
  const r = rankOf(sq);
  for (const [df, dr] of KNIGHT_JUMPS) {
    const nf = f + df;
    const nr = r + dr;
    if (nf >= 0 && nf <= 7 && nr >= 1 && nr <= 8) out.push(`${String.fromCharCode(97 + nf)}${nr}` as Square);
  }
  return out;
}

/** A tiny memo for reads a caller asks twice of one board (the miner asks
 *  `present` and then `nearMisses`). Bounded; oldest out first. */
export function memo<T>(size: number): (key: string, compute: () => T) => T {
  const cache = new Map<string, T>();
  return (key, compute) => {
    if (cache.has(key)) return cache.get(key) as T;
    const value = compute();
    if (cache.size >= size) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(key, value);
    return value;
  };
}

/** A board a game can stand on: chess.js loads it, one king each, no pawn on
 *  the first or last rank, and the side NOT to move is not in check. Every
 *  fixture and mined board passes this. */
export function isLegalBoard(fen: string): boolean {
  const board = load(fen);
  if (!board) return false;
  const all = pieces(board);
  if (all.filter((p) => p.type === 'k' && p.color === 'w').length !== 1) return false;
  if (all.filter((p) => p.type === 'k' && p.color === 'b').length !== 1) return false;
  if (all.some((p) => p.type === 'p' && (rankOf(p.square) === 1 || rankOf(p.square) === 8))) return false;
  const waiting = turnedTo(fen, other(board.turn()));
  return !!waiting && !waiting.inCheck();
}
