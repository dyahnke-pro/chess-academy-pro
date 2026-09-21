/**
 * spokenSquares — WHAT THE COACH JUST POINTED AT (2026-09-21).
 *
 * 🔴 THE DEAD WIRE THIS CLOSES. `show-squares` — the coach's EYES — shipped
 * with a hand, a router entry (`show_squares`), a registration on two surfaces
 * and a real handler that paints yellow highlights… and ZERO producers. The one
 * call site declined to supply the squares, with a comment that was right in
 * principle: "the move and the squares are the BOARD's to produce, and an
 * adapter that invented either would be the model's old job wearing a regex."
 * True — and then nobody built the producer, so the whole chain never fired
 * once. This repo's own rule: a wire that does not fire is not a wire.
 *
 * 🔒 THE SQUARES ALREADY EXIST AND WERE BEING THROWN AWAY. Every `ClauseItem`
 * the composer emits carries `squares`, coupled AT EMISSION by the computer
 * that found the fact (`tac.involvedSquares`) — which is why `factSelector` can
 * subsume two clauses that describe one geometry. They survive `decide()`, they
 * survive back to the caller, and then the narration speaks the TEXT and drops
 * the squares on the floor. Nothing needed computing; it needed keeping.
 *
 * 🔒 ONE PRODUCER, TWO CONSUMERS — the dual-use rule, which is why this is a
 * leaf and not a field on some surface's state:
 *   • LEAD THE EYE. "Naming a square in the narration without an arrow/
 *     highlight on it is a DEFECT" (David 2026-05-21). The masterclass beats
 *     have done this for authored lessons since; the COMPUTED narration never
 *     did, because the squares stopped here.
 *   • "SHOW ME ON THE BOARD." The student heard something and wants it pointed
 *     at. The honest answer is the squares of the fact the coach actually
 *     spoke — not a fresh guess, and never a square scraped back out of prose
 *     (the anti-pattern `factSelector` names by name).
 *
 * KEYED BY POSITION, because pointing at squares from a board two moves ago is
 * worse than not pointing at all. A reader that asks about a different position
 * gets nothing rather than something stale.
 */
import type { Square } from 'chess.js';

/** Only ever the last thing said — this is a pointer, not a history. */
let spoken: { readonly key: string; readonly squares: readonly Square[] } | null = null;

const SQUARE_RE = /^[a-h][1-8]$/;

/** Placement + side to move: the same identity `positionProvenance` uses, and
 *  for the same reason — the clocks differ between honest routes to one board. */
function keyOf(fen: string): string {
  const parts = (fen ?? '').trim().split(/\s+/);
  return parts.length >= 2 ? `${parts[0]} ${parts[1]}` : '';
}

/**
 * Record the squares of the fact the coach just spoke. Call it from the
 * narration path, with the squares the COMPUTER coupled — never parsed out of
 * the sentence.
 */
export function rememberSpokenSquares(fen: string, squares: readonly string[]): void {
  const key = keyOf(fen);
  // A malformed square would reach the board as a highlight nobody can explain,
  // so the guard is here rather than at each consumer.
  const clean = squares.filter((s): s is Square => SQUARE_RE.test(s));
  if (!key || clean.length === 0) return;
  spoken = { key, squares: clean };
}

/**
 * The squares for THIS position, or empty. Empty is the honest answer when the
 * coach has said nothing about this board — the caller then declines rather
 * than painting something arbitrary.
 */
export function readSpokenSquares(fen: string): readonly Square[] {
  const key = keyOf(fen);
  if (!key || !spoken || spoken.key !== key) return [];
  return spoken.squares;
}

/** Tests, and a fresh game. */
export function clearSpokenSquares(): void {
  spoken = null;
}
