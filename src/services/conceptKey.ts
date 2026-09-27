/**
 * THE KEY FOR ONE TACTIC CLAIM — a pattern on a set of squares. One leaf so
 * every lane that can state a tactic (the instant tactic line, the composer's
 * concept clause, the board-reading behaviours) keys it the same way, and the
 * say-once ledger can see that "You have a pin: bishop on b7 pins rook on f3"
 * and "Your bishop on b7 pins their rook on f3" are one claim (Sicilian walk
 * 2026-09-27).
 */
export function conceptInstanceKey(id: string, squares: readonly string[]): string {
  // A BATTERY IS ITS TARGET (hand walk 2026-09-27, Alekhine: "your rooks on e1
  // and e4 form a battery … bearing down on e6", then "after R1e2 … your rooks
  // on e2 and e4 form a battery … on e6"). Which back square the stack uses is
  // not a new idea; the pressure on e6 is the idea. Target is the last square.
  if (/battery/i.test(id) && squares.length > 0) return `concept:battery:${squares[squares.length - 1]}`;
  return `concept:${id}:${[...squares].sort().join('')}`;
}

/** THE KEY FOR ONE FORK THREAT — a knight (or any piece) that can land on a
 *  square and hit these targets. The latent-fork clause ("Watch c7 — a knight
 *  lands there in 2 and forks your rook on e8 and rook on a8") and the
 *  opponent-intent behaviour ("The opponent wants Nc7, forking your rook on a8
 *  and your rook on e8") are one claim (Bowdler walk 2026-09-27, plies 18/24). */
export function forkThreatKey(landing: string, targets: readonly string[]): string {
  return `fork-threat:${landing}:${[...targets].sort().join('')}`;
}
