/**
 * narratedContinuation
 * --------------------
 * Pure, grounded helpers for the coach "watch the middlegame and endgame"
 * continuation (David 2026-07-18: "I want the coach to be able to play and
 * narrate a full game … so they can see a middle and endgame"). The coach
 * plays out both sides with Stockfish from where the opening lesson ended;
 * these helpers decide WHEN a moment is worth narrating and WHAT to say —
 * all COMPUTED from the board (G0: the LLM decides nothing; the position
 * teaches). We stay quiet on routine moves (narration voice rule 4) and
 * speak only the keystones: a phase transition, a decisive material swing,
 * and the result.
 */


/** Material balance from a FEN — positive = White ahead, in points. */
export { materialBalance };

/** Total non-pawn, non-king material on the board (both sides), in points. */
export function nonPawnMaterial(fen: string): number {
  const board = fen.split(' ')[0];
  let total = 0;
  for (const ch of board) {
    const l = ch.toLowerCase();
    if (l === 'n' || l === 'b' || l === 'r' || l === 'q') total += MATERIAL_VALUE[l];
  }
  return total;
}

import { openSentence } from '../utils/openSentence';
import { materialBalance, MATERIAL_VALUE } from './pieceValues';
import { settledBalance, type LastMove } from './material';
import type { GamePhase } from '../types';
import { phaseOfFen } from './boardConcepts';
import { boardEdgeWords } from '../utils/countWords';
export type { GamePhase };

/** The phase, read off the board — ONE definition (one-coach P2, census
 *  group 14): `boardConcepts.phaseOfFen` (endgame by material, middlegame once
 *  development is done or the kings are castled and connected). The old rule
 *  here called any queenless board an ending and moved to the middlegame by
 *  ply count alone. `ply` is the fallback only for a board with no pieces. */
export function detectPhase(fen: string, ply: number): GamePhase {
  return phaseOfFen(fen) ?? (ply >= 16 ? 'middlegame' : 'opening');
}

/** A material lead, named by the pieces the BOARD shows (`boardEdgeWords`,
 *  the one board namer) — never by a point threshold, which called the
 *  exchange and a pawn "a piece" and two pawns "a pawn" (one-coach P2). */
function describeLead(fen: string, balance: number, student: 'w' | 'b'): string {
  const ahead: 'w' | 'b' = balance > 0 ? 'w' : 'b';
  // ONE PERSPECTIVE: the lesson is the student's side, so "you" / "they",
  // never a bare colour (narration sweep 2026-10-10).
  const side = ahead === student ? "you're" : "they're";
  const words = boardEdgeWords(fen, ahead, Math.abs(balance));
  const lead = Math.abs(balance) >= 8 ? `${side} winning — ${words} up.` : `${side} ${words} up.`;
  return openSentence(lead);
}

export interface ContinuationState {
  phase: GamePhase;
  /** The last material balance we announced, so we don't repeat it. */
  announcedBalance: number;
}

export function initialContinuationState(fen: string, ply: number): ContinuationState {
  return { phase: detectPhase(fen, ply), announcedBalance: 0 };
}

/**
 * Decide the narration (if any) after a move lands. Returns the updated
 * state and a keystone line, or null text for a routine move (stay silent).
 * Terminal results (mate/draw) are the caller's job — they always speak.
 */
export function continuationNarration(
  newFen: string,
  ply: number,
  prev: ContinuationState,
  /** The move that produced `newFen` — required, so a board read mid-recapture
   *  (Nxf6+ with …Bxf6 coming) is never announced as a piece won. */
  lastMove: LastMove | null,
  /** The student's side — the lesson's "you". */
  student: 'w' | 'b',
): { text: string | null; state: ContinuationState } {
  const phase = detectPhase(newFen, ply);
  // 1) Phase transition — the single most useful thing to call out.
  if (phase !== prev.phase && phase !== 'opening') {
    const text =
      phase === 'middlegame'
        ? "The pieces are developed and the kings are safe — it's a middlegame now."
        : 'The heavy pieces are coming off — this is an endgame now.';
    return { text, state: { phase, announcedBalance: prev.announcedBalance } };
  }
  // 2) Decisive, NEW material swing (≥ a full point of change, ≥ a pawn lead).
  const bal = settledBalance(newFen, lastMove);
  if (Math.abs(bal) >= 1 && Math.abs(bal - prev.announcedBalance) >= 2) {
    return { text: describeLead(newFen, bal, student), state: { phase, announcedBalance: bal } };
  }
  // 3) Routine move — silence.
  return { text: null, state: { phase, announcedBalance: prev.announcedBalance } };
}

/** The closing line when the game ends. */
export function continuationResult(
  isCheckmate: boolean,
  isDraw: boolean,
  sideToMove: 'w' | 'b',
  student: 'w' | 'b',
): string {
  if (isCheckmate) {
    // The side to move is the one that got mated.
    return sideToMove === student
      ? "Checkmate — they win. That's the whole game, opening to mate."
      : "Checkmate — you win. That's the whole game, opening to mate.";
  }
  if (isDraw) return "It's a draw — neither side could break through. That's the full game.";
  return "That's as far as we'll take it — a clear enough picture of the middlegame and endgame.";
}
