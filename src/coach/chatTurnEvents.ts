// chatTurnEvents — ONE leaf signal: "a student's turn was read".
//
// The ONE-CHAT reader runs in SHADOW first (docs/plans/2026-09-29-ONE-CHAT.md
// FINAL §5): every turn a person typed or spoke is read into the closed form in
// parallel with today's routing, and the two are compared. The switch to serve
// the reading is taken on MEASURED agreement — so the measurement is the build.
// A reader nobody can inspect is the same class of problem as an audit that
// reports green having verified nothing (CLAUDE.md "every algo-based build
// ships with an audit tool").
//
// A LEAF, like `coachDecisionEvents`: this module imports nothing; the door
// emits; `appAuditor` subscribes at boot and writes the audit row.

/** One student turn, read. Lane and kind ids only — the prose is already on
 *  the `coach-brain-answered` row; this carries a short preview so a
 *  disagreement can be read without a join. */
export interface ChatTurnRow {
  /** The surface the turn arrived on. */
  surface: string;
  /** Who produced the words: the student typing or speaking. Internal asks
   *  (hints, narration scaffolds) are never read. */
  askSource: 'typed' | 'spoken';
  /** The lane today's deterministic routing takes for this text. */
  fastPathLane: string;
  /** The lane that actually VOICED the answer (coachApi's intent), or null
   *  when no grounded lane spoke (a command, the brain's free text, or a
   *  surface that does not report it). */
  servedIntent: string | null;
  /** The reader's kind, or null when it produced none. */
  parsedKind: string | null;
  /** What the reading pointed at ("move:Ne4 piece:n@d5"), so a dropped named
   *  move is visible next to the answer. Null when nothing was named. */
  referents: string | null;
  /** How the reading was made: the deterministic square-answer path, the
   *  model, or why there is none. */
  parseSource: 'square-answer' | 'code' | 'llm' | 'llm-failed' | 'timeout';
  /** Did the reading survive validation against the board? null = no reading. */
  valid: boolean | null;
  /** Why validation refused it (a piece not on its square, an illegal move…). */
  invalidReason: string | null;
  /** The reading's kind maps to the same lane today's routing took. null when
   *  either side has nothing to compare. */
  agreed: boolean | null;
  /** The parsed kind has a live answerer (servable behind the flag). */
  answererLive: boolean | null;
  /** True when the flag was on and the answer was served FROM the reading. */
  servedParsed: boolean;
  /** Wall-clock of the read, in parallel with the answer. */
  latencyMs: number;
  /** The first 80 characters of what the student said. */
  askPreview: string;
  /** WHAT HAPPENED TO THE TURN (WO-CHAT-01 P0) — so a row says whether the
   *  student was answered, not only how the turn was read:
   *  `answered` a lane or computer voiced an answer · `command` the action
   *  router acted · `asked-back` the coach asked a clarifying question or
   *  refuted a premise · `stock` the honest stock line (nothing answered) ·
   *  `surface` a surface's own command answered it (Learn) · `error` the turn
   *  threw. */
  outcome: ChatTurnOutcome;
  /** The first 160 characters of what the coach answered (null: unknown —
   *  a surface answered it outside the door). */
  answerPreview: string | null;
  /** The student's language and the answer's (ISO-ish codes from
   *  `detectLanguage`); a mismatch is a defect (walk R3). */
  askLang: string;
  answerLang: string | null;
  /** Board/action markup that reached the student's text (`[BOARD:` / `[[`) —
   *  must never be true (native 2026-09-25: "[BOARD: highlight:e1:yellow]"). */
  leakedMarkup: boolean;
  /** Wall-clock from the turn reaching the door to the answer (ms); null when
   *  a surface answered it outside the door. */
  totalMs: number | null;
}

export type ChatTurnOutcome = 'answered' | 'command' | 'asked-back' | 'stock' | 'surface' | 'error';

type Listener = (row: ChatTurnRow) => void;
const listeners = new Set<Listener>();

/** Subscribe. Returns the unsubscribe. */
export function onChatTurn(cb: Listener): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

/** Emit. Never throws — telemetry must not fail a turn. */
export function emitChatTurn(row: ChatTurnRow): void {
  for (const cb of listeners) {
    try { cb(row); } catch { /* telemetry never breaks the coach */ }
  }
}

/** Tests. */
export function resetChatTurnListeners(): void {
  listeners.clear();
}
