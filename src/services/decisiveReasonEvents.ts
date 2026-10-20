// decisiveReasonEvents — ONE leaf signal: "the reason computer gave its verdict".
//
// Same shape as `searchDepthEvents`: `decisiveReason` is a pure computer and
// must not import the database to report on itself, so a SURFACE emits here
// once it has used a reason, and a subscriber wired at boot (appAuditor)
// forwards the row to the audit log (David 2026-10-17: "make sure it's also
// wired into the algos").
//
// WHAT THE ROW IS FOR — distributions an audit can hold: how often a move had
// THE reason versus A reason versus none (close), which source carried it, and
// whether the stake really covered the gap. A `the` row whose stake falls under
// the covering share would be the computer naming a reason that does not
// explain the move — the failure this exists to make visible.

interface DecisiveReasonRow {
  /** Which surface used the verdict. */
  surface: 'learn' | 'review' | 'chat';
  kind: 'the' | 'a' | 'close';
  source: 'material' | 'stops' | 'prepares' | 'description' | null;
  about: 'move' | 'alternative' | null;
  gapCp: number;
  stakeCp: number | null;
  /** The skill the reason posed for the record, or null (A reason poses none). */
  posedTag: string | null;
  /** Whose move: the student found it (held), missed it (broken), or it was
   *  explained without being asked (asked / not a student decision). */
  outcome: 'held' | 'broken' | 'explained';
}

type Listener = (row: DecisiveReasonRow) => void;
const listeners = new Set<Listener>();

export function onDecisiveReason(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function emitDecisiveReason(row: DecisiveReasonRow): void {
  for (const fn of listeners) {
    try { fn(row); } catch { /* a listener never breaks the turn */ }
  }
}
