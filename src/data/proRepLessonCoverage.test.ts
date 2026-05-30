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
import { getLessonScript } from './lessons';

interface ProRepEntry { id: string }

const PRO_OPENINGS: ProRepEntry[] = (proRepertoires.openings as ProRepEntry[]).filter(
  (op) => op.id.startsWith('pro-'),
);

// 🚨 SHRINKING BACKLOG — pro-rep openings that still lack a curated LessonScript.
// Each entry is a Watch that currently falls back to legacy auto-narration
// (G9.3 Gate A defect). DELETE an id from this list the moment you author its
// LessonScript (STEP 7-8). This list may ONLY shrink, never grow — a new
// pro-rep opening must ship WITH its lesson.
const MISSING_LESSON_BASELINE = new Set<string>([
  'pro-gothamchess-stafford-refute',
  'pro-gothamchess-caro-kann',
  'pro-gothamchess-scandinavian',
  'pro-gothamchess-qgd',
  'pro-gothamchess-anti-sicilian',
  'pro-gothamchess-kia',
  'pro-gothamchess-closed-sicilian',
  'pro-gothamchess-french-defense',
  'pro-gothamchess-pirc-defense',
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
