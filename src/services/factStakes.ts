// factStakes — WHAT A FACT IS WORTH ON THIS BOARD, computed (David 2026-09-23:
// "Decision computer should handle this … I want most important and relevant
// statements first" / "Decision computer should compute that!!").
//
// Review and the live composer used to order their facts by two hand-written
// rank tables that disagreed (the broken fundamental led review at 100 and sat
// at 38 live; a pin two moves away outranked a piece hanging now). The order
// is now COMPUTED from the stakes each fact carries:
//
//   value = centipawns at stake × DISCOUNT^plies-until-it-lands
//
// • centipawns at stake — the material the fact is about, from the computer
//   that produced it: the cost the move already paid, the exchange value of a
//   hanging piece (`seeGain`), what a fork wins, the gap at a critical moment.
//   Never a guess: a detector with no number either gets its piece-value
//   exchange count on its OWN coupled squares or carries no stakes at all.
// • plies until it lands — 0 for a cost already paid or a decision the student
//   is making now, 1 when the side that wins it is on move, 2 when they must
//   wait a move, more for a threat that first needs setting up.
//
// A fact with no stakes (a plan, the structure, the opening's name, the method
// habit) ranks below every fact that has them — the door orders those by the
// one tie table, teaching before description. Pure: chess.js + seeGain only.
import { Chess, type Square } from 'chess.js';
import { seeGain } from './positionReadingService';

export interface FactStakes {
  /** Material at stake, in pawns (a knight is 3). A forced mate is `MATE_POINTS`. */
  points: number;
  /** Plies until it lands if nobody acts: 0 = already paid / decided now. */
  plies: number;
}

/** A forced mate outweighs any material. */
export const MATE_POINTS = 100;
/** Each ply of distance keeps 80%: a knight hanging next move (1 ply, 240)
 *  outranks a pawn in two moves, and a queen skewer three plies away (461)
 *  outranks the knight. */
export const STAKE_DISCOUNT = 0.8;
/** Staked facts score above this; unstaked ones stay on the tie table's
 *  0–100 scale, so any fact with real stakes outranks any fact without. */
export const STAKED_FLOOR = 1000;

const PIECE_POINTS: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Points for a piece letter ('n', 'Q', 'knight' is not accepted). */
export function piecePoints(piece: string): number {
  return PIECE_POINTS[piece.toLowerCase()] ?? 0;
}

/** The value a staked fact contributes to the order. Null / non-positive
 *  stakes contribute nothing — the caller falls back to the tie table. */
export function stakeValue(s: FactStakes | null | undefined): number | null {
  if (!s || !(s.points > 0)) return null;
  return STAKED_FLOOR + s.points * 100 * STAKE_DISCOUNT ** Math.max(0, s.plies);
}

/** A cost the move already paid (review's `[quality]`/`[principle]`, the
 *  live critical-moment gap): centipawns in, landed now. */
export function costStakes(cp: number | null | undefined): FactStakes | null {
  return cp != null && cp > 0 ? { points: cp / 100, plies: 0 } : null;
}

/**
 * The most material any side can win by exchange on these squares, with the
 * plies until the capture can happen. `victim` restricts the count to pieces
 * of one colour (a tactic's non-beneficiary); omitted, any piece counts.
 * Kings are never counted — check is not material.
 */
export function exchangeStakes(
  fen: string,
  squares: readonly string[],
  victim?: 'w' | 'b' | null,
): FactStakes | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const toMove = chess.turn();
  let best: FactStakes | null = null;
  let bestValue = 0;
  for (const sq of squares) {
    if (!/^[a-h][1-8]$/.test(sq)) continue;
    const p = chess.get(sq as Square);
    if (!p || p.type === 'k') continue;
    if (victim && p.color !== victim) continue;
    const gain = seeGain(chess, sq as Square);
    if (!(gain > 0)) continue;
    // The capturer is the side NOT owning the piece: on move → 1 ply, else 2.
    const plies = p.color === toMove ? 2 : 1;
    const v = stakeValue({ points: gain, plies }) ?? 0;
    if (v > bestValue) { bestValue = v; best = { points: gain, plies }; }
  }
  return best;
}

/** What a double attack wins when it lands: the defender saves the bigger
 *  target, so the fork is worth the SECOND most valuable one. */
export function forkPoints(targetPieces: readonly string[]): number {
  // A king in the fork must be answered, so it counts as the bigger target and
  // the fork wins the other one.
  const vals = targetPieces
    .map((p) => (p.toLowerCase() === 'k' ? Infinity : piecePoints(p)))
    .filter((v) => v > 0)
    .sort((a, b) => b - a);
  return vals.length >= 2 && Number.isFinite(vals[1]) ? vals[1] : 0;
}

/** The pieces standing on these squares, as letters — for `forkPoints` when a
 *  detector hands over squares rather than pieces. */
export function piecesOn(fen: string, squares: readonly string[]): string[] {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return []; }
  return squares.flatMap((sq) => {
    if (!/^[a-h][1-8]$/.test(sq)) return [];
    const p = chess.get(sq as Square);
    return p ? [p.type] : [];
  });
}

/** A pin or skewer on a line: a pin (front less valuable than the piece behind
 *  it) costs the front piece; a skewer (front more valuable) costs the back. */
export function lineTacticPoints(frontPiece: string, backPiece: string): number {
  // A king must step aside, so it is worth more than anything it shields: a
  // king in FRONT is a skewer (the piece behind falls), a king BEHIND a pin.
  const worth = (p: string): number => (p.toLowerCase() === 'k' ? Infinity : piecePoints(p));
  const front = worth(frontPiece);
  const back = worth(backPiece);
  return back > front ? piecePoints(frontPiece) : piecePoints(backPiece);
}

/**
 * A PIN ON A PAWN THAT WINS NOTHING IS SCENERY — one rule for every surface
 * (David 2026-09-25: root causes). Review taught a pawn pin only when it cost
 * material; Learn dropped every pawn pin; the same board got two answers.
 * `squares` are the detector's [attacker, pinned, behind]; `beneficiary` the
 * side the pin favours.
 */
export function isScenicPawnPin(
  fen: string,
  type: string,
  squares: readonly string[],
  beneficiary: 'w' | 'b' | null | undefined,
): boolean {
  if (type !== 'pin' || squares.length < 2) return false;
  if (piecesOn(fen, [squares[1]])[0]?.toLowerCase() !== 'p') return false;
  const victim = beneficiary ? (beneficiary === 'w' ? 'b' : 'w') : null;
  return exchangeStakes(fen, squares, victim) === null;
}
