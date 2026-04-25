/**
 * Live state source — validates the live-state object the calling
 * surface passed in, and fills derivable gaps (e.g. `phase` from
 * `fen` when the surface didn't compute it itself).
 *
 * Live state is NOT cached on the brain side — every call is fresh.
 * The surface knows what it's looking at; the brain just sanity-
 * checks the shape and hands it to the envelope assembler.
 */
import { Chess } from 'chess.js';
import { classifyPhase } from '../../services/gamePhaseService';
import type { LiveState } from '../types';

/** Validate + enrich the live-state payload. Throws when required
 *  fields are missing (the envelope cannot ship without `surface`).
 *  Auto-fills `phase` from `fen` when possible. */
export function prepareLiveState(input: LiveState): LiveState {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!input.surface) {
    throw new Error('liveState.surface is required');
  }
  const next: LiveState = { ...input };
  if (next.fen && !next.phase) {
    try {
      // Use the existing `classifyPhase` helper so the phase label
      // matches whatever the rest of the app reports.
      const moveNumber = next.moveHistory?.length ?? 0;
      next.phase = classifyPhase(next.fen, moveNumber);
    } catch {
      // Ignore — phase remains undefined, and the envelope formatter
      // will simply omit it.
    }
  }
  if (next.fen) {
    // Cheap sanity check — if FEN is malformed, drop it rather than
    // forwarding a corrupt board to the LLM.
    try {
      new Chess(next.fen);
    } catch {
      console.warn('[liveState] dropped invalid FEN:', next.fen);
      next.fen = undefined;
      next.phase = undefined;
    }
  }
  return next;
}
