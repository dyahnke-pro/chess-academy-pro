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
 *   3. an exchange the enemy STARTED is counted whole: whatever the enemy's
 *      last move captured — on that square or any other — comes off the gain,
 *      and what is left must still put `side` at least 2 ahead (the card's
 *      own lead bar, `freePieceStayAhead`). Taking back a knight that just
 *      took your knight nets 0; winning a knight after theirs took yours
 *      elsewhere nets 0 — a trade, not a gift (a plain SEE called 59 of 60
 *      master games "a free piece arose"). A rook lost after grabbing a pawn
 *      nets 4, a knight lost for a pawn nets 2: both count.
 *   4. NOT MID-EXCHANGE: nothing of `side`'s (king aside) can be won by the
 *      enemy were it their move (legal SEE > 0) — the plant's own guard
 *      (`plantFreePiece`'s `mid-exchange`). A piece left en prise while the
 *      enemy holds a capture or an attack of its own is a trade in progress,
 *      not a gift: an in-between move, a counter-attack on your queen, a
 *      desperado. Without this clause 248 of the first 310 mined games
 *      "had a free piece", master games included.
 * From the board alone (`present`) the last move is unknown, so a board whose
 * last move was a capture or a pawn move (half-move clock 0) reads FALSE —
 * never looser than `presentAfter`. Callers that hold the move use
 * `patternAfterMove` (index.ts).
 * NOT counted: a hanging pawn; a hanging queen (the plant never offers the
 * queen, and a queen en prise is its own lesson); a piece the exchange wins
 * less than 3 on (a rook defended by a pawn, taken by a bishop, nets 2).
 * THE LIMIT of a pure check: the SEE reads one square, so a piece whose
 * capture opens a line to something bigger (a poisoned piece — in Fischer–
 * Spassky game 6 …axb5 would open the a-file to Qxa8) or a deliberate
 * sacrifice still reads free. The plant confirms its gift with the engine
 * (`plantFreePiece.verifyPlants`); this check cannot, and says so.
 *
 * NEAR MISSES (one condition short):
 *   `guarded`         — `side` to move, an enemy N/B/R it can legally capture,
 *                       but no capture nets 3 (the piece is defended);
 *   `recapture`       — (given the move) `side` nets 3 on a piece, but the
 *                       enemy's last move captured enough that, counted
 *                       whole, `side` ends up less than 2 ahead;
 *   `mid-exchange`    — `side` to move nets 3 on a piece, but the enemy has
 *                       something of `side`'s to win too;
 *   `not-their-move`  — an enemy N/B/R that would net 3 and nothing of
 *                       `side`'s hangs, but it is the enemy's move (they save
 *                       it first).
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

/** What the card says `side` must end up ahead by (`freePieceStayAhead`). */
export const LEAD_BAR = 2;

/** The squares `side` wins a free piece on, the exchange the last move began
 *  counted whole. */
export function freeSquares(fen: string, side: Color, last: LastMove | null): Square[] {
  const took = last?.captured ? VALUE[last.captured] : 0;
  return gains(fen, side)
    .filter(({ gain }) => gain >= FREE_GAIN && gain - took >= LEAD_BAR)
    .map(({ square }) => square);
}

const turn = (fen: string): string => fen.split(' ')[1];
const halfmoveClock = (fen: string): number => Number(fen.split(' ')[4] ?? '0');

/** The enemy, were it their move, wins something of `side`'s (legal SEE > 0,
 *  the king aside) — an exchange is in progress. */
export function midExchange(fen: string, side: Color): boolean {
  const board = load(fen);
  if (!board) return false;
  const enemy = other(side);
  return pieces(board)
    .filter((p) => p.color === side && p.type !== 'k' && board.attackers(p.square, enemy).length > 0)
    .some((p) => legalSeeGainFor(fen, p.square, enemy) > 0);
}

function presentAfter(fen: string, last: LastMove, side: Color): boolean {
  return turn(fen) === side && freeSquares(fen, side, last).length > 0 && !midExchange(fen, side);
}

function present(fen: string, side: Color): boolean {
  // A quiet piece move made this board: nothing just captured, nothing to count.
  return turn(fen) === side && halfmoveClock(fen) > 0 && freeSquares(fen, side, null).length > 0 && !midExchange(fen, side);
}

function guarded(fen: string, side: Color): boolean {
  const board = load(fen);
  if (!board) return false;
  const targets = new Set(attackedPrizes(fen, side));
  return board.moves({ verbose: true }).some((m) => !!m.captured && targets.has(m.to));
}

function notTheirMove(fen: string, side: Color): readonly string[] {
  return freeSquares(fen, side, null).length > 0 && !midExchange(fen, side) ? ['not-their-move'] : [];
}

function nearMisses(fen: string, side: Color): readonly string[] {
  if (turn(fen) !== side) return notTheirMove(fen, side);
  if (present(fen, side)) return [];
  const mid = midExchange(fen, side);
  const free = freeSquares(fen, side, null).length > 0;
  // A free piece with a quiet last move but something of side's hanging.
  if (free) return halfmoveClock(fen) > 0 && mid ? ['mid-exchange'] : [];
  // Any piece netting 3 after a capture may be a recapture the board alone
  // cannot rule out: not a twin from the board alone.
  return !mid && guarded(fen, side) ? ['guarded'] : [];
}

function nearMissesAfter(fen: string, last: LastMove, side: Color): readonly string[] {
  if (turn(fen) !== side) return notTheirMove(fen, side);
  if (presentAfter(fen, last, side)) return [];
  const mid = midExchange(fen, side);
  if (freeSquares(fen, side, last).length > 0) return mid ? ['mid-exchange'] : [];
  if (mid) return [];
  // The SEE alone nets 3, but the capture the enemy just made pays for it.
  if (freeSquares(fen, side, null).length > 0) return last.captured ? codes(['recapture']) : [];
  return guarded(fen, side) ? ['guarded'] : [];
}

export const FREE_PIECE: PatternProbe = {
  id: 'free-piece',
  present,
  presentAfter,
  nearMisses,
  nearMissesAfter,
  nearMissCodes: ['guarded', 'mid-exchange', 'not-their-move', 'recapture'],
  failTwins: [
    'rnbqr1k1/ppp2ppp/1b1p1n2/3P2B1/2BNP3/2N5/PP3PPP/R2Q1RK1 b - - 2 11',
    'r1bqkb1r/pp2pp1p/2np1np1/8/3NP3/3BB3/PPP2PPP/RN1Q1RK1 b kq - 3 7',
    'r1b1r1k1/1pp1qpp1/pb1pNn2/3P2P1/2B5/2N5/PP4PP/R2Q1R1K b - - 0 17',
    '8/6k1/4b1p1/1B1rR2p/1P6/P6P/6PK/8 w - - 1 40',
    'rn1qr1k1/ppp2ppp/1b1pbn2/6B1/2BPP3/2N2N2/PP3PPP/R2Q1RK1 w - - 5 10',
    'r1bqkb1r/pp2pp1p/2np1np1/8/3NP3/3B4/PPP2PPP/RNBQ1RK1 w kq - 2 7',
    'r2qkbr1/pp2pp1p/3p1np1/8/3nP1b1/2NBB3/PPPQ1PPP/R4RK1 w q - 0 10',
    '1r4k1/pp3p1p/6p1/2pB4/2P2PR1/8/Pb3P2/4rK2 w - - 0 28',
  ],
};
