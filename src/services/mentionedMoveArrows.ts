// mentionedMoveArrows — LEAD THE EYE on every move the narration MENTIONS
// (David 2026-07-30: "I also want arrows pointing out other moves that are
// mentioned during the narrations. The Glek has many other lines mentioned
// during the opening with NO arrows pointing them out. Very difficult for
// beginners and intermediates to follow. Lead the eye!").
//
// G6 already mandates an arrow for every SAN a coach CHAT reply mentions; this
// extends the same contract to lesson beats and walkthrough narration.
//
// 2026-08-01 — this is now a THIN ADAPTER over `deriveNarrationArrows`. The two
// modules were separate implementations of one job and only the other had the
// gate, so the three false-arrow classes measured on the shipped Glek narration
// still shipped through here — and here is what the OPENING TAB uses
// (LessonPlayer, PlayableLinePlayer):
//
//   "keeps the knight off f3"  → drew f2-f3   (a SQUARE reference)
//   "Bc4 (or Bb5)"             → drew c4-b5   (an ALTERNATIVE, resolved after
//                                              the probe had played Bc4)
//   "Qe1-h4"                   → drew h2-h4   (COMPOUND notation, trailing
//                                              square read as a pawn push)
//
// One derivation, one gate, every surface. Kept as its own export so the two
// call sites read the way they always did; the sequential-road behaviour they
// depend on lives in `deriveNarrationArrows` (its plan-chain board).
import { deriveNarrationArrows } from './narrationArrows';
import type { AnnotationArrow } from '../types';

/** Green vision arrow — the playbook's lead-the-eye colour for non-move
 *  reference arrows (matches LessonPlayer's default). */
const VISION = 'rgba(40,185,95,0.92)';

/** Arrows for every move the prose mentions, resolved against `fen`.
 *  `exclude` suppresses duplicates of authored arrows and the beat's own
 *  move (its squares are auto-painted by the player). Deterministic. */
export function mentionedMoveArrows(
  text: string,
  fen: string,
  exclude: Array<{ from: string; to: string }> = [],
): AnnotationArrow[] {
  return deriveNarrationArrows(text, fen, exclude).arrows.map((a) => ({
    from: a.from,
    to: a.to,
    color: VISION,
  }));
}
