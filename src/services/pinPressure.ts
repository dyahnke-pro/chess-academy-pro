// pinPressure — "put pressure on the pinned piece" (David 2026-10-05: "Add PP
// on the PP to the coach's vocabulary … It's a principle, state it when it's
// relevant").
//
// A pinned piece cannot run, so the side holding the pin should attack it
// AGAIN — ideally with a pawn — and win it. This is the computer that knows
// when that is true on the board, and it is DUAL-USE: the same answer teaches
// the principle when the move is there, and names the miss when the student
// played something else.
//
// When it is relevant (and only then — "don't over use it"):
//   • the side to move holds a REAL pin (the tactic detector's own pin, which
//     already refuses pins the front piece can walk out of), and
//   • one of its legal moves adds an attacker to the pinned piece that WINS
//     it: a pawn now hits a piece (the pinned piece cannot step away), or the
//     extra attacker makes the capture win material by legal SEE; and
//   • the pressuring piece is not simply lost where it lands, and
//   • the pinned side cannot break the pin with tempo — a pawn hitting the
//     PINNER kicks it off the line before the pressure lands.
// No such move → null. A pin with nothing to pile on is not this principle.
//
// PURE: chess.js + the existing pin detector and SEE. Never decides by prose.
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { detectTactics } from './tacticsDetector';
import { capturesWinMaterial } from './positionReadingService';
import { findPinBreaks } from './pinBreak';
import { PIECE_NAMES } from '../types/tacticTypes';

export interface PinPressureMove {
  san: string;
  from: Square;
  to: Square;
  /** The piece that adds the pressure. */
  piece: PieceSymbol;
  /** A pawn attacking a pinned piece: the cleanest form of the principle. */
  byPawn: boolean;
}

export interface PinPressure {
  /** The side that holds the pin and is to move. */
  side: Color;
  /** The pinning piece, the pinned piece and what is behind it. */
  pinner: Square;
  pinned: Square;
  behind: Square;
  pinnedPiece: PieceSymbol;
  /** Every move that piles on and wins the pinned piece, pawn moves first. */
  moves: PinPressureMove[];
}

/** The principle, in the coach's words (one sentence, rotated by the caller). */
export const PIN_PRESSURE_PRINCIPLE = [
  'A pinned piece cannot run — put more pressure on it.',
  'Pile on the pinned piece: it is stuck, so attack it again.',
  'When a piece is pinned, attack it again — it has nowhere to go.',
] as const;

function attackersOf(fen: string, sq: Square, color: Color): number {
  try { return new Chess(fen).attackers(sq, color).length; } catch { return 0; }
}

/** With `color` to move on `fen`, would capturing on `sq` win material? */
function winsOnCapture(fen: string, sq: Square, color: Color): boolean {
  const parts = fen.split(' ');
  parts[1] = color;
  parts[3] = '-';
  return capturesWinMaterial(parts.join(' '), sq, color);
}

/** Can `color` (to move on `fen`) hit the piece on `sq` with a PAWN move? */
function pawnCanKick(fen: string, sq: Square, color: Color): boolean {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return false; }
  if (chess.turn() !== color) return false;
  const file = sq.charCodeAt(0) - 97;
  const rank = Number(sq[1]);
  // A pawn of `color` on (f, r) attacks (f±1, r+1) for White, (f±1, r−1) for Black.
  const fromRank = color === 'w' ? rank - 1 : rank + 1;
  return chess.moves({ verbose: true }).some((m) => {
    if (m.piece !== 'p') return false;
    const f = m.to.charCodeAt(0) - 97;
    return Number(m.to[1]) === fromRank && Math.abs(f - file) === 1;
  });
}

/** The board with `color` to move (a null move when it is not their turn). */
function withMover(fen: string, color: Color): string {
  const parts = fen.split(' ');
  if (parts[1] === color) return fen;
  parts[1] = color;
  parts[3] = '-';
  return parts.join(' ');
}

/**
 * Every pin `holder` has where piling on wins the piece; [] when none.
 *
 * BOTH WAYS (David 2026-10-05: "for and against the opponent"): with `holder`
 * the student it is the opportunity ("pile on the pinned knight"); with
 * `holder` the opponent it is the threat against the student's pinned piece
 * ("they can pile on with e5 — break the pin or add a defender"). One
 * computer, one answer, read from either seat. Defaults to the side to move.
 */
