/**
 * countFullMovesInPgn — count FULL moves (white+black pairs) in PGN
 * move-text, robust to the junk imported game PGNs carry.
 *
 * A chess "move" is white + black, so the count is plies / 2. The naive
 * `pgn.split(/\s+/)` filter only stripped move numbers ("12.") and the
 * result token — but chess.com / lichess exports embed `{[%clk 0:03:00]}`
 * and `{[%eval 0.24]}` COMMENTS whose whitespace-split tokens slipped
 * through the filter and were counted as plies, inflating the move count
 * (David 2026-06-11: "is that the right move count?"). Strip comments +
 * NAGs first, then count.
 */
export function countFullMovesInPgn(pgn: string): number {
  if (!pgn) return 0;
  const cleaned = pgn
    .replace(/\{[^}]*\}/g, ' ') // {clk}/{eval}/any comment
    .replace(/\$\d+/g, ' '); // $N NAG annotations
  const plies = cleaned
    .split(/\s+/)
    .filter((t) => t && !/^\d+\.+$/.test(t) && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t))
    .length;
  return Math.ceil(plies / 2);
}
