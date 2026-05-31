// PRO-REP LESSON COVERAGE GATE — G9.3 Gate A (David 2026-05-31, locked).
//
// Catches the failure mode that shipped the GothamChess build: a pro-rep
// opening with plans/models/gems/pitfalls but NO hand-authored LessonScript.
// Without a lesson, `getLessonScript(id)` is null and OpeningDetailPage's Watch
// falls through to the legacy `WalkthroughMode`, which narrates from the
// ungated, board-INACCURATE auto-generated `src/data/annotations/` files (the
// "Bg5 pins the knight to the queen" with no knight on f6 bug). The Watch is the
// STAR of a masterclass — this gate makes it a ship-block.
//
// Every `pro-*` opening in pro-repertoires.json MUST have a registered
// LessonScript, OR be listed in MISSING_LESSON_BASELINE (a deliberate, visible
// backlog that only ever SHRINKS). A NEW pro-rep opening cannot ship without a
// lesson; the baseline cannot grow.

import { describe, it, expect } from 'vitest';
import proRepertoires from './pro-repertoires.json' assert { type: 'json' };
import { getLessonScript, getVariationLessonScript } from './lessons';

interface ProRepEntry { id: string; variations?: Array<{ name: string }> }

const PRO_OPENINGS: ProRepEntry[] = (proRepertoires.openings as ProRepEntry[]).filter(
  (op) => op.id.startsWith('pro-'),
);

// 🚨 SHRINKING BACKLOG — pro-rep openings that still lack a curated LessonScript.
// Each entry is a Watch that currently falls back to legacy auto-narration
// (G9.3 Gate A defect). DELETE an id from this list the moment you author its
// LessonScript (STEP 7-8). This list may ONLY shrink, never grow — a new
// pro-rep opening must ship WITH its lesson.
const MISSING_LESSON_BASELINE = new Set<string>([
]);

describe('G9.3 Gate A — every pro-rep opening has a curated LessonScript', () => {
  for (const op of PRO_OPENINGS) {
    it(`${op.id}: Watch uses a curated lesson (not legacy WalkthroughMode)`, () => {
      const hasLesson = getLessonScript(op.id) !== null;
      if (MISSING_LESSON_BASELINE.has(op.id)) {
        // Known backlog — allowed for now, but flag if it's secretly fixed so
        // the baseline can shrink.
        if (hasLesson) {
          throw new Error(
            `${op.id} now HAS a LessonScript — remove it from MISSING_LESSON_BASELINE (the baseline only shrinks).`,
          );
        }
      } else {
        expect(
          hasLesson,
          `${op.id} has no LessonScript — Watch will fall back to legacy auto-narration (G9.3 Gate A). Author it (STEP 7-8) or, only as a deliberate visible deferral, add it to MISSING_LESSON_BASELINE.`,
        ).toBe(true);
      }
    });
  }

  it('baseline contains only real pro-rep openings (no stale ids)', () => {
    const ids = new Set(PRO_OPENINGS.map((o) => o.id));
    const stale = [...MISSING_LESSON_BASELINE].filter((id) => !ids.has(id));
    expect(stale, `stale baseline ids (not in pro-repertoires.json): ${stale.join(', ')}`).toEqual([]);
  });
});

// 🚨 SHRINKING BACKLOG — pro-rep VARIATION TABS that still lack a curated
// per-variation LessonScript (key `${openingId}::${variationName}`). Without one,
// the variation Watch falls back to the legacy WalkthroughMode auto-narration —
// the same G9.3 Gate A defect, one surface deeper. NOW EMPTY (2026-05-31): the
// last 3 (Naroditsky Fantasy-Caro dxe4 / g6 / Qb6) were authored from his real
// games. EVERY pro-rep variation tab now has a curated lesson. This list may
// ONLY shrink, never grow — a new pro-rep variation tab must ship WITH its lesson.
const MISSING_VARIATION_LESSON_BASELINE = new Set<string>([]);

describe('G9.3 Gate A — every pro-rep VARIATION tab has a curated LessonScript', () => {
  for (const op of PRO_OPENINGS) {
    for (const v of op.variations ?? []) {
      const key = `${op.id}::${v.name}`;
      it(`${key}: variation Watch uses a curated lesson`, () => {
        const hasLesson = getVariationLessonScript(op.id, v.name) !== null;
        if (MISSING_VARIATION_LESSON_BASELINE.has(key)) {
          if (hasLesson) {
            throw new Error(
              `${key} now HAS a variation lesson — remove it from MISSING_VARIATION_LESSON_BASELINE (the baseline only shrinks).`,
            );
          }
        } else {
          expect(
            hasLesson,
            `${key} has no per-variation LessonScript — the variation Watch will fall back to legacy auto-narration (G9.3 Gate A). Author it, or — only as a deliberate visible deferral — add it to MISSING_VARIATION_LESSON_BASELINE.`,
          ).toBe(true);
        }
      });
    }
  }

  it('variation baseline contains only real variation keys (no stale entries)', () => {
    const keys = new Set<string>();
    for (const op of PRO_OPENINGS) for (const v of op.variations ?? []) keys.add(`${op.id}::${v.name}`);
    const stale = [...MISSING_VARIATION_LESSON_BASELINE].filter((k) => !keys.has(k));
    expect(stale, `stale variation baseline keys: ${stale.join(', ')}`).toEqual([]);
  });
});
