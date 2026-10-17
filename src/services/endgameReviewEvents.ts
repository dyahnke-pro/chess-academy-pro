// endgameReviewEvents — ONE leaf signal for the endgame spaced-review algo
// (David 2026-10-17: "Make sure the algo is attached as well"). The ladder in
// `endgameProgressService` decides when a played position comes back; it is a
// pure-ish service and must not import the auditor, so it emits here and a
// subscriber in appAuditor writes the row.
//
// TWO decisions, one row shape:
//   'scheduled' — a playout landed: did it climb the ladder (clean) or fall
//                 back to the bottom (mistakes), and how far out is it now;
//   'due'       — the list a surface asked for: which lessons came due, how
//                 many positions, on which rungs.

export interface EndgameReviewRow {
  event: 'scheduled' | 'due';
  /** scheduled: the lesson played. due: null. */
  lessonId: string | null;
  /** scheduled: the play had no wrong move. due: null. */
  clean: boolean | null;
  /** scheduled: the rung before and after the play. due: null. */
  stepBefore: number | null;
  stepAfter: number | null;
  /** scheduled: days until it comes back. due: null. */
  intervalDays: number | null;
  /** due: lessons and positions due now. scheduled: null. */
  lessons: number | null;
  positions: number | null;
}

type Listener = (row: EndgameReviewRow) => void;
const listeners = new Set<Listener>();

export function onEndgameReview(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function emitEndgameReview(row: EndgameReviewRow): void {
  for (const fn of listeners) {
    try { fn(row); } catch { /* a listener never breaks the play */ }
  }
}
