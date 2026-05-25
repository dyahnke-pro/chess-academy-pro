import { describe, it, expect } from 'vitest';
import { ALL_LESSONS } from './registry';
import { sourcesAreValid } from '../narrationSources';

// NON-NEGOTIABLE (David 2026-05-25): every masterclass beat-lesson — main
// opening line, variation tab, named trap — MUST record a resolvable
// independent-verification source on its LessonScript (book:/concept:/reputable
// URL), proof its ideas were checked against the books/online, not training
// recall. There is NO baseline escape: a new lesson shipped without a source
// fails this gate, full stop. (All 156 lessons were sourced 2026-05-25.)

const keyOf = (l: { openingId: string; scope: string; key: string }): string => `${l.openingId}#${l.scope}#${l.key}`;
const unsourced = ALL_LESSONS.filter((l) => !sourcesAreValid(l.lesson.sources)).map(keyOf).sort();

describe('masterclass beat-lessons (main opening lines) cite a verification source', () => {
  it('EVERY masterclass lesson has a resolvable source — no exceptions', () => {
    expect(unsourced, `Masterclass lessons missing a resolvable source on their LessonScript (sources: ["book:<id>" | "concept:<id>" | reputable https URL]). Verify the line's ideas and record the ref — this gate has no baseline:\n${unsourced.join('\n')}`).toEqual([]);
  });
});
