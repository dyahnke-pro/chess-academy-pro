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
//   • the pressuring piece is not simply lost where it lands.
// No such move → null. A pin with nothing to pile on is not this principle.
//
// PURE: chess.js + the existing pin detector and SEE. Never decides by prose.
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { detectTactics } from './tacticsDetector';
import { capturesWinMaterial } from './positionReadingService';
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

/** Every pin the side to move holds where piling on wins the piece; [] when none. */
export function findPinPressure(fen: string): PinPressure[] {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return []; }
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

export function pieceName(t: PieceSymbol): string {
  return PIECE_NAMES[t] ?? 'piece';
}
