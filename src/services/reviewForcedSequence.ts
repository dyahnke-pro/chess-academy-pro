/**
 * reviewForcedSequence — detect a FORCED checking sequence that ends in mate, so
 * the review can TEACH the forcing-move concept (David 2026-07-20, narrating vs
 * teaching): "from here it's forced — a string of checks the king can't escape,
 * and it ends in mate. Watch." Then the walk plays the sequence out.
 *
 * A forced mating run is the maximal suffix of the game that ENDS in checkmate
 * where every attacker move gives check (or mate) and every defender move is made
 * WHILE IN CHECK (a forced response). Pure board-truth (chess.js): we replay the
 * game and read `inCheck()` + the SAN's check marker — nothing inferred.
 */
import { Chess } from 'chess.js';

export interface ForcedMatingRun {
  /** 1-based ply where the forced run BEGINS (the first attacker check). */
  startPly: number;
  /** Number of plies in the run (>= 3 to be worth framing). */
  length: number;
}

/**
 * Find the forced checking sequence that ends the game in mate, or null. `sans`
 * is the full game in SAN. Only returns a run of >= 3 plies (a one-move mate is
 * not a "sequence" to frame; it's just named as mate by the conversion beat).
 */
export function detectForcedMatingSequence(sans: string[]): ForcedMatingRun | null {
  if (sans.length === 0) return null;
  const last = sans[sans.length - 1];
  if (!last.trimEnd().endsWith('#')) return null; // game didn't end in mate

  // Replay, recording per ply: was the mover IN CHECK before moving, and does the
  // move give check/mate? Both are board-true (chess.js).
  const chess = new Chess();
  const inCheckBefore: boolean[] = [];
  const givesCheck: boolean[] = [];
  for (const san of sans) {
    let ok = true;
    try {
      inCheckBefore.push(chess.inCheck());
      const mv = chess.move(san);
      if (!mv) ok = false;
    } catch {
      ok = false;
    }
    if (!ok) return null; // an illegal SAN → don't trust the sequence
    givesCheck.push(/[+#]$/.test(san));
  }

  // Walk backward from the mate: a ply belongs to the run if it GIVES check
  // (attacker) OR it was made while in check (forced defender response).
  let start = sans.length - 1; // the mating ply (index)
  for (let i = sans.length - 1; i >= 0; i -= 1) {
    if (givesCheck[i] || inCheckBefore[i]) start = i;
    else break;
  }
  const length = sans.length - start;
  if (length < 3) return null;
  return { startPly: start + 1, length };
}
