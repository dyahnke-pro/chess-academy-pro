/**
 * arrowGrounding — what is left after the arrow door (2026-09-29).
 *
 * `groundArrows` lived here: a geometry filter that also dropped every red
 * arrow. Every producer now hands claims to `services/arrowDoor`, which checks
 * legality, safety and sight and owns the colours, so that filter had no
 * callers and is gone. Only the React-key dedupe below remains.
 */
import type { BoardArrow } from '../types';

/**
 * react-chessboard keys each arrow by its `startSquare-endSquare` pair, so
 * any arrows array passed to the board MUST be unique by that pair — two
 * arrows on the same pair render two children with the same React key
 * ("Encountered two children with the same key") and one gets dropped.
 * This bites whenever arrows are MERGED without grounding (a code-derived
 * set appended to prior arrows, or hint-arrows merged with chat-annotation
 * arrows). Dedupe by square-pair, last write wins (latest color/intent).
 * Surfaced by the adversarial coach-teach loop audit (2026-06-12).
 */
export function dedupeArrowsBySquarePair(arrows: BoardArrow[]): BoardArrow[] {
  const byPair = new Map<string, BoardArrow>();
  for (const a of arrows) byPair.set(`${a.startSquare}-${a.endSquare}`, a);
  return [...byPair.values()];
}
