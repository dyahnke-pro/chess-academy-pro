// studentMomentBoost — HOW MUCH MORE THIS MOMENT IS WORTH SAYING TO THIS
// STUDENT. One computer, fed by every lane, consumed only by the ranker.
//
// David 2026-09-18: "The ranking computer decides. It should answer which
// teachings are important enough to say."
//
// 🚨 IT RAISES A MOMENT, IT NEVER MAKES ONE. `computeImportance` applies this
// under `studentBoost > 0 && rank > 0`, so it can only re-weight a moment where
// a computer ALREADY produced a teaching. That guard is what stops "grey
// teaches" from turning into "the coach talks on every ply": a quiet book move
// computes nothing, ranks 0, and stays silent by HAVING NOTHING — not by a gate
// and not by a ply budget.
//
// This is also why the heat map feeds the RANKER and not the need score. On a
// `'walk'` posture (review, Watch) `speaks` is unconditional and need is the
// only gate, so raising need there would manufacture speech on quiet plies —
// the failure that once cut a 46-ply review to six, arriving from the other
// direction.
import type { WeaknessSignal } from './weaknessSignal';
import { boostFor, MAX_WEAKNESS_BOOST } from './weaknessSignal';
import type { CapabilityProfile } from './capabilityEvidence';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import { HELD_FOR_PROVEN } from './needScore';

/**
 * A capability the board POSED that this student has no record for.
 *
 * "Absent ≠ mastered" (the ALGO-BASED rule): never having been asked is not
 * evidence of anything, and the honest response to unknown is to teach it. So
 * grey RAISES — it is not a lower-urgency red, which is the reading David
 * corrected explicitly ("An unrated player gets treated with the full
 * capabilities of the detectors!").
 *
 * Set BELOW a persistent, worsening hole (24–30) and ABOVE an occasional one
 * (6–8), and that ordering is the claim being made: a repeated, worsening
 * failure is stronger evidence of need than silence, while a mild self-limiting
 * hole is weaker evidence than a capability we have never seen them handle at
 * all. RED > GREY > GREEN, which is the heat map's own ranking.
 */
export const GREY_BOOST = 12;

export interface StudentMomentInput {
  /** The student's matched hole for this moment, when a lane found one (RED). */
  hole?: WeaknessSignal | null;
  /** What the board ASKED here — `capabilitiesPosed`, ungated by how the move
   *  went. Absent when the lane cannot compute it yet. */
  posedTags?: readonly MisconceptionTagId[];
  /** The positive half. Absent/empty = everything is grey. */
  capabilities?: CapabilityProfile;
}

/** Is this posed capability GREY — no record at all? A `broken` row is RED and
 *  belongs to the weakness half; a proven `held` row is GREEN and earns nothing
 *  here (the ranker is raise-only; green lowers through the need score). */
function isGrey(tag: MisconceptionTagId, caps: CapabilityProfile): boolean {
  const e = caps.get(tag);
  if (!e) return true;
  if (e.broken > 0) return false;
  return e.held < HELD_FOR_PROVEN;
}

/**
 * The MAX of the two terms, never the sum. They are two readings of the same
 * question ("how much does this student need this?") and stacking them would
 * let one moment outrank a forced mate.
 */
export function studentMomentBoost(input: StudentMomentInput): number {
  const red = input.hole ? boostFor(input.hole) : 0;
  const caps = input.capabilities;
  // No profile at all is not a special case — it is the maximal grey state (a
  // fresh install is 100% grey), so it takes the same branch rather than an
  // empty-map stand-in.
  const grey = input.posedTags?.length
    ? ((!caps || input.posedTags.some((t) => isGrey(t, caps))) ? GREY_BOOST : 0)
    : 0;
  return Math.min(MAX_WEAKNESS_BOOST, Math.max(red, grey));
}
