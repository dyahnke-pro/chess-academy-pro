/**
 * positionProvenance — WHERE A FEN CAME FROM, AS A FACT RATHER THAN A PROMISE
 * (2026-09-21).
 *
 * 🔒 THE G0 HOLE THIS CLOSES. `set_board_position` accepted a raw FEN for any
 * "deep" position, policed by two things G0 names as the disease itself:
 *
 *   - a PROMPT begging the model — "Do NOT hand-write an opening FEN from
 *     memory … never one you recalled";
 *   - a VALIDATOR rejecting FENs whose fullmove number was ≤ 12.
 *
 * G0's test is explicit: *if you are adding a validator, a gate, a regen, a
 * claim-stripper, or a prompt that says "don't hallucinate" — STOP. Every one of
 * those exists only because the LLM is still deciding.* Both were exactly that,
 * and neither worked. The prompt was unenforceable — nothing on earth checks
 * whether a FEN "came from a tool result". The validator measured the wrong
 * thing: a fullmove number is a property of the STRING, not of its origin, so a
 * hallucinated endgame with `… w - - 0 47` sailed through while a real position
 * on move 9 was refused. The Catalan-Na3 fantasy it was written for is the
 * opening-phase case; the identical failure past move 12 was simply unguarded.
 *
 * The fix is not a better validator. It is to make the question ANSWERABLE:
 * code records every position IT produced, and the raw-FEN path accepts only
 * those. A FEN recalled from training is not in the set — not because we judged
 * it fake, but because nothing in this app ever computed it. That is the
 * difference between a gate that watches and a code path that cannot express
 * the wrong answer.
 *
 * 🚨 IDENTITY IS THE FIRST FOUR FIELDS, NOT THE STRING. Halfmove and fullmove
 * clocks differ between two honest routes to the same board (replaying a line
 * from the start vs. loading a game at that ply), and a model echoing a FEN back
 * may round-trip the clocks differently. Comparing full strings would refuse
 * real positions, which is the worse error here — so identity is placement +
 * side to move + castling + en-passant, which is what "the same position" means
 * on a board.
 */

/** Bounded: this is a short-lived record of one conversation's positions, not
 *  a store. Old entries fall off rather than growing without limit. */
const MAX_REMEMBERED = 256;

/** Where a position came from. Recorded so a refusal can say what IS available,
 *  and so an audit can tell "the app never computed this" from "the app
 *  computed it and the model mangled it". */
export type PositionSource =
  | 'live-board'      // the FEN of the board in front of the student
  | 'game-timeline'   // a ply of a real game the student imported or played
  | 'tool-result'     // a position a cerebellum tool returned
  | 'app-data'        // a position shipped in the app's own corpora
  | 'replayed-line';  // built by chess.js from a real SAN sequence

interface Remembered { readonly key: string; readonly source: PositionSource }

const remembered: Remembered[] = [];

/** Placement + side + castling + en-passant. See the note above on identity. */
export function positionKey(fen: string): string {
  const parts = (fen ?? '').trim().split(/\s+/);
  if (parts.length < 4) return '';
  return parts.slice(0, 4).join(' ');
}

/**
 * Record that CODE produced this position. Call it wherever the app computes,
 * loads or replays a board — never from a path where a model supplied the FEN,
 * which would launder the exact value this is meant to exclude.
 */
export function rememberComputedPosition(fen: string, source: PositionSource): void {
  const key = positionKey(fen);
  if (!key) return;
  const at = remembered.findIndex((r) => r.key === key);
  if (at >= 0) remembered.splice(at, 1);
  remembered.push({ key, source });
  if (remembered.length > MAX_REMEMBERED) remembered.splice(0, remembered.length - MAX_REMEMBERED);
}

/** Record several plies at once — a game timeline, a replayed line. */
export function rememberComputedPositions(fens: readonly string[], source: PositionSource): void {
  for (const f of fens) rememberComputedPosition(f, source);
}

/** The source, or null when the app never produced this position. */
export function provenanceOf(fen: string): PositionSource | null {
  const key = positionKey(fen);
  if (!key) return null;
  return remembered.find((r) => r.key === key)?.source ?? null;
}

/** How many positions are on record — for a refusal that tells the truth about
 *  whether the set is empty (nothing computed yet) or simply lacks this one. */
export function rememberedCount(): number {
  return remembered.length;
}

/** Tests and a fresh session. */
export function clearRememberedPositions(): void {
  remembered.length = 0;
}
