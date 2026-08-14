// A corpus that is not in the bake list ships SILENT.
//
// The 2026-08-14 farms (gothamchess, hikaru, imrosen, magnuscarlsen) were wired
// into `farmedCorpusData`, counted in every coverage number, gated by
// `secondaryTeachings.test`, and shipped — with all 3,585 of their notes unable
// to be spoken, because `scripts/bake-spoken-notes.mjs` carries a hardcoded
// corpus list nobody updated.
//
// Nothing errored. Most of a farm is FLOATING notes (no lineSan, reached by
// concept or tactic tag), and a floating note is deliberately mute until baked
// — its original prose names a foreign game's squares and would be false read
// over a live board. So the failure mode is a corpus that looks fully present
// everywhere you would think to check, and is simply never heard.
//
// This gate closes the loop the only way that survives a forgetful session:
// adding a corpus to the app without adding it to the bake now FAILS, and says
// which file to edit.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

const BAKE_SCRIPT = 'scripts/bake-spoken-notes.mjs';

/** Every shipped teachings corpus, found on disk rather than from a list — a
 *  list is the thing that just failed us. */
function shippedCorpora(): string[] {
  const out: string[] = [];
  for (const dir of ['src/data', 'public/data']) {
    for (const f of readdirSync(dir)) {
      if (/-teachings\.json$/.test(f)) out.push(`${dir}/${f}`);
    }
  }
  return out.sort();
}

describe('every shipped corpus is in the bake list', () => {
  const bake = readFileSync(BAKE_SCRIPT, 'utf8');
  const corpora = shippedCorpora();

  it('finds the corpora on disk (guards the guard)', () => {
    // If this ever goes empty the assertions below pass vacuously and the gate
    // rots into decoration.
    expect(corpora.length).toBeGreaterThan(0);
  });

  it.each(shippedCorpora())('%s is baked', (path) => {
    expect(
      bake.includes(path),
      `${path} ships in the app but is missing from ${BAKE_SCRIPT}'s CORPORA list, `
        + 'so none of its notes can ever be spoken (floating notes are silent until baked). '
        + `Add '${path}' to that list and run the bake.`,
    ).toBe(true);
  });
});
