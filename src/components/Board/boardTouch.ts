import type { CSSProperties } from 'react';

/**
 * ONE TOUCH RULE FOR EVERY BOARD THAT TAKES A MOVE (David's iPhone,
 * 2026-11-05: Bird's Opening → Learn would not let him move the pawn to f4).
 *
 * On iOS/WKWebView, a board inside a scrolling page loses the finger to the
 * page: a drag that starts on a piece is claimed as a scroll (the drag is
 * cancelled, or lands on a square measured before the page moved), and a
 * touchend during that scroll cannot be cancelled, so the tap ALSO arrives as
 * a click and selects-then-deselects. A press on a piece image can also be
 * taken as text selection or the image callout. Either way the move never
 * lands, and a drop on the wrong square is graded as a wrong move.
 *
 * This was fixed twice by hand — the walkthrough board (2026-06-19, the kid
 * pawn game: "a tap wouldn't even SELECT a pawn") and the play board
 * (2026-10-02: "Drag a piece doesnt work") — and the static board that runs
 * Learn and Practice never got a copy. Every board reads it from here now, and
 * `boardTouch.gate.test.ts` fails a board wrapper that does not.
 *
 * A board that takes no move keeps the page's native touch, so a thumbnail in
 * a list still scrolls under the finger.
 */
const TAKES_MOVES: CSSProperties = {
  touchAction: 'none',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  WebkitTouchCallout: 'none',
};

export function boardTouchStyle(takesMoves: boolean): CSSProperties {
  return takesMoves ? TAKES_MOVES : {};
}
