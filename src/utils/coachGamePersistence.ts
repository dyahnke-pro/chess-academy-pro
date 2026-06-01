/**
 * Persistence floor for finished coach games.
 *
 * A finished coach game is saved to the `games` store and run through the
 * mistake / bad-habit / weakness pipeline by `finalizeGame`. We gate that
 * on a minimum ply count so a trivial misclick-resignation (or any other
 * 2-4 ply abandon) doesn't litter game history + generate junk "mistakes".
 *
 * The floor is applied to EVERY ending — resign, checkmate, timeout —
 * consistently (David 2026-06-01: "applied to all endings, not a
 * special-case for resign"). At 6 plies (3 full moves) it drops misclick
 * abandons while preserving real games (a 7-ply Scholar's Mate still
 * persists).
 */
export const MIN_PERSIST_PLIES = 6;

/** True when a finished game has enough moves to be worth saving + analysing. */
export function shouldPersistFinishedGame(plyCount: number): boolean {
  return plyCount >= MIN_PERSIST_PLIES;
}
