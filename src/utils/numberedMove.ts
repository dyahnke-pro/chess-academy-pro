/**
 * A move with its number, the way a reader knows it: `4.Bd3` for White,
 * `4…Bd3` for Black. `plyIndex` is 0-based from the start position (ply 0 is
 * White's first move), so it is the count of moves played BEFORE this one.
 */
export function numberedMove(plyIndex: number, san: string): string {
  const moveNumber = Math.floor(plyIndex / 2) + 1;
  return `${moveNumber}${plyIndex % 2 === 0 ? '.' : '…'}${san}`;
}

/** A run of moves the way a reader knows it — `11.O-O Nbd7 12.Re1`, or
 *  `11…Nbd7 12.Re1` when it starts on Black's move. `startPly` is the ply
 *  index of `sans[0]`, as in `numberedMove`. */
export function numberedLine(startPly: number, sans: readonly string[]): string {
  return sans
    .map((san, i) => (i === 0 || (startPly + i) % 2 === 0 ? numberedMove(startPly + i, san) : san))
    .join(' ');
}