export function findPinPressure(fen: string, holder?: Color): PinPressure[] {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return []; }
  if (holder && chess.turn() !== holder) {
    try { chess = new Chess(withMover(fen, holder)); } catch { return []; }
    fen = chess.fen();
  }
  const me = chess.turn();
  const them: Color = me === 'w' ? 'b' : 'w';
  const pins = detectTactics(fen).tactics.filter((t) => t.type === 'pin' && t.beneficiary === me);
  const out: PinPressure[] = [];
  for (const pin of pins) {
    const [pinner, pinned, behind] = pin.involvedSquares as Square[];
    const victim = chess.get(pinned);
    if (!victim || victim.color !== them || victim.type === 'k') continue;
    const before = attackersOf(fen, pinned, me);
    const moves: PinPressureMove[] = [];
    for (const m of chess.moves({ verbose: true })) {
      if (m.to === pinned || m.from === pinner) continue;   // taking it / moving the pinner is not piling on
      const after = new Chess(fen);
      try { after.move(m.san); } catch { continue; }
      const fenAfter = after.fen();
      if (attackersOf(fenAfter, pinned, me) <= before) continue;
      // The pin must still stand after the move.
      const stillPinned = detectTactics(fenAfter).tactics.some(
        (t) => t.type === 'pin' && t.beneficiary === me && t.involvedSquares[1] === pinned,
      );
      if (!stillPinned) continue;
      const byPawn = m.piece === 'p';
      const wins = byPawn ? victim.type !== 'p' : winsOnCapture(fenAfter, pinned, me);
      if (!wins) continue;
      // The new attacker must not just be lost where it lands.
      if (winsOnCapture(fenAfter, m.to, them)) continue;
      // THE PIN THAT BREAKS WITH TEMPO (David 2026-10-07; the reference coach's
      // ...h6 then ...g5): when the pinned side can hit the PINNER with a pawn,
      // it kicks it and the pin is gone before the pressure lands — piling on
      // wins nothing. Note 487's board (Bg5 pins Nf6, e5 "wins it") was said
      // as a won knight; after ...h6 Bh4 g5 Bg3 the knight walks away.
      if (pawnCanKick(fenAfter, pinner, them)) continue;
      // …and when the pinned piece itself can walk out with tempo (check, a
      // bigger threat, a discovery), the pile-on wins nothing either.
      if (findPinBreaks(fenAfter, them).some((b) => b.pinned === pinned)) continue;
      moves.push({ san: m.san, from: m.from, to: m.to, piece: m.piece, byPawn });
    }
    if (moves.length === 0) continue;
    moves.sort((a, b) => Number(b.byPawn) - Number(a.byPawn));
    out.push({ side: me, pinner, pinned, behind, pinnedPiece: victim.type, moves });
  }
  return out;
}

/** Whether a played move is one of the pressure moves on this board — by
 *  COORDINATES, never the SAN string (the same move renders "Nxd4" or "Nexd4"). */
export function isPinPressureMove(fen: string, from: string, to: string): boolean {
  return findPinPressure(fen).some((p) => p.moves.some((m) => m.from === from && m.to === to));
}

/**
 * AGAINST the student: after the student's move (`fenAfter`, opponent to
 * move), can the opponent pile on a pin and win the student's piece? The
 * threat the student walked into, or failed to meet. [] when none.
 */
export function pinPressureThreat(fenAfter: string): PinPressure[] {
  let mover: Color;
  try { mover = new Chess(fenAfter).turn(); } catch { return []; }
  return findPinPressure(fenAfter, mover);
}

/** The principle, said AGAINST the student (rotated by the caller). */
export const PIN_PRESSURE_WARNING = [
  'Your pinned piece is a target — they can attack it again and it cannot run.',
  'A pinned piece is stuck: if they pile on, break the pin or add a defender first.',
] as const;

export function pieceName(t: PieceSymbol): string {
  return PIECE_NAMES[t] ?? 'piece';
}
