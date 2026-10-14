/** Why a piece is badly placed, said plainly: how many squares it can reach.
 *  The one wording for every surface that names a passive or worst piece. */
export function reachWords(m: number): string {
  return m === 0 ? 'can go nowhere' : m === 1 ? 'has one square to go to' : `has only ${m} squares to go to`;
}
