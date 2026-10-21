/**
 * PATTERN · FREE PIECE — a knight, bishop or rook the side can win outright.
 * The board Level 1's middlegame card plants (`plantFreePiece`) and judges
 * (`checks/freePieceStayAhead`), read with the same measure: the legal SEE.
 *
 * PRESENT for `side`, given the move that made the board (`presentAfter`),
 * when ALL hold:
 *   1. it is `side`'s move (an opportunity is one you can take now);
 *   2. an enemy KNIGHT, BISHOP or ROOK stands where `side` nets at least 3 by
 *      capturing it (`legalSeeGainFor` — pin- and legality-aware, recaptures
 *      counted, so a defended piece the trade cannot win is not free);
 *   3. an exchange the enemy STARTED is counted whole: when the enemy's last
 *      move captured on that very square, what it took comes off the gain.
 *      Taking back a knight that just took your knight nets 0, not 3 — a
 *      recapture is not a gift (the first cut called 59 of 60 master games
 *      "a free piece arose" for exactly this reason). A rook that grabbed a
 *      defended pawn and is lost for it still nets 4.
 * From the board alone (`present`) the last move is unknown, so a board whose
 * last move was a capture or a pawn move (half-move clock 0) reads FALSE —
 * never looser than `presentAfter`. Callers that hold the move use
 * `patternAfterMove` (index.ts).
 * NOT counted: a hanging pawn; a hanging queen (the plant never offers the
 * queen, and a queen en prise is its own lesson); a piece the exchange wins
 * less than 3 on (a rook defended by a pawn, taken by a bishop, nets 2).
 *
 * NEAR MISSES (one condition short):
 *   `guarded`         — `side` to move, an enemy N/B/R it can legally capture,
 *                       but no capture nets 3 (the piece is defended);
 *   `recapture`       — (given the move) the only N/B/R `side` nets 3 on just
 *                       captured there, and counted whole the exchange nets
 *                       less than 3;
 *   `not-their-move`  — an enemy N/B/R that would net 3, but it is the enemy's
 *                       move (they save it first).
 */
import type { Color, Square } from 'chess.js';
import { legalSeeGainFor } from '../../services/positionReadingService';
import { codes, load, memo, other, pieces, VALUE, type LastMove, type PatternProbe } from './board';

/** What taking it must net — the card's own bar. */
export const FREE_GAIN = 3;
const PRIZES = new Set(['n', 'b', 'r']);

/** Enemy N/B/R squares `side` attacks (a cheap superset of the capturable). */
function attackedPrizes(fen: string, side: Color): Square[] {
  const board = load(fen);
  if (!board) return [];
  const enemy = other(side);
  return pieces(board)
    .filter((p) => p.color === enemy && PRIZES.has(p.type))
    .filter((p) => board.attackers(p.square, side).length > 0)
    .map((p) => p.square);
}

/** Each attacked enemy N/B/R with what `side` nets by taking it (legal SEE,
 *  read as if it were `side`'s move). */
const gainReads = memo<Array<{ square: Square; gain: number }>>(64);

function gains(fen: string, side: Color): Array<{ square: Square; gain: number }> {
  return gainReads(`${fen}|${side}`, () => attackedPrizes(fen, side).map((square) => ({ square, gain: legalSeeGainFor(fen, square, side) })));
}

/** The squares `side` wins a free piece on, an exchange the last move began
 *  counted whole. */
export function freeSquares(fen: string, side: Color, last: LastMove | null): Square[] {
  return gains(fen, side)
    .filter(({ square, gain }) => gain - (last?.captured && last.to === square ? VALUE[last.captured] : 0) >= FREE_GAIN)
    .map(({ square }) => square);
}

const turn = (fen: string): string => fen.split(' ')[1];
const halfmoveClock = (fen: string): number => Number(fen.split(' ')[4] ?? '0');

function presentAfter(fen: string, last: LastMove, side: Color): boolean {
  return turn(fen) === side && freeSquares(fen, side, last).length > 0;
}

function present(fen: string, side: Color): boolean {
  // A quiet piece move made this board: nothing just captured, nothing to count.
  return turn(fen) === side && halfmoveClock(fen) > 0 && freeSquares(fen, side, null).length > 0;
}

function guarded(fen: string, side: Color): boolean {
  const board = load(fen);
  if (!board) return false;
  const targets = new Set(attackedPrizes(fen, side));
  return board.moves({ verbose: true }).some((m) => !!m.captured && targets.has(m.to));
}

function notTheirMove(fen: string, side: Color): readonly string[] {
  return freeSquares(fen, side, null).length > 0 ? ['not-their-move'] : [];
}

function nearMisses(fen: string, side: Color): readonly string[] {
  if (turn(fen) !== side) return notTheirMove(fen, side);
  // Any piece netting 3 here may be a recapture the board cannot rule out:
  // not a twin from the board alone.
  if (freeSquares(fen, side, null).length > 0) return [];
  return guarded(fen, side) ? ['guarded'] : [];
}

function nearMissesAfter(fen: string, last: LastMove, side: Color): readonly string[] {
  if (turn(fen) !== side) return notTheirMove(fen, side);
  if (presentAfter(fen, last, side)) return [];
  const raw = freeSquares(fen, side, null);
  if (raw.length > 0) return raw.every((sq) => sq === last.to) && !!last.captured ? codes(['recapture']) : [];
  return guarded(fen, side) ? ['guarded'] : [];
}

export const FREE_PIECE: PatternProbe = {
  id: 'free-piece',
  present,
  presentAfter,
  nearMisses,
  nearMissesAfter,
  nearMissCodes: ['guarded', 'not-their-move', 'recapture'],
  failTwins: [
    'rnbq1rk1/ppp1bppp/4pn2/3p2B1/2PP4/2N2N2/PP2PPPP/R2QKB1R w KQ - 5 6',
    'r1bqkbnr/1p1p1ppp/p1n1p3/8/3NP3/3B4/PPP2PPP/RNBQK2R w KQkq - 2 6',
    'rnbq1rk1/p1p1bpp1/1p2p2p/3n4/3P3B/2N1PN2/PP3PPP/R2QKB1R w KQ - 0 9',
    'rnbq1rk1/p1p1Bpp1/1p2p2p/3n4/3P4/2N1PN2/PP3PPP/R2QKB1R b KQ - 0 9',
    'r1bqkbnr/1p1p1ppp/p1N1p3/8/4P3/3B4/PPP2PPP/RNBQK2R b KQkq - 0 6',
  ],
};
