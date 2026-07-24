// reviewExplorationAnchor — the pure decision behind auto-clearing a review
// walk's "exploration" board overlay (the §5 better-line / sequence / theory /
// show-me walkouts set `walkExplorationFen`, which the board renders in place of
// the live position).
//
// ROOT CAUSE it encodes (David 2026-07-24, "the pieces stopped moving when
// clicking the next arrow"): exploration teardown used to depend on a caller-set
// anchor-ply ref that ~20 of the ~22 set-sites never set, AND on each async
// walkout reaching its own cleanup line (which a token-guard `return` could skip
// on interruption). Either path stranded the overlay FEN, pinning the board while
// the ply kept advancing. This function makes teardown self-anchoring and
// automatic: the overlay is anchored to whatever ply it first appears at, and any
// navigation away from that ply tears it down — no caller cooperation required.
//
//   reset  — no exploration active; forget any stale anchor.
//   anchor — exploration active but not yet anchored; stamp the current ply.
//   clear  — exploration anchored, but the student navigated to another ply;
//            tear the overlay down and snap back to the live game line.
//   hold   — exploration anchored at the current ply; leave it (a walkout that
//            steps the overlay through a hypothetical line stays put).

export type ExplorationAnchorAction = 'reset' | 'anchor' | 'clear' | 'hold';

export function explorationAnchorAction(
  active: boolean,
  anchorPly: number | null,
  currentPly: number,
): ExplorationAnchorAction {
  if (!active) return 'reset';
  if (anchorPly === null) return 'anchor';
  if (anchorPly !== currentPly) return 'clear';
  return 'hold';
}
