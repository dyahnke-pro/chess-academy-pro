/**
 * LITE LEGAL MOVES — chess.js's own legal move generator, without the notation.
 *
 * Every public chess.js call that hands back a move builds a `Move` object, and
 * a `Move` writes its SAN (it regenerates EVERY legal move on the board for
 * disambiguation, then makes the move to test check and mate) and two FENs.
 * `moves({ verbose: true })` does that for every candidate; `move()` and even
 * `undo()` do it once each for their return values. A caller that reads only
 * from / to / piece / captured pays all of it for nothing.
 *
 * The exchange counter (`seeCaptureValue`) does exactly that, and every tactic
 * computer calls it inside its loops — the stall probe of 2026-10-21 found it
 * at the bottom of nearly every stack of the multi-second Learn freeze on
 * David's record (`scripts/audit-lib/stall-probe.mjs`).
 *
 * This reads chess.js's internal generator the way chess.js's own `Move` class
 * does (`chess['_moves']`, `['_makeMove']`, `['_undoMove']`). chess.js is
 * pinned at exactly 1.4.0; `liteMoves.test.ts` fails the build if an upgrade
 * changes those internals, and proves the lite list equals the verbose list
 * on thousands of real positions. `makeLite` / `undoLite` change the board
 * exactly as `move()` / `undo()` do, position counts included.
 */
import type { Chess, Color, PieceSymbol, Square } from 'chess.js';

/** chess.js 1.4.0's internal move (0x88 squares). */
interface InternalMove {
  color: Color;
  from: number;
  to: number;
  piece: PieceSymbol;
  captured?: PieceSymbol;
  promotion?: PieceSymbol;
  flags: number;
}

interface ChessInternals {
  _moves(opts: { legal?: boolean; square?: Square; piece?: PieceSymbol }): InternalMove[];
  _makeMove(move: InternalMove): void;
  _undoMove(): InternalMove | null;
  _incPositionCount(): void;
  _decPositionCount(hash: bigint): void;
  _hash: bigint;
}

function internals(chess: Chess): ChessInternals {
  return chess as unknown as ChessInternals;
}

/** A legal move with the fields a computer reads — no SAN, no FENs. */
export interface LiteMove {
  color: Color;
  from: Square;
  to: Square;
  piece: PieceSymbol;
  captured?: PieceSymbol;
  promotion?: PieceSymbol;
  /** chess.js's own move, for `makeLite`. */
  readonly internal: unknown;
}

const FILES = 'abcdefgh';

/** A 0x88 index as a square name. */
function algebraic(sq: number): Square {
  return `${FILES[sq & 0xf]}${8 - (sq >> 4)}` as Square;
}

/** The legal moves on `chess` (the side to move), optionally from one square —
 *  the same list, in the same order, as `chess.moves({ verbose: true })`. */
export function liteMoves(chess: Chess, opts: { square?: Square } = {}): LiteMove[] {
  return internals(chess)._moves({ legal: true, square: opts.square }).map((m) => ({
    color: m.color,
    from: algebraic(m.from),
    to: algebraic(m.to),
    piece: m.piece,
    ...(m.captured ? { captured: m.captured } : {}),
    ...(m.promotion ? { promotion: m.promotion } : {}),
    internal: m,
  }));
}

/** Play `move` on `chess` — the board after is the board `chess.move()` leaves. */
export function makeLite(chess: Chess, move: LiteMove): void {
  const c = internals(chess);
  c._makeMove(move.internal as InternalMove);
  c._incPositionCount();
}

/** Take back the last move — the board after is the board `chess.undo()` leaves. */
export function undoLite(chess: Chess): void {
  const c = internals(chess);
  const hash = c._hash;
  if (c._undoMove()) c._decPositionCount(hash);
}
