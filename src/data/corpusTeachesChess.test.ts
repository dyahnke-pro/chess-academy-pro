import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { noteTeachesChess } from '../services/sourceMeta.shared.mjs';
import registry from './corpora.json';

/**
 * Gate — A SHIPPED NOTE TEACHES CHESS, NOT THE VIDEO IT CAME FROM (2026-09-19).
 *
 * David, reading real samples: "they were messing up the narration for our
 * coach." They were, and a filter already existed — it was just called in three
 * places out of eight. `spokenTacticNote`, `endgameNoteForLesson`,
 * `conceptNotesFor`, `buildDanyaTeachingBlock` and `notesForOpening` — every
 * tier a FLOATING note is reached by — had none, so prose like "The speaker
 * expresses gratitude for community support" could reach the endgame cards and
 * the LESSON BACKGROUND block.
 *
 * Two fixes, and this gate covers the payload half: the notes are stripped from
 * every corpus (`scripts/strip-source-meta-notes.mjs`, archived not deleted) and
 * `danyaTeachingService` now filters at LOAD so a new tier inherits it. A
 * re-farm that reintroduces them fails here.
 *
 * Cost of the strip, measured rather than assumed: 354 of 65,712 notes (0.54%),
 * and endgame-card coverage is 23/27 both before and after with the same four
 * misses. Nothing was lost.
 */
describe('shipped corpora teach chess, not their source', () => {
  const paths = registry.corpora.flatMap((c) => {
    const floatingPath = (c as { floatingPath?: string }).floatingPath;
    return floatingPath ? [c.path, floatingPath] : [c.path];
  });

  it('finds corpora to check (guards the guard)', () => {
    // 🔒 EVERY REGISTERED PATH EXISTS — not a magic count (2026-09-21).
    //
    // This was `> 3`, which is a number that goes stale the moment the roster
    // changes, and it did: David cut the corpus to ONE source ("the danya ones
    // that we have tied exactly to positions. nothing else!"), leaving exactly
    // three halves — danya's two plus voiced — so the guard failed while the
    // thing it guards was perfectly healthy.
    //
    // Asserting that every path in the registry resolves is strictly stronger
    // AND cannot rot: it still proves the `it.each` below is non-vacuous, and
    // it additionally catches a registry entry pointing at a file nobody
    // shipped, which the count never could.
    const missing = paths.filter((p) => !existsSync(resolve(process.cwd(), p)));
    expect(missing, 'corpora.json names a file that is not on disk').toEqual([]);
    expect(paths.length).toBeGreaterThan(0);
  });

  it.each(paths)('%s', (rel) => {
    const path = resolve(process.cwd(), rel);
    if (!existsSync(path)) return;
    const notes = (JSON.parse(readFileSync(path, 'utf8')) as { notes: Array<{ explains?: string }> }).notes;
    expect(notes.length, 'an empty corpus would pass vacuously').toBeGreaterThan(0);
    const bad = notes.filter((n) => !noteTeachesChess(n));
    expect(
      bad.length,
      `${rel} ships ${bad.length} notes that describe their source rather than chess, e.g. `
        + `"${(bad[0]?.explains ?? '').slice(0, 120)}"`,
    ).toBe(0);
  });
});
