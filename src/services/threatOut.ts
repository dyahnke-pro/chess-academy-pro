// threatOut — the MUST-DEFEND fact, calculated out (G0). Ported from the offline
// PositionFacts calculator (docs/plans/2026-08-26-position-facts-calculator.md).
//
// "What must I defend?" = give the opponent the move (null-move: flip the
// side-to-move) and ask what they win. It reuses the grounded primitives — the
// side flip and `findHangingPieces` (SEE-verified) — so it adds NO new engine
// search and no new hanging-detection; it is the composition the runtime was
// missing. It feeds two things: the importance model's `threatNet` (must-defend,
// the standing-threat signal the flat eval bar hides) and the fact supply ("the
// knight on f6 hangs to the opponent's next move").
//
// The immediate (SEE) read is free — no search — so it runs every ply. The
// played-out / latent extension (search the flipped position for the opponent's
// best line) is deliberately NOT here: it costs a search and is gated behind
// criticality at the call site per the cost architecture.
import { Chess } from 'chess.js';
import { findHangingPieces } from './tacticClassifier';
import type { HangingPiece } from '../types/tacticTypes';

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

export interface MustDefend {
  /** The biggest single piece (in points) the mover must defend — 0 if nothing
   *  hangs. This is the importance model's `threatNet`. */
  net: number;
  /** Every mover piece hanging to the opponent's next move, SEE-verified,
   *  highest value first. */
  pieces: Array<{ square: string; piece: string; value: number }>;
}

/** Flip the side-to-move (clear en-passant, which a flip invalidates). Returns
 *  null when the flip is illegal — the side now NOT to move is in check, so the
 *  opponent could never have been "given the move" from here (you can't null-move
 *  out of giving check). Guarding this is what keeps the probe board-legal. */
export function flipSideToMove(fen: string): string | null {
  const parts = fen.split(' ');
  if (parts.length < 4) return null;
  parts[1] = parts[1] === 'w' ? 'b' : 'w';
  parts[3] = '-';
  const flipped = parts.join(' ');
  try {
    const c = new Chess(flipped);
    if (c.inCheck()) return null;
    return flipped;
  } catch {
    return null;
  }
}

/**
 * The immediate must-defend for `moverColor` at `fen`: what the opponent would
 * win with a free move. Empty (net 0) when nothing hangs — the honest silence
 * the importance gate reads as "nothing threatened".
 */
export function computeMustDefend(fen: string, moverColor: 'w' | 'b'): MustDefend {
  // If the mover is already in check, there is no free tempo to hand the
  // opponent — the check dominates and is a separate, more urgent signal. The
  // flipped board would also be illegal (a side in check but not to move), so
  // findHangingPieces on it is noise. Return nothing; don't double-count.
  try { if (new Chess(fen).inCheck()) return { net: 0, pieces: [] }; } catch { return { net: 0, pieces: [] }; }
  const flipped = flipSideToMove(fen);
  if (!flipped) return { net: 0, pieces: [] };
  let hanging: HangingPiece[];
  try {
    hanging = findHangingPieces(new Chess(flipped));
  } catch {
    return { net: 0, pieces: [] };
  }
  // On the flipped board the opponent is to move, so a hanging piece of
  // `moverColor` is one the mover must defend before the opponent takes it.
  const mine = hanging
    .filter((h) => h.color === moverColor && h.piece.toLowerCase() !== 'k')
    .map((h) => ({ square: h.square, piece: h.piece, value: VALUE[h.piece.toLowerCase()] ?? 0 }))
    .sort((a, b) => b.value - a.value);
  return { net: mine[0]?.value ?? 0, pieces: mine };
}
