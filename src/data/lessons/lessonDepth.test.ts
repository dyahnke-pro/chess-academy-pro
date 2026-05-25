// Depth gate for hand-authored opening lessons.
//
// David, 2026-05-22: "the lines do not go deep enough."  Tonight's fix was
// to push the Vienna variations from 15-18 plies to 21-24 plies. This gate
// stops the regression — any future variation that ships too shallow fails
// here, before code review.
//
// Contract:
//   - Every variation LessonScript must reach a deepest beat of ≥ 20 plies.
//     That's the floor for "the lesson lands the student inside the
//     middlegame structure," not stranded at the moment of divergence.
//   - Opt out with `kind: 'roadmap'` on the LessonScript — used for spines
//     that intentionally stop short and fan out to the Weapons layer
//     (Vienna vs 2…Nc6's 11-ply launchpad → Hamppe-Allgaier / Hamppe-Muzio
//     / Pierce / Steinitz, each a full beat lesson in its own file).
//   - Trap lessons (VIENNA_TRAP_LESSONS, RUY_TRAP_LESSONS) are out of scope
//     here — they're shorter by design and have their own integrity gates.
//
// Why a HARD gate: the playbook §1 "lines run DEEP" rule used to be prose
// I was supposed to internalize. It got missed (Vienna shipped at 15p).
// Executable beats internalize: this test catches the violation BEFORE
// the build hits David's eye.

import { describe, it, expect } from 'vitest';
import type { LessonScript } from '../../types';
import { ALL_LESSONS } from './registry';

const MIN_PLIES = 20;

// Known-shortfall allowlist — lessons that fall below the depth bar but
// existed BEFORE this gate landed. Tracked here so the gate stays GREEN
// while these get extended (or properly re-classified as roadmap) in
// future content passes. NEW lessons cannot be added to this list — the
// gate catches them. This list should SHRINK over time, not grow.
//
// Pattern matches `repertoire-orientation.test.ts`'s baseline allowlist.
// EMPTY — the original 4 shortfalls were extended to ≥20 plies via the
// masters spine (2026-05-22): Pirc main +Be3/Qe7/Qd3/Nh5, Arkhangelsk
// +Qd7/Re1/Rfe8, 150 Attack +the h4-h5/b5-b4 race, Austrian-e5c5
// +exd6/.../Nf6. The gate is now pure ≥20 for every variation lesson.
const KNOWN_SHORTFALLS = new Set<string>([
]);

interface ScopedLesson {
  scope: string;
  key: string;
  lesson: LessonScript;
}

// Depth applies to teachable lines (main + variation). Trap lessons are
// shorter by design and out of scope (their own integrity gates cover
// them) — so the registry sweep drops the `trap` scope here.
const lessons: ScopedLesson[] = ALL_LESSONS
  .filter((l) => l.scope !== 'trap')
  .map((l) => ({ scope: l.scope, key: l.key, lesson: l.lesson }));

function deepestPlies(lesson: LessonScript): number {
  let max = 0;
  for (const beat of lesson.beats) {
    if (beat.moves.length > max) max = beat.moves.length;
  }
  return max;
}

describe('lesson depth gate — variations must reach the middlegame', () => {
  for (const { scope, key, lesson } of lessons) {
    const kind = lesson.kind ?? 'variation';
    it(`${scope}: ${key} (${kind})`, () => {
      const plies = deepestPlies(lesson);
      if (kind === 'roadmap') {
        // Roadmap lessons opt out by design — they intentionally stop
        // short. Just confirm the deep beats exist (sanity); no minimum.
        expect(plies, `${key}: roadmap lesson has no beats at all`).toBeGreaterThan(0);
        return;
      }
      if (kind === 'trap') {
        // Should not reach here — trap-shaped lessons live in dedicated
        // files and aren't included in the scoped lists above. Guard
        // anyway in case the field gets misused.
        return;
      }
      if (KNOWN_SHORTFALLS.has(key)) {
        // Known shortfall — content backlog item, not a regression. Just
        // assert the baseline didn't shrink (someone made it WORSE).
        // When the lesson gets extended past the bar, REMOVE from the
        // allowlist — the gate's job is to make the list shrink.
        expect(plies, `${key}: known-shortfall lesson — should still have its existing beats`).toBeGreaterThan(0);
        return;
      }
      // The default — a real teachable variation. Must reach middlegame.
      expect(
        plies,
        `${key}: deepest beat is only ${plies} plies. Lessons must reach ≥ ${MIN_PLIES} plies (the middlegame structure they produce). Opt out with \`kind: 'roadmap'\` if this lesson is intentionally a pointer to other lessons.`,
      ).toBeGreaterThanOrEqual(MIN_PLIES);
    });
  }
});

describe('depth allowlist is SEALED (David 2026-05-25)', () => {
  it('KNOWN_SHORTFALLS never grows — a new shallow lesson must be deepened, not allowlisted', () => {
    expect(KNOWN_SHORTFALLS.size, 'KNOWN_SHORTFALLS grew — deepen the lesson instead of allowlisting').toBeLessThanOrEqual(0);
  });
});
