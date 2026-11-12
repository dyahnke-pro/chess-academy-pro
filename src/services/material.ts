/**
 * ⚖️ THE MATERIAL COMPUTER — the one place a count of material is made
 * (WO-MATERIAL-01, David 2026-10-02: "You said that before. Check the root
 * cause").
 *
 * The walks found one false sentence five times in a day — "you're behind in
 * material" a ply into a recapture, "gxf6 wins a knight" of a recapture, "their
 * queen for your pawn" of a queen trade, "win a rook" a line later given back —
 * and each fix patched ONE counter. The census found 57 private value tables,
 * ~25 counters and ~12 exchange calculators, none of which knew two things:
 *
 *   1. whether the board is MID-EXCHANGE (after Nxf6+ the knight sits on f6
 *      for one ply, so a raw count calls the side about to retake "a piece
 *      down");
 *   2. the MOVE THAT LED HERE — the only way to tell a recapture from a free
 *      piece. A FEN alone cannot.
 *
 * So the count a sentence rests on is SETTLED, and settling takes the last move
 * as a REQUIRED argument: a caller that has none passes `null` and gets the raw
 * count, on purpose, in writing — never by forgetting.
 */
import { Chess, type Color, type Square } from 'chess.js';
import { CAPTURE_VALUE, MATERIAL_VALUE, materialBalance } from './pieceValues';
import { legalSeeGainFor, seeReadsStanding } from './positionReadingService';

/** The move that produced the board being counted: where it landed and
 *  whether it captured. A non-capture settles nothing. */
export interface LastMove { to: string; captured?: string | null }

const sideToMove = (fen: string): Color => (fen.split(' ')[1] === 'b' ? 'b' : 'w');

/**
 * WHITE minus BLACK, in pawns, with the exchange the last capture started
 * played out: the side to move retakes on that square as far as the LEGAL
 * static exchange says it profits (pins honoured, a losing recapture not
 * made). After Nxf6+ (Black to move, Bxf6 available) the board is level, not
 * "White a knight up"; after a free capture nothing can be won back and the
 * raw count stands.
 */
export function settledBalance(fen: string, lastMove: LastMove | null): number {
  const raw = materialBalance(fen);
  if (!lastMove || !lastMove.captured) return raw;
  const mover = sideToMove(fen);
  const back = Math.max(0, legalSeeGainFor(fen, lastMove.to as Square, mover));
  return mover === 'w' ? raw + back : raw - back;
}

/**
 * WHITE minus BLACK once the side to move cashes its BEST legal capture
 * anywhere on the board (legal SEE, stand-pat). Needs no last move: a
 * recapture still to come is just one of the captures the side to move has.
 * Walk oct3a, 9.bxc3: "You are down material now" with …exd4 regaining the
 * knight on d4 — not the square the last move captured on, so the last-move
 * settle could not see it.
 */
export function quietBalance(fen: string): number {
  const raw = materialBalance(fen);
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return raw; }
  const mover = chess.turn();
  let best = 0;
  for (const row of chess.board()) for (const p of row) {
    if (!p || p.color === mover || p.type === 'k') continue;
    const g = legalSeeGainFor(fen, p.square, mover);
    if (g > best) best = g;
  }
  return mover === 'w' ? raw + best : raw - best;
}

/** The settled lead for `color` — positive when `color` is ahead. */
export function settledLeadFor(fen: string, color: Color, lastMove: LastMove | null): number {
  const b = settledBalance(fen, lastMove);
  return (color === 'w' ? b : -b) || 0;
}

/** The last move of `chess` as a `LastMove`, or null on a fresh board. */
export function lastMoveOf(chess: Chess): LastMove | null {
  const m = chess.history({ verbose: true }).at(-1);
  return m ? { to: m.to, captured: m.captured ?? null } : null;
}

/** The `LastMove` of a UCI move played from `fenBefore` (en passant counts
 *  as a capture). Null when the move cannot be read. */
