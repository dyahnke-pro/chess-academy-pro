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

/**
 * Is this posed capability NOT YET PROVEN — so the ranker should still raise
 * the moment? Absent (grey) and recorded-failure both qualify; only a clean
 * `held >= HELD_FOR_PROVEN` earns silence here.
 *
 * 🔴 THIS USED TO READ `if (e.broken > 0) return false;` — "a broken row is RED
 * and belongs to the weakness half". That was safe only for as long as NOTHING
 * WROTE A BROKEN ROW, which was true until 2026-09-19. The moment the positive
 * half started recording failures, that line would have made the coach QUIETER
 * on a capability the student had just demonstrably failed: the tag stops being
 * grey (boost 12) and picks up RED only if the weakness spine independently
 * matched a hole for it — and the two halves do not match one-for-one, so a
 * failure with no spine hole scored ZERO. A data term that can lower the
 * coach's attention on evidence of failure is exactly backwards (the
 * ALGO-BASED rule: data may RAISE freely and may only LOWER on evidence of the
 * POSITIVE).
 *
 * `Math.max(red, grey)` downstream means a tag that IS matched by the weakness
 * half still ranks on its real RED weight; this only stops a recorded failure
 * from scoring less than never-having-been-asked.
 */
function isUnproven(tag: MisconceptionTagId, caps: CapabilityProfile): boolean {
  const e = caps.get(tag);
  if (!e) return true;                         // never asked
  if (e.broken > 0) return true;               // asked and FAILED — never quieter than unasked
  return e.held < HELD_FOR_PROVEN;             // seen, not yet proven
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
    ? ((!caps || input.posedTags.some((t) => isUnproven(t, caps))) ? GREY_BOOST : 0)
    : 0;
  return Math.min(MAX_WEAKNESS_BOOST, Math.max(red, grey));
}
