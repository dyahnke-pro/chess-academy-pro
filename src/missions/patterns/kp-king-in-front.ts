/**
 * PATTERN · KING AND PAWN AGAINST KING, KING IN FRONT — the ending Level 3's
 * "push the passed pawn (king in front)" card is played in: the king leads
 * its pawn. The board the card wants, not the technique (whether the student
 * keeps the king ahead and avoids stalemate is the card's check; the
 * opposition is Level 5's card).
 *
 * PRESENT for `side` (whoever is to move) when ALL hold:
 *   1. the board holds exactly `side`'s king and ONE pawn, and the enemy's
 *      lone king — nothing else;
 *   2. the king is IN FRONT of its pawn: on the pawn's file or a neighbouring
 *      one, one or two ranks nearer the queening rank than the pawn;
 *   3. the pawn is safe: it is `side`'s move, or the enemy king does not
 *      touch the pawn, or `side`'s king guards it;
 *   4. the game is not over (no stalemate).
 * NOT counted: the king beside or behind its pawn, or three or more ranks
 *   ahead; a second pawn; any other piece.
 *
 * NEAR MISSES (one condition short):
 *   `king-not-in-front` — exactly K+P v K, pawn safe, game on, king not on a
 *                         front square;
 *   `extra-material`    — clauses 2–4 hold for one of `side`'s pawns but ONE
 *                         more unit is on the board;
 *   `pawn-hangs`        — exactly K+P v K, king in front, the enemy to move
 *                         with its king on the unguarded pawn.
 * A stalemate with the king in front is not named: 9,512 real games (master,
 * pro, the student's and Lichess 2013) held none, and a twin must be a real
 * board. Clause 4 still rules it out.
 */
import type { Chess, Color } from 'chess.js';
import { codes, fileOf, kingSquare, load, other, pieces, rankOf, type Placed, type PatternProbe } from './board';

function units(board: Chess): Placed[] {
  return pieces(board).filter((p) => p.type !== 'k');
}

/** The king one or two ranks ahead of its pawn, on its file or a neighbour. */
export function kingInFront(board: Chess, side: Color, pawn: Placed): boolean {
  const k = kingSquare(board, side);
  if (!k) return false;
  const ahead = side === 'w' ? rankOf(k) - rankOf(pawn.square) : rankOf(pawn.square) - rankOf(k);
  return Math.abs(fileOf(k) - fileOf(pawn.square)) <= 1 && ahead >= 1 && ahead <= 2;
}

function pawnSafe(board: Chess, side: Color, pawn: Placed): boolean {
  if (board.turn() === side) return true;
  const enemyKing = kingSquare(board, other(side));
  if (!enemyKing || !board.attackers(pawn.square, other(side)).includes(enemyKing)) return true;
  return board.attackers(pawn.square, side).length > 0;
}

function barePawn(board: Chess, side: Color): Placed | null {
  const u = units(board);
  return u.length === 1 && u[0].color === side && u[0].type === 'p' ? u[0] : null;
}

function over(board: Chess): boolean {
  return board.isCheckmate() || board.isStalemate();
}

function present(fen: string, side: Color): boolean {
  const board = load(fen);
  if (!board) return false;
  const pawn = barePawn(board, side);
  return !!pawn && kingInFront(board, side, pawn) && pawnSafe(board, side, pawn) && !over(board);
}

function nearMisses(fen: string, side: Color): readonly string[] {
  const board = load(fen);
  if (!board) return [];
  const pawn = barePawn(board, side);
  if (pawn) {
    if (over(board)) return [];
    const failed = [!kingInFront(board, side, pawn) && 'king-not-in-front', !pawnSafe(board, side, pawn) && 'pawn-hangs']
      .filter((x): x is string => !!x);
    return failed.length === 1 ? codes(failed) : [];
  }
  const u = units(board);
  if (u.length !== 2 || over(board)) return [];
  const leads = u.filter((p) => p.color === side && p.type === 'p')
    .some((p) => kingInFront(board, side, p) && pawnSafe(board, side, p));
  return leads ? codes(['extra-material']) : [];
}

export const KP_KING_IN_FRONT: PatternProbe = {
  id: 'kp-king-in-front',
  present,
  nearMisses,
  nearMissCodes: ['extra-material', 'king-not-in-front', 'pawn-hangs'],
  failTwins: [
    '8/5p2/2K5/4k3/8/7R/8/8 b - - 0 59',
    '8/8/4n3/6pK/5k2/8/8/8 w - - 12 71',
    '8/8/8/5KP1/8/8/6k1/8 w - - 0 65',
    '8/8/1K6/8/8/8/pk6/8 w - - 0 97',
    '8/8/8/1K6/8/Pk6/8/8 b - - 0 58',
    '8/8/4pK2/8/3k4/8/8/8 w - - 0 47',
  ],
};
