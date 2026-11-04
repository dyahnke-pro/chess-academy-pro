// everythingEvents — EVERY LINE THE COACH WEIGHED, SAID OR HELD (David
// 2026-11-04: "Unlock everything right now so we can actually build a proper
// narration plan. Then we dial in what is said in each tab").
//
// Each deciding place reports every fact it was handed — the computer that made
// it, its words, whether it spoke, and if not, why — so a run of the real app
// (`scripts/everything-one-game.mjs`: Review on one game, the real engine and
// data) collects everything the app weighed on each move, read off the app's
// own code rather than a list somebody wrote. The decision points that
// report: the one door (`coachDecider.coachTurn` — both the moment door and
// Learn's turn door), the one composer
// (`thoughtComposer.composeThought` — lessons and Review's per-move thought),
// Review's finished walk (the lines added outside the doors: the opening, the
// story, the engine's projected lines), and Learn's voice owner (a line the
// focus or a mission kept off the voice).
//
// A LEAF, like `coachDecisionEvents`: zero imports, so a pure computer can
// report without reaching the database. Nothing in the app listens; only the
// run script subscribes, and every reporter checks `everythingListening()`
// first, so a student's device builds nothing.

/** One line a deciding place weighed. */
export interface EverythingLine {
  /** The computer that made it (a `COMPUTER_CATALOG` key, a Learn lane, a
   *  Review facet tag). */
  computer: string;
  text: string;
  /** It reached the voice (or the walk's text). */
  said: boolean;
  /** Why it did not — the place's own reason (held, subsumed, below the bar,
   *  said already, the voice owner…). Null when it was said. */
  why: string | null;
  /** The board its computer read, when the fact carries one. */
  fen?: string | null;
}

/** The position a row is about: the board after the move it describes. */
export interface EverythingAt {
  fen: string;
  ply: number | null;
  san?: string | null;
}

/** Which deciding place reported. */
export type EverythingDoor = 'moment' | 'learn-turn' | 'composer' | 'review-walk' | 'voice-owner';

export interface EverythingRow {
  /** The surface that asked (Learn, Review, a lesson, chat, a live board…). */
  surface: string;
  door: EverythingDoor;
  at: EverythingAt | null;
  lines: EverythingLine[];
  /** Arrival order. */
  seq: number;
}

type Listener = (row: EverythingRow) => void;
const listeners = new Set<Listener>();
let seq = 0;

/** True only while something listens (the run script). Reporters check this before
 *  building a row. */
export function everythingListening(): boolean {
  return listeners.size > 0;
}

export function onEverything(cb: Listener): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

/** Report a row. A row with no `at` takes the board its first line's computer
 *  read. Never throws into the caller. */
export function emitEverything(row: { surface: string; door: EverythingDoor; at?: EverythingAt | null; lines: EverythingLine[] }): void {
  if (listeners.size === 0 || row.lines.length === 0) return;
  const lineFen = row.lines.find((l) => l.fen)?.fen ?? null;
  const at = row.at ?? (lineFen ? { fen: lineFen, ply: null } : null);
  seq += 1;
  const out: EverythingRow = { surface: row.surface, door: row.door, at, lines: row.lines, seq };
  for (const cb of listeners) {
    try { cb(out); } catch { /* a listener never breaks the coach */ }
  }
}

/** Test helper. */
export function resetEverything(): void {
  listeners.clear();
  seq = 0;
}