export function lastMoveFromUci(fenBefore: string, uci: string): LastMove | null {
  try {
    const c = new Chess(fenBefore);
    const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    return { to: m.to, captured: m.captured ?? null };
  } catch { return null; }
}

/**
 * What a capture NETS the mover once the square is fought over: the piece
 * taken, minus what the opponent then wins back by the LEGAL static exchange
 * (pins honoured, a losing recapture not made — stand-pat on both sides).
 * Null when `san` is not a legal capture from `fenBefore`.
 */
export function captureNet(fenBefore: string, san: string): number | null {
  try {
    const c = new Chess(fenBefore);
    const m = c.move(san);
    if (!m.captured) return null;
    const opp: Color = m.color === 'w' ? 'b' : 'w';
    return pieceWorth(m.captured) - Math.max(0, legalSeeGainFor(c.fen(), m.to, opp));
  } catch { return null; }
}

/**
 * THE BOARD ONCE THE EXCHANGE A MOVE STARTED IS OVER — the one answer to "what
 * does this move net, does its piece stay, and what is the structure then"
 * (task 172, 2026-11-11: seven writers read every fact the teaching computers
 * hand the lesson composer and found some fifty that read the board ONE move
 * after a capture — "exd4 leaves you doubled pawns on d6" with Nxd4 next,
 * "…Bxf1 goes after their pawn on g2" with Kxf1 next, "bxa6 creates a passed
 * pawn on a6" with …Bxa6 next, "Nxe4 gets them a knight for the pawn you
 * took" with Qxe4 next).
 *
 * After the move, each side in turn takes on the move's square with its
 * cheapest legal capturer for as long as the LEGAL static exchange says taking
 * profits it (pins honoured, a losing capture not made — the same stand-pat
 * count `captureNet` and `settledBalance` use). Where that stops is the quiet
 * end: the board a claim about material, structure or what a piece does from
 * its square has to be true on.
 */
export interface ExchangeEnd {
  /** The board at the quiet end — the board right after the move when nothing
   *  takes back. */
  fen: string;
  /** The captures on the square after the move, in order (SAN), the other
   *  side's first. Empty: the exchange is over with the move itself. */
  sans: string[];
  /** The mover's piece stands on the move's square at the quiet end (the piece
   *  that moved there, or one of the mover's that took back onto it). */
  holds: boolean;
  /** The piece that MOVED is still the one standing there: nothing took it. */
  pieceStays: boolean;
  /** What the mover nets over the whole exchange, in pawns: what the move took
   *  (0 for a quiet move) and every take-back after it. */
  net: number;
  /** False when the count holds for one move only: the side to take back is in
   *  check from somewhere else, so "nothing takes back" is not yet a fact. */
  standing: boolean;
  /** What each side took over the exchange, as piece letters in the order
   *  taken — the mover's list opens with what the move itself took. Named by
   *  the one ledger namer (`exchangeLedger.netPieceWords`). */
  moverTook: string[];
  otherTook: string[];
  /** Every take-back the count played was the ONLY legal capture on the
   *  square, so `fen` is where the exchange ends whoever plays it. False when
   *  a side had a choice of capturer (…exd5 met by Qxd5, Bxd5 or Nxd5; …dxe5
   *  met by fxe5 or Nxe5): the board then depends on a choice the count made,
   *  and a STRUCTURE claim (a file, a passer, an outpost) is said only when it
   *  is true on the board the move leaves as well (`structureIsSettled`). */
  forced: boolean;
}

