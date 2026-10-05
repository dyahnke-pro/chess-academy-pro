// thinkingTransferEvents — ONE leaf signal per transfer reading (CLAUDE.md:
// every algo-based build ships with an audit tool). The transfer computer
// decides whether a step the student KNOWS in lessons has reached their GAMES;
// this carries that decision out as a distribution an audit can trend.
//
// Imports NOTHING (same shape as coachDecisionEvents / thinkingLessonEvents):
// the reader emits, a subscriber in appAuditor forwards.

export interface ThinkingTransferStepRow {
  step: string;
  cls: string;
  greenAt: number | null;
  beforeGames: number;
  beforeSlips: number;
  afterGames: number;
  afterSlips: number;
  useProven: boolean;
}

export interface ThinkingTransferRow {
  /** Counts per class (transferred / known-not-used / unmeasured / not-known / grey). */
  counts: Record<string, number>;
  /** Analysed games the before/after rates were read over. */
  games: number;
  steps: ThinkingTransferStepRow[];
}

type Listener = (row: ThinkingTransferRow) => void;
const listeners = new Set<Listener>();

export function onThinkingTransfer(cb: Listener): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function emitThinkingTransfer(row: ThinkingTransferRow): void {
  for (const cb of listeners) {
    try { cb(row); } catch { /* a subscriber never breaks the reader */ }
  }
}

export function resetThinkingTransferListeners(): void {
  listeners.clear();
}
