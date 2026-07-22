// The "coach knows ALL computed patterns" gate (David 2026-07-22): every
// pattern type the live detector can emit maps to a registry lesson; every
// lesson's drill themes have REAL coverage in the CC0 puzzle corpus; every
// lesson teaches all three registers (identify / recognize / prevent) and
// cites a resolvable source. Baseline-free.
import { describe, it, expect } from 'vitest';
import { PATTERN_REGISTRY, DETECTOR_TYPE_TO_LESSON } from './patternRegistry';
import { isResolvableSource } from './narrationSources';
import puzzles from './puzzles.json';

const corpusThemes = new Set<string>();
for (const p of puzzles as Array<{ themes?: string[] }>) {
  for (const t of p.themes ?? []) corpusThemes.add(t);
}

describe('pattern registry — the computed-pattern inventory', () => {
  it('covers every TacticPatternType the live detector emits', () => {
    const lessonIds = new Set(PATTERN_REGISTRY.map((l) => l.id));
    for (const [detectorType, lessonId] of Object.entries(DETECTOR_TYPE_TO_LESSON)) {
      expect(lessonIds.has(lessonId), `detector type '${detectorType}' maps to missing lesson '${lessonId}'`).toBe(true);
    }
    // The live detector's emit set (minus 'none') — keep in sync with
    // TacticPatternType in src/types/tacticTypes.ts.
    expect(Object.keys(DETECTOR_TYPE_TO_LESSON).sort()).toEqual(
      ['back_rank', 'discovery', 'double_check', 'fork', 'pin', 'removal_of_guard', 'skewer'].sort(),
    );
  });

  for (const lesson of PATTERN_REGISTRY) {
    it(`${lesson.id}: teaches all three registers, drills real themes, cites sources`, () => {
      expect(lesson.identify.length, 'identify prose').toBeGreaterThan(30);
      expect(lesson.recognize.length, 'recognize prose').toBeGreaterThan(50);
      expect(lesson.prevent.length, 'prevent prose').toBeGreaterThan(40);
      expect(lesson.detector.length, 'detector grounding statement').toBeGreaterThan(10);
      expect(lesson.puzzleThemes.length).toBeGreaterThan(0);
      for (const theme of lesson.puzzleThemes) {
        expect(corpusThemes.has(theme), `theme '${theme}' has no puzzles in the corpus`).toBe(true);
      }
      expect(lesson.sources.length).toBeGreaterThan(0);
      for (const s of lesson.sources) {
        expect(isResolvableSource(s), `source not resolvable: ${s}`).toBe(true);
      }
    });
  }
});
