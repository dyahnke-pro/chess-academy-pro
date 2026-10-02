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
import { MATERIAL_VALUE, materialBalance } from './pieceValues';
import { legalSeeGainFor } from './positionReadingService';

export { MATERIAL_VALUE, materialBalance };

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
export function pieceWorth(piece: string): number {
  return MATERIAL_VALUE[piece.toLowerCase()] ?? 0;
}
