/**
 * THE KEY FOR ONE TACTIC CLAIM — a pattern on a set of squares. One leaf so
 * every lane that can state a tactic (the instant tactic line, the composer's
 * concept clause, the board-reading behaviours) keys it the same way, and the
 * say-once ledger can see that "You have a pin: bishop on b7 pins rook on f3"
 * and "Your bishop on b7 pins their rook on f3" are one claim (Sicilian walk
 * 2026-09-27).
 */
import { plyOfFen } from '../utils/plyOfFen';

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

/** A PIECE IS LOOSE ON THIS SQUARE (duplicate map #3, 2026-10-20: g1 14.Rd5,
 *  the bishop on f4 said loose three times in two turns by four templates).
 *  Every producer that states the fact attaches it, so say-once sees one claim
 *  across waves and turns. `since` is the ply its spell of being loose began. */
export function looseKey(square: string, since: number): string {
  return `loose:${square}:${since}`;
}

/** …and the one re-say after the student moved and left it loose: its own
 *  key, so it is said once ("still"), never again that spell (#4, 2026-10-20). */
export function looseStillKey(square: string, since: number): string {
  return `loose-still:${square}:${since}`;
}

/** One spell of a piece being loose: which piece, from which ply. */
export interface LooseSpell { readonly piece: string; readonly since: number }
export type LooseSpells = ReadonlyMap<string, LooseSpell>;

/** The ply of a board — the one reading lives in `utils/plyOfFen`. */
export { plyOfFen };

/** The spells after this board: a piece loose on a square it was loose on
 *  before keeps its spell; a new one starts one; a square no longer loose
 *  ends it. A spell that starts after this ply (a takeback) is forgotten. */
export function nextLooseSpells(prev: LooseSpells, loose: ReadonlyArray<{ square: string; piece: string }>, ply: number): Map<string, LooseSpell> {
  const out = new Map<string, LooseSpell>();
  for (const { square, piece } of loose) {
    const was = prev.get(square);
    out.set(square, was && was.piece === piece && was.since <= ply ? was : { piece, since: ply });
  }
  return out;
}

/** THE ONE RULE FOR A LOOSE PIECE (#4, 2026-10-20). Within a turn and across
 *  its waves: one warning (`loose`). Across turns the sentence never repeats;
 *  if the student moved and left it loose, it is said once more in its
 *  "still" form (`loose-still`), and then not again that spell. */
export function looseClaim(square: string, ply: number, spells?: LooseSpells | null): { key: string; still: boolean } {
  const spell = spells?.get(square);
  if (spell && spell.since < ply) return { key: looseStillKey(square, spell.since), still: true };
  return { key: looseKey(square, spell?.since ?? ply), still: false };
}

/** ATTACKERS AGAINST DEFENDERS ON ONE SQUARE (duplicate map #6: "count before
 *  you take on e5" and "their rook on e8 is tied down … hit twice, guarded
 *  twice" are one count). Every reading of the count shares it. */
export function countKey(square: string): string {
  return `count:${square}`;
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

/** THE KEY FOR ONE PAWN KICK — the piece on this square chased by a pawn.
 *  "e5 kicks their knight off d4" (the move's point) and "The rule behind e5:
 *  kick their knight off d4" (the principle) read one `pawnHit` (OS-11 smaller
 *  sets, g2). */
export function kickKey(square: string): string {
  return `kick:${square}`;
}
