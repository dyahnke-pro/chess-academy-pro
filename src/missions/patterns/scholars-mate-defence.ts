/**
 * PATTERN · SCHOLAR'S MATE DEFENCE — the side must stop a queen mate on its
 * f-pawn square, and it is its move to do so.
 *
 * The side this pattern favours is the DEFENDER: the board poses the
 * question ("they threaten mate on f7 — stop it") and the student gets to
 * answer it. Mate is read by chess.js after the threatened move is played.
 *
 * PRESENT for `side` when ALL hold:
 *   1. it is `side`'s move, and `side` is not in check (the threat is the
 *      question, not a check already given);
 *   2. `side`'s king stands on its starting square (e1 / e8) — the opening
 *      trap, not a later mating attack;
 *   3. were it the enemy's move, an enemy QUEEN move to `side`'s f-pawn
 *      square (f2 for White, f7 for Black) would be CHECKMATE.
 * NOT counted: a queen check on f7 the king can answer (take the queen,
 *   step away); a mate on f7 delivered by another piece; a king that has
 *   already castled or moved.
 *
 * NEAR MISSES (one condition short):
 *   `not-mate`        — `side` to move, king at home, not in check, an enemy
 *                       queen move to the f-square gives check but not mate
 *                       (the queen arrives without support);
 *   `not-their-move`  — the mate threat stands, but it is the ENEMY's move —
 *                       nobody stopped it.
 */
import type { Color, Square } from 'chess.js';
import { afterMove, codes, kingSquare, load, other, pieces, turnedTo, type PatternProbe } from './board';

const HOME_KING: Record<Color, Square> = { w: 'e1', b: 'e8' };
const F_SQUARE: Record<Color, Square> = { w: 'f2', b: 'f7' };

interface Read { mate: boolean; checkOnly: boolean }

/** The enemy queen's arrivals on `side`'s f-square, read with the enemy to move. */
function queenArrival(fen: string, side: Color): Read {
  const out: Read = { mate: false, checkOnly: false };
  const board = load(fen);
  if (!board || kingSquare(board, side) !== HOME_KING[side]) return out;
  const attacker = other(side);
  const queens = pieces(board).filter((p) => p.color === attacker && p.type === 'q');
  if (queens.length === 0) return out;
  const asEnemy = board.turn() === attacker ? board : turnedTo(fen, attacker);
  if (!asEnemy) return out;
  for (const q of queens) {
    for (const m of asEnemy.moves({ square: q.square, verbose: true })) {
      if (m.to !== F_SQUARE[side]) continue;
      const after = afterMove(asEnemy, m);
      if (!after) continue;
      if (after.isCheckmate()) out.mate = true;
      else if (after.inCheck()) out.checkOnly = true;
    }
  }
  return out;
}

function defenderToMove(fen: string, side: Color): boolean {
  const board = load(fen);
  return !!board && board.turn() === side && !board.inCheck();
}

function present(fen: string, side: Color): boolean {
  return defenderToMove(fen, side) && queenArrival(fen, side).mate;
}

function nearMisses(fen: string, side: Color): readonly string[] {
  const board = load(fen);
  if (!board) return [];
  if (board.turn() !== side) return queenArrival(fen, side).mate ? ['not-their-move'] : [];
  if (!defenderToMove(fen, side)) return [];
  const r = queenArrival(fen, side);
  return !r.mate && r.checkOnly ? codes(['not-mate']) : [];
}

export const SCHOLARS_MATE_DEFENCE: PatternProbe = {
  id: 'scholars-mate-defence',
  present,
  nearMisses,
  nearMissCodes: ['not-mate', 'not-their-move'],
  failTwins: [
    'rnbqkb1r/ppp2ppp/8/3pP3/4n3/2N2Q2/PPPP2PP/R1B1KBNR b KQkq - 1 5',
    'rn1qkbnr/pp2pppp/2p5/3p4/4P3/2N2Q1P/PPPP1PP1/R1B1KB1R b KQkq - 0 5',
    '2bqk2r/5pp1/1pp1p3/3pP1N1/1b1Pn2P/2N2Q2/2PB1PP1/4K2R w Kk - 1 19',
    'r3kbr1/pp3p1R/5Q2/3Rp1B1/8/6n1/PPP5/1K6 w q - 0 23',
  ],
};
