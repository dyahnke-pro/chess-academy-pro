import { describe, it, expect } from 'vitest';
import { getDrillPositionsForLesson } from './endgameDrillService';
import { getEndgamePrinciples } from './endgameLessonsService';

/**
 * 🔒 THE BULK DRILL BUILD MUST NOT COMPUTE CONCEPT HINTS (2026-09-17).
 *
 * `conceptHintForPuzzle` costs ~250ms per puzzle; the builder converts up to
 * 200. Eagerly that is ~50 seconds of synchronous work on the click that opens
 * an endgame lesson — measured at 32.4s in `EndgameLessonTab.test.tsx`, which
 * had been timing out at 5s for exactly this reason and reading as a flaky UI
 * test. Making it lazy took the same click to 663ms.
 *
 * Both halves are asserted here, because either one alone is a false green: a
 * fast build that never produces a hint has simply deleted the feature.
 */
describe('drill positions build lazily', () => {
  const lesson = getEndgamePrinciples().find((l) => (l.practiceThemes ?? []).length > 0);

  it('converts the whole pool without paying for concept hints', () => {
    expect(lesson, 'no lesson with practiceThemes — the check would be vacuous').toBeTruthy();
    const t0 = performance.now();
    const drills = getDrillPositionsForLesson(lesson!, { seed: 1 });
    const ms = performance.now() - t0;
    expect(drills.length, 'no drills built — the timing below would be vacuous').toBeGreaterThan(20);
    // Eager was ~250ms PER position. A generous ceiling that still fails by
    // orders of magnitude the moment the hint is computed in the loop again.
    expect(ms, `${drills.length} drills took ${ms.toFixed(0)}ms`).toBeLessThan(5000);
  }, 60_000);

  it('still resolves a real hint when one is actually read', () => {
    const drills = getDrillPositionsForLesson(lesson!, { seed: 1 });
    // Not every puzzle's themes map to a hint (null is a valid answer), so read
    // across a handful and require that the wire produces at least one.
    const hints = drills.slice(0, 25).map((d) => d.conceptHint).filter((h) => typeof h === 'string' && h.length > 0);
    expect(hints.length, 'no concept hint resolved on any of 25 drills — the lazy wire is dead').toBeGreaterThan(0);
  }, 60_000);

  it('caches: the second read of the same position does not recompute', () => {
    const drills = getDrillPositionsForLesson(lesson!, { seed: 1 });
    const first = drills.find((d) => typeof d.conceptHint === 'string' && d.conceptHint.length > 0);
    expect(first, 'no hinted drill to test caching against').toBeTruthy();
    const t0 = performance.now();
    for (let i = 0; i < 50; i += 1) void first!.conceptHint;
    expect(performance.now() - t0).toBeLessThan(50);
  }, 60_000);
});
