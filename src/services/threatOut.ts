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
import { liteMoves, makeLite, undoLite } from './liteMoves';
import { CAPTURE_VALUE } from './pieceValues';
import { withMover } from '../utils/sideToMove';

const VALUE = CAPTURE_VALUE;

export interface MustDefend {
  /** The biggest single piece (in points) the mover must defend — 0 if nothing
   *  hangs. This is the importance model's `threatNet`. */
  net: number;
  /** Every mover piece hanging to the opponent's next move, SEE-verified,
   *  highest value first. */
  pieces: Array<{ square: string; piece: string; value: number; attacker: string | null; attackerSquare: string | null; defenders: number }>;
}

/** Flip the side-to-move (clear en-passant, which a flip invalidates). Returns
 *  null when the flip is illegal — the side now NOT to move is in check, so the
 *  opponent could never have been "given the move" from here (you can't null-move
 *  out of giving check). Guarding this is what keeps the probe board-legal. */
export function flipSideToMove(fen: string): string | null {
  // A SIDE IN CHECK CANNOT PASS (census 2026-10-10) — the one flip says so.
  return withMover(fen, fen.split(' ')[1] === 'w' ? 'b' : 'w');
}

/**
 * THE BOARD WITH `color` TO MOVE — unchanged when it already is, the one
 * null move when it is not (census 2026-10-10: ten private `withTurn` copies,
 * most with no check rule at all, built impossible boards whenever the side
 * asked to pass was in check). Null when no such board exists.
 */
export function sideToMoveAs(fen: string, color: 'w' | 'b'): string | null {
  const parts = fen.split(' ');
  if (parts.length < 4) return null;
  if (parts[1] === color) {
    try { new Chess(fen); return fen; } catch { return null; }
  }
  return flipSideToMove(fen);
}

/** THE ONE MATE-THREAT READ: every move the side attacking `target`'s king
 *  could mate with if it were their move — the null-move probe, exact. `fen`
 *  is the position the attacker moves from (handed the move when it is
 *  `target` to play). Empty when `target` is in check (no free move to give).
 *  Learn's and Review's threat proof and the chat's "is my king safe?" and
 *  "what do they threaten?" read this, never a copy of it. */
export function mateThreatsAgainst(fen: string, target: 'w' | 'b'): { fen: string; moves: Array<{ san: string; from: string; to: string }> } {
  return mateScan(fen, target, false);
}

/** Is there a mate threat against `target`'s king — `mateThreatsAgainst`'s
 *  moves non-empty, read without naming them (stops at the first). */
export function hasMateThreat(fen: string, target: 'w' | 'b'): boolean {
  return mateScan(fen, target, true).moves.length > 0;
}

function mateScan(fen: string, target: 'w' | 'b', first: boolean): { fen: string; moves: Array<{ san: string; from: string; to: string }> } {
  const attacker = target === 'w' ? 'b' : 'w';
  let probeFen = fen;
  try {
    let c = new Chess(fen);
    if (c.turn() === target) {
      const flipped = flipSideToMove(fen);
      if (!flipped) return { fen, moves: [] };
      probeFen = flipped;
      c = new Chess(probeFen);
    }
    if (c.turn() !== attacker) return { fen: probeFen, moves: [] };
    // The mate test without the notation (phone cost 2026-11-19): the verbose
    // list writes every move's SAN, which plays it and generates every reply.
    // Only a mating move pays for its name.
    const moves: Array<{ san: string; from: string; to: string }> = [];
    for (const m of liteMoves(c)) {
      makeLite(c, m);
      const mate = c.inCheck() && liteMoves(c).length === 0;
      undoLite(c);
      if (!mate) continue;
      if (first) return { fen: probeFen, moves: [{ san: '', from: m.from, to: m.to }] };
      const named = c.moves({ square: m.from, verbose: true }).find((x) => x.to === m.to && x.promotion === m.promotion);
      if (named) moves.push({ san: named.san, from: named.from, to: named.to });
    }
    return { fen: probeFen, moves };
  } catch { return { fen, moves: [] }; }
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
function boardFact(probeFen: string, square: Square, subject: 'w' | 'b'): { attacker: string | null; attackerSquare: string | null; defenders: number } {
  try {
    const b = new Chess(probeFen);
    const caps = liteMoves(b).filter((m) => m.to === square && m.captured);
    caps.sort((x, y) => (VALUE[x.piece] ?? 0) - (VALUE[y.piece] ?? 0));
    return { attacker: caps[0]?.piece ?? null, attackerSquare: caps[0]?.from ?? null, defenders: b.attackers(square, subject).length };
  } catch { return { attacker: null, attackerSquare: null, defenders: 0 }; }
}

export function computeMustDefend(fen: string, subjectColor: 'w' | 'b'): MustDefend {
  const read = mustDefendRead(fen, subjectColor);
  if (!read) return { net: 0, pieces: [] };
  const pieces = read.pieces.map((h) => ({ ...h, ...boardFact(read.probeFen, h.square, subjectColor) }));
  return { net: pieces[0]?.value ?? 0, pieces };
}

/** The must-defend's pieces alone (square, piece, value; highest value
 *  first) — `computeMustDefend` without the board fact behind each, for a
 *  caller that reads only what hangs (one read, the same list). */
export function mustDefendPieces(fen: string, subjectColor: 'w' | 'b'): Array<{ square: Square; piece: string; value: number }> {
  return mustDefendRead(fen, subjectColor)?.pieces ?? [];
}

function mustDefendRead(fen: string, subjectColor: 'w' | 'b'): { probeFen: string; pieces: Array<{ square: Square; piece: string; value: number }> } | null {
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  const toMove = board.turn();

  // Ensure the OTHER side is the one to move on the probe board — that is the
  // board on which `findHangingPieces` reports what the subject must defend.
  let probeFen = fen;
  if (toMove === subjectColor) {
    // Subject to move → hand the opponent the tempo (null-move). If the subject
    // is in check there is no free tempo to give — the check dominates and is a
    // separate, more urgent signal; return nothing rather than probe an illegal
    // flipped board.
    if (board.inCheck()) return null;
    const flipped = flipSideToMove(fen);
    if (!flipped) return null;
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
  try { hanging = findHangingBySee(probeFen); } catch { return null; }
  const mine = hanging
    .filter((h) => h.color === subjectColor && h.piece !== 'k')
    .map((h) => ({ square: h.square, piece: h.piece as string, value: Math.min(VALUE[h.piece] ?? 0, h.gain) }))
    .filter((h) => h.value > 0)
    .sort((a, b) => b.value - a.value);
  return { probeFen, pieces: mine };
}

/** Pieces of `foe`'s (not pawns) the other side wins on its next move. */
const enPrise = (fen: string, foe: 'w' | 'b'): Set<string> =>
  new Set(computeMustDefend(fen, foe).pieces.filter((p) => p.piece !== 'p').map((p) => p.square));

/** A MOVE THAT FORCES AN ANSWER — the one test (the tempo run's, and the
 *  lead-up reader's pressure): after the move, `foe` faces a threat it did
 *  not face before — a piece of theirs newly en prise, or a mate threat. */
export function newThreat(fenBefore: string, fenAfter: string, foe: 'w' | 'b'): boolean {
  const before = enPrise(fenBefore, foe);
  for (const sq of enPrise(fenAfter, foe)) if (!before.has(sq)) return true;
  return hasMateThreat(fenAfter, foe) && !hasMateThreat(fenBefore, foe);
}
