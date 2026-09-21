// T1 (WO-CLOSEOUT-01, 2026-09-20) — the review's `ask` / `note` registers must
// be REACHABLE. Five prod runs selected `credit` every time because the scan
// filtered out every ply the question plan owned — which is every flagged ply,
// i.e. exactly the plies `ask` exists for. The scan now covers every student
// ply past the opening and the REGISTER decides; the only exclusion left is the
// double-stop guard at the card's mount. Blamed by statement: the scan's filter
// may not mention the question plan, and the mount must guard on it.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('src/components/Coach/CoachGameReview.tsx', 'utf8');

describe('critical-moment scan reaches the flagged plies', () => {
  it('the scan filter no longer excludes plies the question plan owns', () => {
    const start = SRC.indexOf('const plies = walkNarration.segments');
    expect(start).toBeGreaterThan(-1);
    const filter = SRC.slice(start, SRC.indexOf('.map((sg) =>', start));
    expect(filter).toContain('sg.moveNumber > OPENING_LAST_MOVE');
    expect(filter).not.toContain('questionPlan.has');
  });
  it('the card mount yields the ply to the question plan (never two stops on one ply)', () => {
    const mount = SRC.indexOf('criticalDoneRef.current.add(atPly);');
    expect(mount).toBeGreaterThan(-1);
    // WIDE ENOUGH TO HOLD BOTH LANDMARKS. A fixed window is a property of
    // this test, not of the code: at 1500 the ask-register sat at offset 1509
    // and `indexOf` returned -1, so the ORDER assertion below compared against
    // -1 and failed for a reason that had nothing to do with ordering. Any
    // comment added near the guard could do that again — so the window is
    // generous, and the assertions below still pin the real contract.
    const after = SRC.slice(mount, mount + 4000);
    // 🔴 THE MECHANISM CHANGED, THE INTENT DID NOT (2026-09-21). This asserted
    // `if (questionPlan.has(atPly)) return;`. That bare `return` yielded the
    // FORWARD as well as the beat — and the card it defers to opens LATER IN
    // THE SAME FUNCTION, so the card never opened on that step and the walk
    // stopped dead (parked at ply 67 of 69 for 350s in a prod audit, with the
    // button still reading "playing"). The yield is now a GUARD around the beat
    // (`if (!questionPlan.has(atPly)) { … }`) so the ply is still handed to the
    // card, without consuming the step.
    //
    // What this test is FOR is unchanged and is what the two lines below pin:
    // the ply is yielded, and the yield is decided BEFORE the ask register runs
    // — never two stops on one ply.
    expect(after).toContain('if (!questionPlan.has(atPly)) {');
    expect(after.indexOf('if (!questionPlan.has(atPly)) {')).toBeLessThan(after.indexOf("register === 'ask'"));
  });
});
