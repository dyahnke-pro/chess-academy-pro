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
  // A DISCOVERY IN WAITING IS ITS BLOCKER AND ITS SLIDER (replay 2026-10-19,
  // moves 27–30: "their king on f8 is hiding behind your knight on f6", then
  // on f7, then "your knight on f6 is a discovered attack in waiting" — one
  // idea, three keys, because the king stepped along the same file). Squares
  // are [blocker, slider, target], the detector's order; the target can move.
  if (/discover/i.test(id) && squares.length >= 2) return `concept:discovery:${squares[0]}${squares[1]}`;
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

/** THE KEY FOR ONE LOOSE PIECE — a piece of the student's attacked and unguarded
 *  on this square. The tactic warning's proof ("nothing guards it: Rxf4"), the
 *  hanging-piece line and the danger stake all state it; one key lets the
 *  say-once ledger keep one (OS-11 #3, g1 13.Rad1 → 14.Rd5: the bishop on f4
 *  said loose three times in two turns). */
export function looseKey(square: string): string {
  return `loose:${square}`;
}

/** THE KEY FOR ONE OUTPOST — a square no enemy pawn can attack, held by a
 *  minor. "Your Nf6 lands on the f6 outpost" and "g5 makes f6 an outpost for
 *  the knight" are one fact (OS-11 #4, g1 29.Nf6 → 31.g5). */
export function outpostKey(square: string): string {
  return `outpost:${square}`;
}

/** THE KEY FOR ONE HOLE IN THEIR CAMP — a square no pawn of theirs can cover
 *  again. The story's "c5 has a cost for them: no pawn of theirs can cover d5"
 *  and the pawn read's "that square stays a hole for them" are one fact
 *  (OS-11 #5, g3 10.Nf3 → 11.O-O). */
export function holeKey(square: string): string {
  return `hole:${square}`;
}

/** THE KEY FOR ONE COUNT ON ONE SQUARE — attackers against defenders. "Count
 *  before you take on e5: two attackers against two defenders" and "their rook
 *  is tied down: you hit e5 twice and it is guarded twice" read one count
 *  (OS-11 #6, g3 10.Nf3). */
export function countKey(square: string): string {
  return `count:${square}`;
}

/** THE KEY FOR ONE PAWN KICK — the piece on this square chased by a pawn.
 *  "e5 kicks their knight off d4" (the move's point) and "The rule behind e5:
 *  kick their knight off d4" (the principle) read one `pawnHit` (OS-11 smaller
 *  sets, g2). */
export function kickKey(square: string): string {
  return `kick:${square}`;
}
