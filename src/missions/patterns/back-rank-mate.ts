/**
 * PATTERN · BACK-RANK MATE — the side can mate on the enemy king's back rank.
 *
 * The mate is named by the app's own mate classifier
 * (`matePatterns.classifyMatePattern`) — the same computer the coach uses to
 * say "that's a back-rank mate" when one is delivered. Its rule: a rook or
 * queen gives the only check, along the king's HOME rank, with the king on
 * that rank, and every square around the king off that rank holds the king's
 * own piece. The classifier is first-match, most specific first, so a mate
 * that also fits a more specific name (an Opera mate — the rook guarded by a
 * bishop; a kill-box) is called by that name and does NOT count here: the
 * pattern library and the coach use one vocabulary.
 *
 * PRESENT for `side` when ALL hold:
 *   1. it is `side`'s move;
 *   2. one of its legal moves is checkmate;
 *   3. the classifier names that mate `back-rank-mate`.
 *
 * NEAR MISSES (one condition short):
 *   `escapes`         — `side` to move has a move giving the back-rank check
 *                       (a lone rook/queen checker on the home rank, the king
 *                       on it, every flight off the rank its own piece), but
 *                       the check is not mate (the checker is taken or
 *                       blocked) — the back rank is covered;
 *   `not-their-move`  — the mate exists, but it is the enemy's move.
 */
import type { Chess, Color } from 'chess.js';
import { classifyMatePattern } from '../../services/matePatterns';
import { asIfToMove } from '../../services/positionReadingService';
import { codes, homeRank, kingSquare, load, memo, neighbours, other, pieces, rankOf, type PatternProbe } from './board';

/** The enemy king on its home rank and every square around it off that rank
 *  held by its own piece. A move can only take an enemy piece away, never
 *  add one, so a board that fails this has no back-rank mate or check this
 *  move — the cheap gate before any move is generated. */
function walledOnRank(board: Chess, side: Color): boolean {
  const enemy = other(side);
  const k = kingSquare(board, enemy);
  if (!k || rankOf(k) !== homeRank(enemy)) return false;
  return neighbours(k).filter((sq) => rankOf(sq) !== homeRank(enemy)).every((sq) => board.get(sq)?.color === enemy);
}

/** The board after the move is a back-rank CHECK: the enemy king on its home
 *  rank, one checker — a rook or queen on that rank — and every flight off
 *  the rank held by the king's own piece. Says nothing about mate. */
function backRankCheck(after: Chess, side: Color): boolean {
  if (!after.inCheck() || !walledOnRank(after, side)) return false;
  const enemy = other(side);
  const k = kingSquare(after, enemy);
  if (!k) return false;
  const checkers = after.attackers(k, side);
  if (checkers.length !== 1) return false;
  const checker = after.get(checkers[0]);
  return !!checker && (checker.type === 'r' || checker.type === 'q') && rankOf(checkers[0]) === homeRank(enemy);
}

interface Read { mates: boolean; escapes: boolean }

const reads = memo<Read>(64);

function read(fen: string, side: Color): Read {
  return reads(`${fen}|${side}`, () => {
    const none = { mates: false, escapes: false };
    const board = load(fen);
    if (!board || board.turn() !== side || !walledOnRank(board, side)) return none;
    if (!pieces(board).some((p) => p.color === side && (p.type === 'r' || p.type === 'q'))) return none;
    let mates = false;
    let escapes = false;
    for (const m of board.moves({ verbose: true })) {
      if (!m.san.includes('#') && !m.san.includes('+')) continue;
      board.move(m);
      if (m.san.includes('#')) {
        if (classifyMatePattern(board.fen())?.id === 'back-rank-mate') mates = true;
      } else if (backRankCheck(board, side)) {
        escapes = true;
      }
      board.undo();
    }
    return { mates, escapes };
  });
}

function present(fen: string, side: Color): boolean {
  return read(fen, side).mates;
}

function nearMisses(fen: string, side: Color): readonly string[] {
  if (fen.split(' ')[1] !== side) {
    const asIf = asIfToMove(fen, side);
    return asIf && present(asIf, side) ? ['not-their-move'] : [];
  }
  const r = read(fen, side);
  return !r.mates && r.escapes ? codes(['escapes']) : [];
}

export const BACK_RANK_MATE: PatternProbe = {
  id: 'back-rank-mate',
  present,
  nearMisses,
  nearMissCodes: ['escapes', 'not-their-move'],
  failTwins: [
    '1r5k/r3q1pn/7p/p1p1PR2/2Bp4/1P5Q/P5PP/2R3K1 w - - 1 28',
    '2r1r3/3n1pk1/6bp/8/Np1q2P1/1P1n2P1/3Q2BP/1N1R1R1K b - - 2 32',
    '6k1/p4ppp/1pp1p3/q7/P3nP2/2P2QPP/2PR2B1/6K1 b - - 0 22',
    '5B1k/p4Qpp/1n6/8/8/1BnK1PPb/P6P/5r2 b - - 5 31',
  ],
};
