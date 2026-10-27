/**
 * A move with its number, the way a reader knows it: `4.Bd3` for White,
 * `4…Bd3` for Black. `plyIndex` is 0-based from the start position (ply 0 is
 * White's first move), so it is the count of moves played BEFORE this one.
 */
export function numberedMove(plyIndex: number, san: string): string {
  const moveNumber = Math.floor(plyIndex / 2) + 1;
  return `${moveNumber}${plyIndex % 2 === 0 ? '.' : '…'}${san}`;
}
