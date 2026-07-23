// tacticVerification — make the static tactic scanner TEMPO-AWARE (David
// 2026-07-23: "can't we tell the computer whose move it is?"). The whole-board
// `detectTactics` reports fork/pin/skewer SHAPES with no regard for whose move
// it is or whether the tactic wins anything — so a "fork" of two DEFENDED pieces,
// or one the owner never gets to execute, reads as a live win. This verifies a
// fork before the review speaks it, using tempo + SEE (chess.js only, no engine):
//
//   • LIVE   — the fork's owner is the side to move: they execute now. Real only
//              if ≥ 2 targets are each winnable by SEE (the defender saves one,
//              the fork collects the other).
//   • THREAT — the owner just moved; the defender replies FIRST. Real only if the
//              material still falls against EVERY defender reply (a bounded 1-ply
//              check — no engine). If any single reply saves everything, it is
//              not a threat and we say nothing.
//   • NONE   — unproven → drop it. Empty > invented (G0/G3).
//
// The engine is not needed here — SEE + a 1-ply legal-move sweep is exact for
// "does this fork win material right now / next move".

import { Chess } from 'chess.js';
import type { Square, Color, PieceSymbol } from 'chess.js';
import { seeGain } from './positionReadingService';

const PIECE_VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

export type ForkStatus = 'live' | 'threat' | 'none';

export interface ForkVerdict {
  status: ForkStatus;
  /** Enemy target squares winnable by SEE (never the king). */
  winnableTargets: string[];
  /** Guaranteed material the fork wins (points) — conservative. */
  winsPoints: number;
}

const NONE: ForkVerdict = { status: 'none', winnableTargets: [], winsPoints: 0 };

/**
 * Verify a detected fork on the board at `fen`. `forkerSq` is where the forking
 * piece sits; `targetSqs` are the forked squares (from the detector). Returns
 * whether the fork is a live win, a real threat, or unproven — with the material
 * it wins. Pure chess.js + SEE; safe on any FEN (returns NONE on error).
 */
export function verifyForkOnBoard(fen: string, forkerSq: string, targetSqs: string[]): ForkVerdict {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return NONE; }
  const forker = chess.get(forkerSq as Square);
  if (!forker) return NONE;
  const owner: Color = forker.color;
  const stm: Color = chess.turn();

  // Only enemy, non-king pieces that are actually still on their target square.
  const targets = targetSqs.filter((sq) => {
    const p = chess.get(sq as Square);
    return !!p && p.color !== owner && p.type !== 'k';
  });
  // A royal fork attacks the enemy KING + a piece: the king can't be "won", but
  // the check FORCES the defender, so a single non-king target still qualifies.
  const forksKing = targetSqs.some((sq) => {
    const p = chess.get(sq as Square);
    return !!p && p.type === 'k' && p.color !== owner;
  });
  if (targets.length < (forksKing ? 1 : 2)) return NONE;

  if (owner === stm) {
    // LIVE — owner executes now. Winnable = SEE-positive targets. A fork needs
    // ≥ 2 winnable (the defender can only rescue one).
    const winnable = targets.filter((sq) => seeGain(chess, sq as Square) > 0);
    if (winnable.length < 2) return NONE;
    // Guaranteed material = the SMALLER winnable target (defender saves the
    // bigger, the fork takes the rest). Conservative and true.
    const vals = winnable
      .map((sq) => chess.get(sq as Square))
      .filter((p): p is NonNullable<typeof p> => !!p)
      .map((p) => PIECE_VALUE[p.type])
      .sort((a, b) => a - b);
    return { status: 'live', winnableTargets: winnable, winsPoints: vals[0] };
  }

  // THREAT — owner just moved; the defender (side to move) replies first. The
  // threat is real only if, after EVERY legal defender reply, the owner can
  // still win material on one of the ORIGINAL target squares (ties the claim to
  // this fork, not some unrelated tactic). One saving reply ⇒ no threat.
  const defenderMoves = chess.moves({ verbose: true });
  if (defenderMoves.length === 0) return NONE;
  let minGuaranteed = Infinity;
  for (const d of defenderMoves) {
    let after: Chess;
    try { after = new Chess(fen); after.move(d); } catch { return NONE; }
    let best = 0;
    for (const sq of targets) {
      const p = after.get(sq as Square);
      if (!p || p.color === owner || p.type === 'k') continue; // target saved / moved / captured
      const g = seeGain(after, sq as Square);
      if (g > best) best = g;
    }
    if (best < minGuaranteed) minGuaranteed = best;
    if (minGuaranteed <= 0) return NONE; // this reply saves everything
  }
  if (minGuaranteed >= 2) {
    return { status: 'threat', winnableTargets: targets, winsPoints: minGuaranteed };
  }
  return NONE;
}
