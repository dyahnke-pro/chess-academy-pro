/**
 * PATTERN · FREE PIECE — a knight, bishop or rook the side can win outright.
 * The board Level 1's middlegame shot ends on (`earnedSlip`) and its check
 * judges (`checks/freePieceStayAhead`), read with the same measure: the legal SEE.
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
 *      enemy were it their move (legal SEE > 0) — the slip's own guard
 *      (`earnedSlip.midExchange`). A piece left en prise while the
 *      enemy holds a capture or an attack of its own is a trade in progress,
 *      not a gift: an in-between move, a counter-attack on your queen, a
 *      desperado. Without this clause 248 of the first 310 mined games
 *      "had a free piece", master games included.
 *   5. TAKING IT HOLDS: after `side` takes it (the cheapest legal capture),
 *      the enemy has no mate in one and no pawn to queen, and nothing it then
 *      wins back elsewhere
 *      (legal SEE) drops `side` below the lead bar — the card's own
 *      `gave-back-material` rule, one move deep. This is what turns down a
 *      poisoned piece (Fischer–Spassky, game 6, 16.O-O: …axb5 opens the
 *      a-file and Qxa8 takes the rook) and most master "sacrifices" (Bxh6
 *      gxh6 Qxh6 wins the pawn back).
 * From the board alone (`present`) the last move is unknown, so a board whose
 * last move was a capture or a pawn move (half-move clock 0) reads FALSE —
 * never looser than `presentAfter`. Callers that hold the move use
 * `patternAfterMove` (index.ts).
 * NOT counted: a hanging pawn; a hanging queen (the plant never offers the
 * queen, and a queen en prise is its own lesson); a piece the exchange wins
 * less than 3 on (a rook defended by a pawn, taken by a bishop, nets 2).
 * THE LIMIT of a pure check: one move deep. A sacrifice whose payment comes
 * later (a mating attack, a promotion race) still reads free; the slip
 * confirms its shot with the engine (`earnedSlip.findEarnedSlip`), this
 * check cannot, and says so.
 *
 * NEAR MISSES (one condition short):
 *   `guarded`         — `side` to move, an enemy N/B/R it can legally capture,
 *                       but no capture nets 3 (the piece is defended);
 *   `recapture`       — (given the move) `side` nets 3 on a piece, but the
 *                       enemy's last move captured enough that, counted
 *                       whole, `side` ends up less than 2 ahead;
 *   `mid-exchange`    — `side` to move nets 3 on a piece, but the enemy has
 *                       something of `side`'s to win too;
 *   `poisoned`        — the piece nets 3 and nothing is mid-exchange, but
 *                       taking it does not hold (mate in one, a pawn queens,
 *                       or the enemy wins enough back);
 *   `not-their-move`  — an enemy N/B/R that would net 3 and nothing of
 *                       `side`'s hangs, but it is the enemy's move (they save
 *                       it first).
 */
import type { Color, Square } from 'chess.js';
import { asIfToMove, legalSeeGainFor } from '../../services/positionReadingService';
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

const turn = (fen: string): string => fen.split(' ')[1];
const halfmoveClock = (fen: string): number => Number(fen.split(' ')[4] ?? '0');

/** Clause 5: `side` takes on `square` with its cheapest legal capturer (as if
 *  it were its move); the enemy then has no mate in one and no promotion, and the most it
 *  wins back on any other square (legal SEE — the square taken on is already
 *  in `net`) leaves `side` at least `LEAD_BAR` ahead. */
export function takingHolds(fen: string, side: Color, square: Square, net: number): boolean {
  const asIf = asIfToMove(fen, side);
  const board = asIf ? load(asIf) : null;
  if (!board) return false;
  const capture = board.moves({ verbose: true })
    .filter((m) => m.to === square && !!m.captured)
    .sort((a, b) => VALUE[a.piece] - VALUE[b.piece] || (a.from < b.from ? -1 : 1))
    .at(0);
  if (!capture) return false;
  board.move(capture);
  // A mate in one, or a pawn that queens next move, is a payment the SEE never sees.
  if (board.moves({ verbose: true }).some((m) => m.san.includes('#') || !!m.promotion)) return false;
  const after = board.fen();
  const enemy = other(side);
  const winBack = pieces(board)
    .filter((p) => p.color === side && p.type !== 'k' && p.square !== square && board.attackers(p.square, enemy).length > 0)
    .reduce((most, p) => Math.max(most, legalSeeGainFor(after, p.square, enemy)), 0);
  return net - winBack >= LEAD_BAR;
}

