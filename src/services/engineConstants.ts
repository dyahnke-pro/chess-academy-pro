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
