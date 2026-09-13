import { useEffect, useRef } from 'react';
import { acquireSwReloadHold } from '../utils/swReloadHold';

// ── A BOARD WITH WORK ON IT HOLDS THE DEPLOY RELOAD — AUTOMATICALLY ─────────
// David 2026-09-13, after the Learn play-out was found reloading mid-narration.
//
// The service-worker update reload (index.html `controllerchange` handler) is
// correct on an idle dashboard and destroys a session mid-board. Surfaces used
// to defend against it ONE AT A TIME by calling `acquireSwReloadHold()` in
// their own effect — and 50 board surfaces never did, because opting in is
// something you have to remember. The ones that DID remember are the ones
// someone had already been burned on.
//
// So the hold moves INTO the three board primitives every surface renders
// through — `ControlledChessBoard`, `Board/ChessBoard`, and
// `ConsistentChessboard`'s static mode. Nothing opts in, nothing can forget,
// and a surface built tomorrow inherits it. That is the difference between
// fixing the bug and closing the class.
//
// WHAT COUNTS AS "WORK": a position that is not the untouched starting array.
// It is one rule and it covers both shapes without asking the caller anything —
// a game the student has played moves in, and a puzzle/endgame/drill seeded via
// `loadFen` (zero history, but a position they are mid-solving). Placement only,
// so a board seeded at the start with a different clock or side to move still
// reads as "nothing to lose".
//
// A DISPLAY board never holds. Static mode passes `active: false` unless the
// board is interactive — so thumbnails, search results and citation previews
// stay out of it.
//
// …BUT `interactive` ALONE IS NOT ENOUGH, and getting that wrong would have
// left the exact hole this whole fix came from. Lesson surfaces gate
// interactivity BY PHASE (`interactive={playout.phase === 'student-to-move'}`
// on the endgame tab, the calculation tab, the eval-lab quiz, the SRS trainer,
// tactics practice). While the coach is DEMONSTRATING, those boards are
// read-only — and a read-only board mid-lesson is precisely what got reloaded
// out from under the Learn play-out. So a board ALSO holds once its position
// has CHANGED since it mounted: a thumbnail never moves, a lesson board does.
// One signal, no per-surface opt-in, and it tells a demo apart from a picture.
//
// NOT CAPPED ON PURPOSE. Parking on a board defers the reload for as long as
// the board is mounted, and that is the correct trade: the update is deferred,
// never dropped (index.html re-checks every 15s), and it lands the moment the
// student navigates away — which is exactly when a reload costs nothing. An
// idle timeout would have to pick a number shorter than a student thinking
// about a hard position, and reloading mid-think is the thing this prevents.

const STARTING_PLACEMENT = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

/** True when the position is the untouched starting array — nothing to lose. */
export function isUntouchedStart(fen: string | undefined): boolean {
  if (!fen) return true;
  return fen.split(' ')[0] === STARTING_PLACEMENT;
}

/**
 * Hold the service-worker update reload while this board is showing work.
 *
 * @param fen    the board's CURRENT position (the real game's, not a review
 *               override — a student stepping back through their own moves
 *               still has a live game to lose).
 * @param active false for display-only boards, which never hold.
 */
export function useBoardReloadHold(fen: string | undefined, active = true): void {
  // Has this board ever shown a different position than the one it mounted
  // with? Latching, not per-render: a lesson that steps forward and back is
  // still a lesson in progress.
  const mountedAt = useRef(fen);
  const hasMoved = useRef(false);
  if (fen !== undefined && fen !== mountedAt.current) hasMoved.current = true;

  const holding = (active && !isUntouchedStart(fen)) || hasMoved.current;
  useEffect(() => {
    if (!holding) return;
    return acquireSwReloadHold();
  }, [holding]);
}
