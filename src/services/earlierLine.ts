// earlierLine — THE FREE SECOND READ (WO-DECIDER-02): the principal line the
// same search printed two depths shallower. A leaf with no imports, read by the
// engine singleton and the pool worker alike, so neither carries its own copy
// and a test that mocks the engine still loads the pool.

/** The best line at the deepest exact iteration at least two below `depth`
 *  (`AnalysisLine.earlier`). Two, not one: Stockfish re-searches the best move
 *  first, so the line one iteration back is usually the same search. */
export function earlierLine(byDepth: ReadonlyMap<number, string[]> | undefined, depth: number): { depth: number; moves: string[] } | null {
  if (!byDepth) return null;
  let best: { depth: number; moves: string[] } | null = null;
  for (const [d, moves] of byDepth) {
    if (d <= depth - 2 && moves.length > 0 && (!best || d > best.depth)) best = { depth: d, moves };
  }
  return best;
}
