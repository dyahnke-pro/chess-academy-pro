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

/** THE ONE DEPTH A COACH TURN IS READ AT — hint lane and grading lane alike.
 *
 * 🔒 TWO DEPTHS MEANT TWO BEST MOVES FOR ONE POSITION, AND THE COACH
 * CONTRADICTED ITSELF OUT LOUD (David's prod game, 2026-08-16). At
 * `6k1/1p4pp/p3p3/1q6/4P3/1P2QPPP/5R1K/3r4` the hint lane read depth 12 and
 * said "your strongest reply here is Kg2"; the capture lane read depth 14 and
 * logged the same position as `bestSan=Qc3`. He was told one move and then
 * marked wrong for not finding the other — and the second one is what reached
 * My Mistakes and the drill queue.
 *
 * There is no version of this where disagreeing is correct, so the depth is
 * not a per-lane choice any more. It is set at the GRADING depth, because the
 * read that judges the student must never be the shallower one; the hint,
 * which already lives behind a time budget, now shares it.
 *
 * The cache is keyed `(fen, depth)`, so agreeing also means the second lane
 * gets a hit instead of running a whole second search on the same board —
 * fewer engine seconds per turn, not more.
 */
export const COACH_TURN_DEPTH = 14;

// ── THE CHESS.COM BANDS, IN CHESS.COM'S OWN CURRENCY ────────────────────────
//
// 🔒 THE COUNTS DID NOT MATCH CHESS.COM BECAUSE THE TWO HALVES OF THE REVIEW
// SPOKE DIFFERENT LANGUAGES (David 2026-08-12: "I want the review to match
// chess.com's level so inaccuracies, mistakes, and blunders are listed the
// same, as well as the move percentage").
//
// The ACCURACY percentage already used the published model — win% via the
// lichess sigmoid, exponential decay, harmonic mean. But the move LABELS were
// raw centipawns (50/100/300), and chess.com does not grade in centipawns. It
// grades on EXPECTED POINTS LOST, which is the same quantity the accuracy
// figure is built from:
//
//     Best        0.00          Inaccuracy  0.05 – 0.10
//     Excellent   0.00 – 0.02   Mistake     0.10 – 0.20
//     Good        0.02 – 0.05   Blunder     0.20 – 1.00
//
// Expected points run 0–1 and win% runs 0–100, so the bands below are those
// numbers × 100. chess.com's own explanation of why this matters is exactly
// the bug we had: "the same centipawn loss can be a mistake in a tense
// position and barely an inaccuracy in a decided one."
//
// That is also why the old code needed a hand-rolled `STILL_WINNING_CP = 250`
// escape hatch — it was approximating, in the wrong currency, what win% does
// natively. Giving back 300cp at +9 barely moves the win probability; losing
// 100cp at 0.00 moves it a lot. Grade in win% and the patch is unnecessary.
//
// Source: https://support.chess.com/en/articles/8572705
/** Win-percentage points lost. At or above this, an inaccuracy. */
export const INACCURACY_WIN_PCT = 5;
/** At or above this, a mistake. */
export const MISTAKE_WIN_PCT = 10;
/** At or above this, a blunder. */
export const BLUNDER_WIN_PCT = 20;
/** Below this the move is "good"; above it and under inaccuracy, still good but
 *  no longer excellent. Kept so the bands stay a faithful copy of the table. */
export const EXCELLENT_WIN_PCT = 2;

/** The Elo the engine will ACTUALLY be limited to, clamped into the range
 *  Stockfish's `UCI_Elo` accepts.
 *
 *  Lives here, in the leaf, for two reasons. One owner, so the number in the
 *  audit line is the number in the engine — the old line printed the REQUESTED
 *  rating next to a search that had not been told any rating, and a label that
 *  reads as delivery is how a dead wire survives for weeks. And no coupling to
 *  `stockfishEngine`, which every coach test mocks: exporting it from there
 *  made the audit call `undefined()` under test, throwing the timed search into
 *  the recovery ladder. A logging helper must never be able to change which
 *  search runs.
 */
export const ENGINE_ELO_MIN = 1320;
export const ENGINE_ELO_MAX = 3190;
export function limitStrengthElo(targetElo: number): number {
  return Math.max(ENGINE_ELO_MIN, Math.min(ENGINE_ELO_MAX, Math.round(targetElo)));
}
