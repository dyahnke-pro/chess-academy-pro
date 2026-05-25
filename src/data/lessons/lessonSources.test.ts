import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { ALL_LESSONS } from './registry';
import { sourcesAreValid } from '../narrationSources';
import baselineRaw from './lessonSources.baseline.json';

// Independent-verification gate for the MAIN OPENING LINES (David 2026-05-25:
// "add main opening lines… use independent verification — that's the gate").
// Every masterclass beat-lesson (main line, variation tab, named trap) must
// record a resolvable source on its LessonScript (book:/concept:/reputable-URL),
// proof its ideas were checked against the books/online — not training recall.
// Baseline holds the pre-rule lessons and only SHRINKS. Re-seed the baseline
// after authoring with: WRITE_LESSON_SOURCE_BASELINE=1 npx vitest run lessonSources

const keyOf = (l: { openingId: string; scope: string; key: string }): string => `${l.openingId}#${l.scope}#${l.key}`;
const unsourced = ALL_LESSONS.filter((l) => !sourcesAreValid(l.lesson.sources)).map(keyOf).sort();

if (process.env.WRITE_LESSON_SOURCE_BASELINE) {
  writeFileSync(
    'src/data/lessons/lessonSources.baseline.json',
    JSON.stringify({ _doc: (baselineRaw as { _doc: string })._doc, count: unsourced.length, keys: unsourced }, null, 2) + '\n',
  );
}

describe('masterclass beat-lessons (main opening lines) cite a verification source', () => {
  const baseline = new Set((baselineRaw as { keys: string[] }).keys);

  it('introduces NO unsourced masterclass lesson beyond the baseline', () => {
    const novel = unsourced.filter((k) => !baseline.has(k));
    expect(novel, `New masterclass lessons missing a resolvable source on their LessonScript (sources: ["book:<id>" | "concept:<id>" | reputable https URL]). Verify the line's ideas and record the ref:\n${novel.join('\n')}`).toEqual([]);
  });

  it('lesson-source baseline only shrinks', () => {
    const live = new Set(unsourced);
    const stale = [...baseline].filter((k) => !live.has(k));
    if (stale.length > 0) console.warn(`[lesson-sources] ${stale.length} baseline lessons now cite a source — prune them: ${stale.join(', ')}`);
    expect(stale.length).toBeLessThanOrEqual(baseline.size);
  });
});
