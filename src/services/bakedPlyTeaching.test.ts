// The bake teaches every ply of a baked opening — in a GAME, not only a lesson.
//
// David 2026-08-09: "the entire opening needs teaching." Two full games driven
// against prod got roughly two plies in eight taught, most of it general rather
// than about the move on the board — while 220 plies of authored, reviewed
// opening prose sat in `walkthrough-narrations.json`, one idea per move across
// 23 openings, reachable only by asking to be TAUGHT the opening.
//
// `bakedNarrationFor` asks whether a whole line is baked, which a game three
// moves in can never satisfy. `bakedTeachingForPly` asks the question a game
// has: is the move I just played on a baked line, and what does the bake say
// about it.
import { describe, it, expect } from 'vitest';
import bakedData from '../data/walkthrough-narrations.json';
import { bakedTeachingForPly, bakedNarrationFor } from './bakedWalkthroughNarration';

const DATA = bakedData as {
  narrations: Record<string, { openingName: string; spine: string[]; ideas: { text: string }[] }>;
};

describe('teaching for the move just played', () => {
  it('THE GAP: a game on a baked line got nothing from the bake', () => {
    // Three moves into the Latvian, the lesson-shaped lookup is empty — it
    // wants the entire spine — while the ply lookup has authored prose.
    const partial = ['e4', 'e5', 'Nf3'];
    expect(bakedNarrationFor('Latvian Gambit', partial)).toBeNull();
    expect(bakedTeachingForPly('Latvian Gambit', partial)?.text).toBeTruthy();
  });

  it('teaches EVERY ply of a baked line, not a scattering', () => {
    const entry = DATA.narrations['latvian gambit'];
    for (let n = 1; n <= entry.spine.length; n += 1) {
      const hit = bakedTeachingForPly('Latvian Gambit', entry.spine.slice(0, n));
      expect(hit, `ply ${n} of ${entry.spine.length} has no teaching`).not.toBeNull();
      expect(hit?.ply).toBe(n);
      expect(hit?.text.length ?? 0).toBeGreaterThan(20);
    }
  });

  it('every baked opening teaches every one of its plies', () => {
    // The whole point is coverage, so it is asserted over the whole bake
    // rather than one sample. 23 openings today.
    const missing: string[] = [];
    for (const entry of Object.values(DATA.narrations)) {
      for (let n = 1; n <= entry.spine.length; n += 1) {
        if (!bakedTeachingForPly(entry.openingName, entry.spine.slice(0, n))) {
          missing.push(`${entry.openingName} ply ${n}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('reports how much teaching is still ahead', () => {
    const entry = DATA.narrations['latvian gambit'];
    const hit = bakedTeachingForPly('Latvian Gambit', entry.spine.slice(0, 3));
    expect(hit?.remaining).toBe(entry.spine.length - 3);
  });
});

describe('it can never narrate a line that is not being played', () => {
  it('a deviation from the spine ends the teaching', () => {
    // The name match is fuzzy; the MOVES are not. One move off the line and the
    // bake has nothing to say — which is what makes the fuzzy name safe.
    expect(bakedTeachingForPly('Latvian Gambit', ['e4', 'e5', 'Nc3'])).toBeNull();
  });

  it('a line longer than the bake is past its teaching', () => {
    const entry = DATA.narrations['latvian gambit'];
    expect(bakedTeachingForPly('Latvian Gambit', [...entry.spine, 'a3'])).toBeNull();
  });

  it('an unknown opening name gets nothing', () => {
    expect(bakedTeachingForPly('Not A Real Opening', ['e4', 'e5'])).toBeNull();
  });

  it('no name, no teaching', () => {
    expect(bakedTeachingForPly(null, ['e4'])).toBeNull();
    expect(bakedTeachingForPly('Latvian Gambit', [])).toBeNull();
  });
});

describe('the corpus is measured, not assumed', () => {
  it('holds the count of per-ply opening teaching as a floor', () => {
    const plies = Object.values(DATA.narrations).reduce((n, e) => n + e.spine.length, 0);
    // Shrink-only: baking more openings raises this, and losing teaching that
    // already shipped should fail loudly rather than quietly go quiet.
    expect(plies).toBeGreaterThanOrEqual(220);
    expect(Object.keys(DATA.narrations).length).toBeGreaterThanOrEqual(23);
  });
});
