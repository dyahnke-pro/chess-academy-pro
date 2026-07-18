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

const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Material balance from a FEN — positive = White ahead, in points. */
export function materialBalance(fen: string): number {
  const board = fen.split(' ')[0];
  let bal = 0;
  for (const ch of board) {
    const lower = ch.toLowerCase();
    const v = PIECE_VALUE[lower];
    if (v === undefined) continue;
    bal += ch === lower ? -v : v; // lowercase = Black, uppercase = White
  }
  return bal;
}

/** Total non-pawn, non-king material on the board (both sides), in points. */
export function nonPawnMaterial(fen: string): number {
  const board = fen.split(' ')[0];
  let total = 0;
  for (const ch of board) {
    const l = ch.toLowerCase();
    if (l === 'n' || l === 'b' || l === 'r' || l === 'q') total += PIECE_VALUE[l];
  }
  return total;
}

export type GamePhase = 'opening' | 'middlegame' | 'endgame';

/** Classify the phase from the position. Endgame once the queens are off OR
 *  heavy material is low; middlegame once development is done (by ply). */
export function detectPhase(fen: string, ply: number): GamePhase {
  const board = fen.split(' ')[0];
  const hasQueens = /q/i.test(board);
  const npm = nonPawnMaterial(fen);
  if (!hasQueens || npm <= 16) return 'endgame';
  if (ply >= 16) return 'middlegame';
  return 'opening';
}

/** Phrase a material lead by size, named concretely (voice rule 1). */
function describeLead(balance: number): string {
  const side = balance > 0 ? 'White' : 'Black';
  const m = Math.abs(balance);
  if (m >= 8) return `${side} is winning — a whole queen's worth of material ahead.`;
  if (m >= 5) return `${side} has won a rook's worth of material.`;
  if (m >= 3) return `${side} is up a piece.`;
  return `${side} has won a pawn.`;
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
): { text: string | null; state: ContinuationState } {
  const phase = detectPhase(newFen, ply);
  // 1) Phase transition — the single most useful thing to call out.
  if (phase !== prev.phase && phase !== 'opening') {
    const text =
      phase === 'middlegame'
        ? "The pieces are developed and the kings are safe — we're into the middlegame."
        : 'The heavy pieces are coming off — this is an endgame now.';
    return { text, state: { phase, announcedBalance: prev.announcedBalance } };
  }
  // 2) Decisive, NEW material swing (≥ a full point of change, ≥ a pawn lead).
  const bal = materialBalance(newFen);
  if (Math.abs(bal) >= 1 && Math.abs(bal - prev.announcedBalance) >= 2) {
    return { text: describeLead(bal), state: { phase, announcedBalance: bal } };
  }
  // 3) Routine move — silence.
  return { text: null, state: { phase, announcedBalance: prev.announcedBalance } };
}

/** The closing line when the game ends. */
export function continuationResult(
  isCheckmate: boolean,
  isDraw: boolean,
  sideToMove: 'w' | 'b',
): string {
  if (isCheckmate) {
    // The side to move is the one that got mated.
    const winner = sideToMove === 'w' ? 'Black' : 'White';
    return `Checkmate — ${winner} wins. That's the whole game, opening to mate.`;
  }
  if (isDraw) return "It's a draw — neither side could break through. That's the full game.";
  return "That's as far as we'll take it — a clear enough picture of the middlegame and endgame.";
}
