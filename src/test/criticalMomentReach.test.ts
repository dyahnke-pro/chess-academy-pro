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
    const after = SRC.slice(mount, mount + 1500);
    expect(after).toContain('if (questionPlan.has(atPly)) return;');
    expect(after.indexOf('if (questionPlan.has(atPly)) return;')).toBeLessThan(after.indexOf("register === 'ask'"));
  });
});
