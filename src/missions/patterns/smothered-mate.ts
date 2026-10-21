/**
 * PATTERN · SMOTHERED MATE — the side has a knight mate on a king walled in
 * by its own pieces.
 *
 * Named by the app's mate classifier (`matePatterns.classifyMatePattern`),
 * whose first rule is this one: a knight gives the only check and EVERY
 * square around the king holds one of the king's own pieces. One vocabulary
 * with the coach that names a delivered mate.
 *
 * PRESENT for `side` when ALL hold:
 *   1. it is `side`'s move;
 *   2. a legal KNIGHT move to a square a knight's jump from the enemy king is
 *      checkmate;
 *   3. the classifier names that mate `smothered-mate`.
 *
 * NEAR MISSES (one condition short):
 *   `knight-taken`    — such a knight move gives the only check and every
 *                       square around the king is its own piece, but it is
 *                       not mate (the knight can be captured);
 *   `flight-covered`  — such a knight move mates with the only check, but a
 *                       square around the king is empty or enemy-held and
 *                       merely covered — a knight mate, not a smothered one;
 *   `not-their-move`  — the smothered mate exists, but it is the enemy's move.
 */
import type { Chess, Color } from 'chess.js';
import { classifyMatePattern } from '../../services/matePatterns';
import { asIfToMove } from '../../services/positionReadingService';
import { codes, kingSquare, knightJumps, load, memo, neighbours, other, pieces, type PatternProbe } from './board';

/** Every square around the enemy king holds one of the king's own pieces. */
function walledIn(board: Chess, side: Color): boolean {
  const enemy = other(side);
  const k = kingSquare(board, enemy);
  return !!k && neighbours(k).every((sq) => board.get(sq)?.color === enemy);
}

/** The knight just moved gives the ONLY check. */
function loneKnightCheck(after: Chess, side: Color): boolean {
  if (!after.inCheck()) return false;
  const k = kingSquare(after, other(side));
  if (!k) return false;
  const checkers = after.attackers(k, side);
  return checkers.length === 1 && after.get(checkers[0])?.type === 'n';
}

interface Read { smothered: boolean; knightTaken: boolean; flightCovered: boolean }

const reads = memo<Read>(64);

function read(fen: string, side: Color): Read {
  return reads(`${fen}|${side}`, () => {
    const out: Read = { smothered: false, knightTaken: false, flightCovered: false };
    const board = load(fen);
    if (!board || board.turn() !== side) return out;
    const k = kingSquare(board, other(side));
    if (!k) return out;
    const checkSquares = new Set(knightJumps(k));
    for (const knight of pieces(board).filter((p) => p.color === side && p.type === 'n')) {
      for (const m of board.moves({ square: knight.square, verbose: true })) {
        if (!checkSquares.has(m.to)) continue;
        board.move(m);
        if (loneKnightCheck(board, side)) {
          if (board.isCheckmate()) {
            if (classifyMatePattern(board.fen())?.id === 'smothered-mate') out.smothered = true;
            else if (!walledIn(board, side)) out.flightCovered = true;
          } else if (walledIn(board, side)) {
            out.knightTaken = true;
          }
        }
        board.undo();
      }
    }
    return out;
  });
}

function present(fen: string, side: Color): boolean {
  return read(fen, side).smothered;
}

function nearMisses(fen: string, side: Color): readonly string[] {
  if (fen.split(' ')[1] !== side) {
    const asIf = asIfToMove(fen, side);
    return asIf && present(asIf, side) ? ['not-their-move'] : [];
  }
  const r = read(fen, side);
  if (r.smothered) return [];
  return codes([...(r.knightTaken ? ['knight-taken'] : []), ...(r.flightCovered ? ['flight-covered'] : [])]);
}

export const SMOTHERED_MATE: PatternProbe = {
  id: 'smothered-mate',
  present,
  nearMisses,
  nearMissCodes: ['flight-covered', 'knight-taken', 'not-their-move'],
  failTwins: [
    'Qq1r1b1r/p1kn2pp/B2p4/2p1p1PP/1p6/2B1N3/PPP2P2/R3K1R1 w Q - 4 21',
    '2b5/R5p1/pr1k1n1p/1p1PN2P/1P1K4/5BP1/1P6/8 w - - 13 61',
    '1k1r3r/pp3p2/2nN2p1/3p3n/8/2P2P1q/PPB3QP/R4RBK b - - 0 25',
    'r2qkb1r/1b1npp2/p2p1n1p/1pp2N1P/3PPB2/2N5/PPPQ2P1/R3KB1R w KQkq - 2 14',
    'r1bqkb1r/3pnppp/p1p1p3/4P3/4N3/8/PPP2PPP/R1BQKB1R b KQkq - 2 8',
    '5Qnk/6pp/p2p4/1p2p1N1/4P2P/8/3P1PPK/2Bq4 b - - 5 26',
  ],
};