export function exchangeEnd(fenBefore: string, san: string): ExchangeEnd | null {
  let c: Chess;
  let to: Square;
  let mover: Color;
  const moverTook: string[] = [];
  const otherTook: string[] = [];
  try {
    c = new Chess(fenBefore);
    const m = c.move(san);
    to = m.to;
    mover = m.color;
    if (m.captured) moverTook.push(m.captured);
  } catch { return null; }
  // A check from another square stops the take-back for one move only — a
  // fact about the square only when something could take there at all.
  const standing = seeReadsStanding(c.fen(), to, c.turn()) || c.attackers(to, c.turn()).length === 0;
  const sans: string[] = [];
  let pieceStays = true;
  let forced = true;
  for (let guard = 0; guard < 16; guard += 1) {
    const side = c.turn();
    if (legalSeeGainFor(c.fen(), to, side) <= 0) break;
    const takes = c.moves({ verbose: true }).filter((x) => x.to === to && !!x.captured);
    if (takes.length === 0) break;
    if (takes.length > 1) forced = false;
    takes.sort((a, b) => (CAPTURE_VALUE[a.piece] ?? 0) - (CAPTURE_VALUE[b.piece] ?? 0));
    const t = takes[0];
    try { c.move(t); } catch { break; }
    sans.push(t.san);
    if (side === mover) moverTook.push(t.captured ?? 'p'); else { otherTook.push(t.captured ?? 'p'); pieceStays = false; }
  }
  const worth = (xs: readonly string[]): number => xs.reduce((n, x) => n + pieceWorth(x), 0);
  const on = c.get(to);
  return { fen: c.fen(), sans, holds: !!on && on.color === mover, pieceStays, net: worth(moverTook) - worth(otherTook), standing, moverTook, otherTook, forced };
}

/** DOES THE MOVED PIECE DO ANYTHING FROM ITS SQUARE — aim at a piece, fork,
 *  pin, press on a file? It does when it is still standing there once the
 *  exchange is over. It also does when it is GIVEN UP there: taken, with the
 *  mover netting a loss over the exchange (Nxf7 in the Fried Liver — the knight
 *  hits the queen and the rook, which is why the king has to take it). What
 *  does nothing is a piece taken back in a TRADE — the mover level or ahead —
 *  because the capture was a step of the exchange, not a piece put to work
 *  (…Bxf1 Kxf1, Bxe7 …Qxe7, …Nxe4 Qxe4). */
export function actsFromItsSquare(end: ExchangeEnd): boolean {
  return end.standing && (end.pieceStays || end.net < 0);
}

/** White-POV settled balance at the END of a played line — its last move's
 *  exchange played out, so a line cut mid-recapture is neither a win nor a
 *  loss. Each ply carries the board before it and its UCI. */
export function settledLineEnd(plies: ReadonlyArray<{ fenBefore: string; fenAfter: string; uci: string }>): number | null {
  const last = plies.at(-1);
  if (!last || !last.fenAfter) return null;
  return settledBalance(last.fenAfter, lastMoveFromUci(last.fenBefore, last.uci));
}

/** The `LastMove` of a SAN move played from `fenBefore`, or null. */
export function lastMoveFromSan(fenBefore: string, san: string): LastMove | null {
  try {
    const m = new Chess(fenBefore).move(san);
    return { to: m.to, captured: m.captured ?? null };
  } catch { return null; }
}

/** The last move of a game's SAN history, but only when that history ends on
 *  `fen` — a surface whose board is not the end of its history (a walkthrough,
 *  a what-if) gets null, the raw count, rather than a move that never led here. */
export function lastMoveFromHistory(history: readonly string[] | undefined, fen: string): LastMove | null {
  if (!history || history.length === 0) return null;
  try {
    const c = new Chess();
    for (const raw of history) {
      const san = raw.replace(/^\d+\.+/, '').trim();
      if (san) c.move(san);
    }
    if (c.fen().split(' ')[0] !== fen.split(' ')[0]) return null;
    return lastMoveOf(c);
  } catch { return null; }
}

/** Value of one piece letter in pawns (MATERIAL semantics, king 0). */
function pieceWorth(piece: string): number {
  return MATERIAL_VALUE[piece.toLowerCase()] ?? 0;
}
