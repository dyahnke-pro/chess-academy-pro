/**
 * ONE WIN-CHANCE CONVERTER (WO-STORY-MATRIX-01 P1-2, 2026-10-30).
 *
 * Two questions every engine reader asks, each answered once here:
 *
 *   1. What is a centipawn score worth in WINNING CHANCES? Lichess's curve,
 *      slope 0.00368208. It was written out three times — accuracy's
 *      `winPercent`, review's turning points, the human-move model — each its
 *      own literal, so a fourth reader picked a copy and a tuned slope could
 *      never reach them all. That is the rot rule's shape (David 2026-09-08:
 *      "FIX ANY PROBLEMS LIKE THIS WHEN YOU COME ACROSS THEM").
 *   2. What is an engine LINE worth to one seat? White-POV centipawns, a mate
 *      folded to ±100000, signed for the seat. Five readers kept a private copy
 *      with a private mate constant (speed-run reads, order reads, opponent
 *      reads, deliberation, the refuted alternative's one cost).
 *
 * The curve takes the centipawns as given. Folding a mate score BEFORE it is
 * the caller's decision and stays at the call: accuracy folds an engine mate to
 * ±1500 (`accuracyService.capEval`, lichess's accuracy page does the same), the
 * turning points feed the raw score (a ±100000 mate saturates on its own).
 *
 * PURE and a LEAF: zero imports, so any fact-computer can read it without
 * dragging in the engine, the db or the store. Gate: `oneWinChance.gate.test.ts`
 * — no copy of the slope anywhere else, and no new private mate fold.
 */

/** Lichess's slope (https://lichess.org/page/accuracy). */
const SLOPE = 0.00368208;

/** A forced mate, as centipawns, when a line's value is read for a seat. */
const MATE_CP = 100000;

/** Lichess's winning chances, −1..1, for the side `cp` is from. */
export function winningChances(cp: number): number {
  return 2 / (1 + Math.exp(-SLOPE * cp)) - 1;
}

/** The same curve as a percentage, 0..100: 200cp ≈ 67, 500cp ≈ 86. */
export function winChancePercent(cp: number): number {
  return 50 + 50 * winningChances(cp);
}

/** An engine line as every surface hands it in: White-POV centipawns, and the
 *  mate count when the engine found one (positive = White mates). */
export interface LineScore {
  evaluation: number;
  mate?: number | null;
}

/** A line's value from `seat`'s side, in centipawns (a mate is ±100000). */
export function seatCp(line: LineScore, seat: 'w' | 'b'): number {
  return (line.mate != null ? (line.mate > 0 ? MATE_CP : -MATE_CP) : line.evaluation) * (seat === 'w' ? 1 : -1);
}

/** A line's value for the side to move at `fen`. */
export function moverCp(fen: string, line: LineScore): number {
  return seatCp(line, fen.split(' ')[1] === 'w' ? 'w' : 'b');
}
