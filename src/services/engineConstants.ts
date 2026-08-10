/**
 * engineConstants
 * ---------------
 * Shared numeric thresholds for Stockfish evaluation output. Keeping
 * them in one place prevents the drift the chess-correctness audit
 * flagged (two independent MATE_EVAL_THRESHOLD declarations + one
 * 30000 literal, all expected to agree).
 *
 * Stockfish's UCI `info score mate <n>` is normalised to a centipawn
 * eval of ±MATE_EVAL_VALUE in stockfishEngine.parseMessage. Consumers
 * detect mate with `|eval| >= MATE_EVAL_THRESHOLD` — the threshold is
 * deliberately lower than the emitted value so partial tactical
 * scores (e.g. 25000 from an unusual multipv normalisation) still
 * read as forced mate.
 */

/** Centipawn value used when encoding a mate score. Emitted by the
 *  stockfish worker message parser; consumers should NOT compare
 *  directly to this number. Use MATE_EVAL_THRESHOLD instead. */
export const MATE_EVAL_VALUE = 30000;

/** Centipawn threshold for detecting a mate-encoded eval. Any eval
 *  with `Math.abs(eval) >= MATE_EVAL_THRESHOLD` represents a forced
 *  mate in the line. */
export const MATE_EVAL_THRESHOLD = 20000;

/** True when an evaluation represents a forced mate rather than a
 *  centipawn score. Use everywhere mate-vs-eval branching matters. */
export function isMateEval(evaluation: number | null | undefined): boolean {
  if (evaluation === null || evaluation === undefined) return false;
  return Math.abs(evaluation) >= MATE_EVAL_THRESHOLD;
}

// ─── MOVE-QUALITY BANDS ──────────────────────────────────────────────────────
//
// 🔒 STOCKFISH MEASURES THE DIFFERENCE BETWEEN A MISTAKE AND AN INACCURACY
// (David 2026-08-10: "Use stockfish as the standard… I meant Stockfish to
// measure mistake vs inaccuracy"). Two rules follow, and they are separate:
//
//   1. The NUMBER is always Stockfish's own measured delta — the eval before the
//      move against the eval after, from the mover's perspective. Never inferred
//      from a label, never fabricated. `autoAnalyzeGame` used to reconstruct it
//      BACKWARDS from the classification ("blunder → call it 350, mistake → call
//      it 175"), feeding invented centipawns into the mistake puzzles and the
//      weakness spine — the label deciding the measurement it was supposed to
//      come from.
//   2. The BOUNDARIES live here, once. They were duplicated: the review graded
//      50 / 100 / 300 and `moveRating` graded 20 / 50 / 100 / 200 / 400. So one
//      Stockfish number produced two different words in the same session — a
//      150-centipawn move was a MISTAKE in the post-game review and an
//      INACCURACY from the coach's mouth; a 350 was a BLUNDER in one and a
//      MISTAKE in the other. David, on exactly this: "Chop down into one model
//      to maintain consistency plz."
//
// The review's set is the one kept: it is the Stockfish/chess.com convention and
// it is what the app's accuracy percentages and move labels have always shown to
// paying users. The coach was the newcomer, so the coach conforms.
//
// These are BANDS, not a threshold for SPEAKING. What is worth interrupting a
// student for is pedagogy, and it lives in the rating-adaptive gate
// (`slipWarrantsInterjection`) and `callInaccuracy`'s own floor — making a word
// mean one thing everywhere must not make the coach talk more.

/** At or above this, the move gave up enough to be called an inaccuracy. */
export const INACCURACY_CP = 50;
/** At or above this, a mistake. */
export const MISTAKE_CP = 100;
/** At or above this, a blunder — unless the mover is still clearly winning. */
export const BLUNDER_CP = 300;
