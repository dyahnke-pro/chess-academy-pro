/** The ply a position was played from, read off its own FEN (0 = White's
 *  first move). */
export function plyOfFen(fen: string): number {
  const parts = fen.split(' ');
  const full = Number(parts[5] ?? 1);
  return (Math.max(1, Number.isFinite(full) ? full : 1) - 1) * 2 + (parts[1] === 'b' ? 1 : 0);
}