interface FreeRead {
  /** Pieces the SEE alone nets 3 on. */
  raw: Square[];
  /** …that still leave `side` 2 ahead once the last move's capture is paid. */
  settled: Square[];
  /** …and taking them holds (clause 5). */
  held: Square[];
}

const freeReads = memo<FreeRead>(64);

function readFree(fen: string, side: Color, last: LastMove | null): FreeRead {
  const took = last?.captured ? VALUE[last.captured] : 0;
  return freeReads(`${fen}|${side}|${last?.to ?? '-'}|${last?.captured ?? '-'}`, () => {
    const raw = gains(fen, side).filter(({ gain }) => gain >= FREE_GAIN);
    const settled = raw.filter(({ gain }) => gain - took >= LEAD_BAR);
    return {
      raw: raw.map(({ square }) => square),
      settled: settled.map(({ square }) => square),
      held: settled.filter(({ square, gain }) => takingHolds(fen, side, square, gain - took)).map(({ square }) => square),
    };
  });
}

/** The squares `side` wins a free piece on: clauses 2, 3 and 5. */
export function freeSquares(fen: string, side: Color, last: LastMove | null): Square[] {
  return readFree(fen, side, last).held;
}

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

/** Exactly one of clauses 2–5 missing, `side` to move. `last` null = the
 *  board alone (a capture or pawn move just made: no verdict). */
function oneShort(fen: string, side: Color, last: LastMove | null): readonly string[] {
  const r = readFree(fen, side, last);
  // From the board alone, a capture or pawn move just made leaves any piece
  // the SEE nets 3 on unjudged (it may be a recapture).
  if (!last && halfmoveClock(fen) === 0 && r.raw.length > 0) return [];
  const mid = midExchange(fen, side);
  if (r.held.length > 0) return mid ? ['mid-exchange'] : [];
  if (mid) return [];
  if (r.settled.length > 0) return ['poisoned'];
  if (r.raw.length > 0) {
    // Only the last capture's price is missing: taking would otherwise hold.
    const holds = gains(fen, side).some(({ square, gain }) => gain >= FREE_GAIN && takingHolds(fen, side, square, gain));
    return last?.captured && holds ? codes(['recapture']) : [];
  }
  return guarded(fen, side) ? ['guarded'] : [];
}

function nearMisses(fen: string, side: Color): readonly string[] {
  if (turn(fen) !== side) return notTheirMove(fen, side);
  return present(fen, side) ? [] : oneShort(fen, side, null);
}

function nearMissesAfter(fen: string, last: LastMove, side: Color): readonly string[] {
  if (turn(fen) !== side) return notTheirMove(fen, side);
  return presentAfter(fen, last, side) ? [] : oneShort(fen, side, last);
}

export const FREE_PIECE: PatternProbe = {
  id: 'free-piece',
  present,
  presentAfter,
  nearMisses,
  nearMissesAfter,
  nearMissCodes: ['guarded', 'mid-exchange', 'not-their-move', 'poisoned', 'recapture'],
  failTwins: [
    'rnbqr1k1/ppp2ppp/1b1p1n2/3P2B1/2BNP3/2N5/PP3PPP/R2Q1RK1 b - - 2 11',
    'r1bqkb1r/pp2pp1p/2np1np1/8/3NP3/3BB3/PPP2PPP/RN1Q1RK1 b kq - 3 7',
    'r2k3r/1pp2Q2/pb1pbRB1/8/8/2N5/PP4PP/7K w - - 0 27',
    'Q7/8/1k6/3b4/8/5B2/6PK/8 w - - 0 53',
    'rn1qr1k1/ppp2ppp/1b1pbn2/6B1/2BPP3/2N2N2/PP3PPP/R2Q1RK1 w - - 5 10',
    'r1bqkb1r/pp2pp1p/2np1np1/8/3NP3/3B4/PPP2PPP/RNBQ1RK1 w kq - 2 7',
    '6r1/p3R3/1p6/2pB2p1/2Pb1k2/PK6/7p/8 w - - 0 45',
    'rn1q1rk1/ppp1bppp/8/4p2b/2B1N3/2NP1P2/PPn3QP/R1B1K1R1 w Q - 0 13',
    'r2qkbr1/pp2pp1p/3p1np1/8/3nP1b1/2NBB3/PPPQ1PPP/R4RK1 w q - 0 10',
    '1r4k1/pp3p1p/6p1/2pB4/2P2PR1/8/Pb3P2/4rK2 w - - 0 28',
  ],
};
