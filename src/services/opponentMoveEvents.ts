// opponentMoveEvents — ONE leaf signal: "an engine opponent just moved, at
// this strength, for this purpose".
//
// Same shape as `coachDecisionEvents` / `searchDepthEvents`: the engine
// services must not import the database to report on themselves, so they emit
// here and a subscriber wired at boot (appAuditor) forwards each row to the
// audit log as `coach-opponent-strength`.
//
// WHAT THE ROW IS FOR (CLAUDE.md "every algo-based build ships with an audit
// tool"): the opponent's strength is a computed decision — the student's live
// estimate plus the one offset table. The older `coach-opponent-move-source`
// lines are free text; this row lets an audit hold the CONTRACT that every
// sparring opponent read the same number: `target === max(floor, studentElo +
// offset)` and `offset === DIFFICULTY_OFFSET[difficulty]`, with demos at full
// strength (`target === null`).

export interface OpponentMoveRow {
  surface: string;
  purpose: 'spar' | 'lesson' | 'play-out' | 'demo';
  studentElo: number;
  difficulty: string;
  offset: number;
  /** The target rating, or null for a full-strength demo. */
  target: number | null;
  /** What the engine was actually capped at (`UCI_Elo` has its own floor). */
  engineElo: number | null;
  /** Which layer produced the move (taught-slip, amateur-band, stockfish-best…). */
  source: string;
}

type Listener = (row: OpponentMoveRow) => void;
const listeners = new Set<Listener>();

export function onOpponentMove(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** Never throws into the caller — a move must not fail because telemetry did. */
export function emitOpponentMove(row: OpponentMoveRow): void {
  for (const fn of listeners) {
    try { fn(row); } catch { /* telemetry never breaks the opponent */ }
  }
}
