/**
 * PATTERN · KING AND ROOK AGAINST KING — the ending the box method mates in
 * (Level 2's endgame card). It is the BOARD the card wants to reach, not the
 * technique: whether the student shrinks the box is the card's check.
 *
 * PRESENT for `side` (whoever is to move) when ALL hold:
 *   1. the board holds exactly `side`'s king and ONE rook, and the enemy's
 *      lone king — nothing else;
 *   2. the game is not over (no mate yet, no stalemate);
 *   3. the rook is safe: it is `side`'s move, or the enemy king does not
 *      touch the rook, or `side`'s king guards it.
 * NOT counted: K+Q v K, K+R v K with any pawn left, two rooks.
 *
 * NEAR MISSES (one condition short):
 *   `extra-material`  — clauses 2 and 3 hold but ONE more unit (a pawn or a
 *                       piece, either side) is still on the board;
 *   `stalemate`       — exactly K+R v K, the enemy to move, and stalemated;
 *   `rook-hangs`      — exactly K+R v K, the enemy to move, its king next to
 *                       the rook and the rook unguarded.
 */
import type { Chess, Color } from 'chess.js';
import { codes, kingSquare, load, other, pieces, type Placed, type PatternProbe } from './board';

/** The non-king units on the board. */
function units(board: Chess): Placed[] {
  return pieces(board).filter((p) => p.type !== 'k');
}

function rookSafe(board: Chess, side: Color, rook: Placed): boolean {
  if (board.turn() === side) return true;
  const enemyKing = kingSquare(board, other(side));
  if (!enemyKing || !board.attackers(rook.square, other(side)).includes(enemyKing)) return true;
  return board.attackers(rook.square, side).length > 0;
}

/** Mate or stalemate on the board — the ending is over. */
function over(board: Chess): boolean {
  return board.isCheckmate() || board.isStalemate();
}

function bareRook(board: Chess, side: Color): Placed | null {
  const u = units(board);
  return u.length === 1 && u[0].color === side && u[0].type === 'r' ? u[0] : null;
}

function present(fen: string, side: Color): boolean {
  const board = load(fen);
  if (!board) return false;
  const rook = bareRook(board, side);
  return !!rook && !over(board) && rookSafe(board, side, rook);
}

function nearMisses(fen: string, side: Color): readonly string[] {
  const board = load(fen);
  if (!board) return [];
  const rook = bareRook(board, side);
  if (rook) {
    if (board.isStalemate()) return ['stalemate'];
    if (!over(board) && !rookSafe(board, side, rook)) return ['rook-hangs'];
    return [];
  }
  const u = units(board);
  if (u.length !== 2 || over(board)) return [];
  const myRooks = u.filter((p) => p.color === side && p.type === 'r');
  // One more unit: which one is "the rook" — any of side's rooks that is safe.
  return myRooks.some((r) => rookSafe(board, side, r)) ? codes(['extra-material']) : [];
}

export const KR_BOX_MATE: PatternProbe = {
  id: 'kr-box-mate',
  present,
  nearMisses,
  nearMissCodes: ['extra-material', 'rook-hangs', 'stalemate'],
  failTwins: [
    '6rK/8/8/3k4/8/8/4R3/8 w - - 0 87',
    '8/5p2/2K5/4k3/8/7R/8/8 b - - 0 59',
    '1r6/2K5/8/2k5/8/8/8/8 w - - 0 59',
    '8/5K2/3k4/4R3/8/8/8/8 b - - 12 65',
    '7k/8/7K/6R1/8/8/8/8 b - - 44 89',
  ],
};
