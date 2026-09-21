/**
 * The SEAT guard's 12 cases — the ones the audit claimed and never gated.
 *
 * `SEAT mover-never-reattributed` was the only red in a 49/50 prod run, and it
 * was the AUDIT that was wrong, not the coach. Fixing it took three cuts, two
 * of which were SILENTLY INERT (a regex built by interpolation so the escape
 * became a literal backslash; then an optional group that backtracks to empty
 * and re-admits the very bug). The board recorded "12/12 both directions" —
 * but that was a hand check inside a 1,200-line browser audit, so nothing in
 * the suite could ever run it again.
 *
 * A predicate that took three attempts and is guarded by nothing is the exact
 * shape this repo keeps getting burned by. These are those 12 cases, against
 * the extracted seam.
 */

import { describe, it, expect } from 'vitest';
// @ts-expect-error — plain .mjs audit helper, no types shipped
import { seatReattributes } from '../../scripts/audit-lib/seat-reattribution.mjs';

const onOpponentPly = (s: string): boolean => seatReattributes(s, false).fails;
const onStudentPly = (s: string): boolean => seatReattributes(s, true).fails;

describe('SEAT — an opponent ply must not narrate the student as the actor', () => {
  it('does NOT fire on the plan-race sentence that caused the false red', () => {
    // The sentence that started all of this. It is CORRECT: it addresses the
    // student, describes both sides, and attributes the file to the OPPONENT.
    // The guard read the token after "You", found the QUANTIFIER "both" where a
    // verb should be, and failed a coach that was right.
    expect(onOpponentPly(
      'You both wanted the open e-file, but only their rook could take it — it was theirs first.',
    )).toBe(false);
  });

  it('does NOT fire on STATE, POSSESSION or PERCEPTION openings', () => {
    // None of these claims the student MOVED — they describe how things stand.
    for (const s of [
      "You're better here, and the pawn structure says why.",
      'You have the bishop pair after that trade.',
      'You saw it coming — the knight had nowhere good to go.',
      'You need a plan for the c-file before it is theirs.',
      'You still hold the outpost on d5.',
    ]) expect(onOpponentPly(s), s).toBe(false);
  });

  it('DOES fire when the opponent ply is narrated as the student acting', () => {
    // The real defect: the opponent moved and the prose hands the move to the
    // student. Each opens with "you" + an ACTION verb.
    for (const s of [
      'You take on e5 and the centre opens.',
      'You push the h-pawn and the storm begins.',
      'You swing the rook to the open file.',
      'You trade on d4 to fix the structure.',
    ]) expect(onOpponentPly(s), s).toBe(true);
  });

  it('fires through a HEDGE, which is what cut 2 got wrong', () => {
    // "You both take on e5" must still fire: stripping the hedge is what lets
    // the verb be tested. An optional group inside the pattern backtracked to
    // empty and made this pass by accident in the wrong direction.
    expect(onOpponentPly('You both take on e5 and the centre opens.')).toBe(true);
    expect(onOpponentPly('You clearly push the h-pawn here.')).toBe(true);
  });

  it('the MIRROR — a student ply must not be narrated as the opponent acting', () => {
    expect(onStudentPly('Your opponent takes on e5.')).toBe(true);
    expect(onStudentPly('They push the h-pawn.')).toBe(true);
    expect(onStudentPly('You take on e5 and the centre opens.')).toBe(false);
  });

  it('CAN FIRE — a negative control on the seam itself', () => {
    // A guard nobody has watched fail is indistinguishable from one that
    // cannot. Both directions, on input we control.
    expect(onOpponentPly('You capture the knight.')).toBe(true);
    expect(onOpponentPly("You're a pawn up.")).toBe(false);
  });
});
