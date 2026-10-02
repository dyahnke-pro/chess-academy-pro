// searchDepthEvents — ONE leaf signal: "the search-depth computer settled".
//
// Same shape as `coachDecisionEvents`: `searchDepth` is a pure computer and
// must not import the database to report on itself, so it emits here and a
// subscriber wired at boot (appAuditor) forwards the row to the audit log.
//
// WHAT THE ROW IS FOR — distributions an audit can hold: how often a search
// settled versus ran out of budget, how deep each purpose really went, and
// whether sharp positions were actually searched deeper than quiet ones. A
// verdict spoken off a search that never settled is the failure this exists
// to make visible.

export interface SearchDepthRow {
  purpose: string;
  /** 0-3, how sharp the position read before searching. */
  sharpness: number;
  /** The floor this search had to reach (rises with sharpness). */
  minDepth: number;
  depthReached: number;
  /** Did the best move and the win chance hold over the last steps? */
  stable: boolean;
  reason: 'stable' | 'max-depth' | 'budget';
  /** Every depth the search passed through, best move + win% at each. */
  steps: Array<{ depth: number; bestMove: string; win: number }>;
  elapsedMs: number;
}

type Listener = (row: SearchDepthRow) => void;
const listeners = new Set<Listener>();

export function onSearchDepth(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function emitSearchDepth(row: SearchDepthRow): void {
  for (const fn of listeners) {
    try { fn(row); } catch { /* a listener never breaks the search */ }
  }
}
