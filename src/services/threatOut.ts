// threatOut — the MUST-DEFEND fact, calculated out (G0). Ported from the offline
// PositionFacts calculator (docs/plans/2026-08-26-position-facts-calculator.md).
//
// "What must I defend?" = give the opponent the move (null-move: flip the
// side-to-move) and ask what they win. It reuses the grounded primitives — the
// side flip and `findHangingBySee` (the legal exchange) — so it adds NO new engine
// search and no new hanging-detection; it is the composition the runtime was
// missing. It feeds two things: the importance model's `threatNet` (must-defend,
// the standing-threat signal the flat eval bar hides) and the fact supply ("the
// knight on f6 hangs to the opponent's next move").
//
// The immediate (SEE) read is free — no search — so it runs every ply. The
// played-out / latent extension (search the flipped position for the opponent's
// best line) is deliberately NOT here: it costs a search and is gated behind
// criticality at the call site per the cost architecture.
import { Chess, type Square } from 'chess.js';
import { findHangingBySee } from './positionReadingService';
import { CAPTURE_VALUE } from './pieceValues';

const VALUE = CAPTURE_VALUE;

export interface MustDefend {
  /** The biggest single piece (in points) the mover must defend — 0 if nothing
   *  hangs. This is the importance model's `threatNet`. */
  net: number;
  /** Every mover piece hanging to the opponent's next move, SEE-verified,
   *  highest value first. */
  pieces: Array<{ square: string; piece: string; value: number; attacker: string | null; defenders: number }>;
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
 * The immediate must-defend for `subjectColor` at `fen`: what the OTHER side
 * wins on its next move. Turn-aware, so it is correct whoever is to move — the
 * subject need not be the side to move (a post-move narration reads the position
 * with the OPPONENT already to move, and "what does the student have to defend"
 * is still the honest question there). Empty (net 0) when nothing hangs.
 */
/** The BOARD fact behind a must-defend (WO-OUTCOME-01 C): the cheapest piece
 *  that can legally take, and how many of the subject's pieces guard the
 *  square. A sentence with no engine line may say these, never what the
 *  capture nets. */
function boardFact(probeFen: string, square: Square, subject: 'w' | 'b'): { attacker: string | null; defenders: number } {
  try {
    const b = new Chess(probeFen);
    const caps = b.moves({ verbose: true }).filter((m) => m.to === square && m.captured);
    caps.sort((x, y) => (VALUE[x.piece] ?? 0) - (VALUE[y.piece] ?? 0));
    return { attacker: caps[0]?.piece ?? null, defenders: b.attackers(square, subject).length };
  } catch { return { attacker: null, defenders: 0 }; }
}

export function computeMustDefend(fen: string, subjectColor: 'w' | 'b'): MustDefend {
  let toMove: 'w' | 'b';
  try { toMove = new Chess(fen).turn(); } catch { return { net: 0, pieces: [] }; }

  // Ensure the OTHER side is the one to move on the probe board — that is the
  // board on which `findHangingPieces` reports what the subject must defend.
  let probeFen = fen;
  if (toMove === subjectColor) {
    // Subject to move → hand the opponent the tempo (null-move). If the subject
    // is in check there is no free tempo to give — the check dominates and is a
    // separate, more urgent signal; return nothing rather than probe an illegal
    // flipped board.
    try { if (new Chess(fen).inCheck()) return { net: 0, pieces: [] }; } catch { return { net: 0, pieces: [] }; }
    const flipped = flipSideToMove(fen);
    if (!flipped) return { net: 0, pieces: [] };
    probeFen = flipped;
  }
  // else: the opponent is ALREADY to move — read the position directly.

  // CONFIRMED BY THE EXCHANGE, NOT JUST "NO DEFENDER RIGHT NOW" (claim check
  // 2026-09-27: "they're threatening the rook on a8" — Qxa8 is met by …Rxa8
  // from behind the square the queen just left; "win the knight on e4" and
  // "the rook on d6" were the same). The legal SEE plays the real captures, so
  // a defender standing behind the attacker counts, and the net is what the
  // opponent actually wins, not the piece's full value.
  //
  // …AND A DEFENDER DOES NOT HELP WHEN THE ATTACKER IS CHEAPER (Learn tape
  // 2026-10-07: 6.h3 hit the bishop on g4, guarded by the f6 knight, and hxg4
  // Nxg4 wins a bishop for a pawn — lost in both games, with no warning). The
  // candidates used to be `findHangingPieces`, which skips every DEFENDED
  // piece, so a pawn hitting a guarded bishop was never a threat at all, and
  // the "their threat first" habit (gated on this net) never fired once in 49
  // moves. Every piece the exchange loses is a candidate now — the undefended
  // ones were always a subset (their swap gain is their full value).
  let hanging: ReturnType<typeof findHangingBySee>;
  try { hanging = findHangingBySee(probeFen); } catch { return { net: 0, pieces: [] }; }
  const mine = hanging
    .filter((h) => h.color === subjectColor && h.piece !== 'k')
    .map((h) => ({ square: h.square, piece: h.piece, value: Math.min(VALUE[h.piece] ?? 0, h.gain), ...boardFact(probeFen, h.square, subjectColor) }))
    .filter((h) => h.value > 0)
    .sort((a, b) => b.value - a.value);
  return { net: mine[0]?.value ?? 0, pieces: mine };
}
