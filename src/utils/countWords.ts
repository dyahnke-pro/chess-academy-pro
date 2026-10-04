/**
 * MATERIAL BY COUNT ALONE — what a point total may truthfully be called when
 * nothing says which pieces make it up. "A pawn" and "two pawns" are always
 * true of 1 and 2; a 3 can be a knight, a bishop, three pawns or the exchange
 * and a pawn, so it is said as points (clean-pass walk VRUh4Qgh: "a piece up"
 * for the exchange and a pawn). A named piece comes only from code that knows
 * the pieces — the exchange ledger, `conversionMethod.edgeWords`.
 */
export function countWords(points: number, opts: { unit?: boolean } = {}): string {
  const n = Math.round(points);
  if (n === 1) return 'a pawn';
  if (n === 2) return 'two pawns';
  return opts.unit ? `${n} points of material` : `${n} points`;
}
