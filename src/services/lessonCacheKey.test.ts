// The lesson cache must key on the OPENING, not on what the student typed.
//
// David 2026-08-05: "Routing takes about 60 seconds because the lesson plans
// needs to build. It should cache after first use, make sure that is the case."
// It was not the case. `requestedName` in `CoachTeachPage.handleSubmit` is raw
// input on four of its five paths — only the fuzzy branch canonicalizes — so
// every phrasing of the same ask wrote its own row and paid the full build.
//
// `resolveOpeningEntry` has carried the instruction the whole time:
//   "Callers should use the returned canonicalName for cache keys … so that
//    'najdorf' and 'Sicilian Defense: Najdorf Variation' land on the same cache
//    row."
// No caller did. Resolving on BOTH read and write is what makes a phrasing the
// cache has never seen still hit the row an earlier phrasing built.
import { describe, it, expect, beforeEach } from 'vitest';
import { canonicalCacheKey, cacheOpening, getCachedOpening } from './openingGenerator';
import { db } from '../db/schema';
import type { WalkthroughTree } from '../types/walkthroughTree';

function makeTree(openingName: string): WalkthroughTree {
  return {
    openingName,
    eco: 'B10',
    intro: 'i',
    outro: 'o',
    root: {
      san: null,
      movedBy: null,
      idea: '',
      children: [
        { node: { san: 'e4', movedBy: 'white', idea: 'centre', children: [] } },
      ],
    },
  };
}

describe('lesson cache keys on the opening, not the phrasing', () => {
  beforeEach(async () => {
    await db.cachedOpenings.clear();
    await db.meta.clear();
  });

  it('sends different phrasings of one opening to the same row', () => {
    const keys = ['caro kann', 'Caro-Kann Defence', 'caro-kann defense', 'CARO KANN DEFENSE']
      .map((phrase) => canonicalCacheKey(phrase));
    // Whatever the canonical string is, every phrasing must agree on it —
    // that agreement IS the cache hit. Note "Defence" and "Defense": the app
    // writes British, the DB is American ASCII, and keying either side off the
    // raw string splits one opening across two rows.
    expect(new Set(keys).size, `phrasings disagreed: ${JSON.stringify(keys)}`).toBe(1);
  });

  it('bridges a phrasing the resolver cannot place, once it has been built', async () => {
    // "the caro" resolves to nothing on its own — there is no such DB name. The
    // alias written at cache time is what carries it to the right row on the
    // next ask, so a wording the resolver misses still only builds once.
    expect(canonicalCacheKey('the caro')).toBe('the caro');
    await cacheOpening('the caro', makeTree('Caro-Kann Defence'));
    expect(await getCachedOpening('the caro')).not.toBeNull();
  });

  it('a phrasing never seen before hits the row an earlier phrasing built', async () => {
    await cacheOpening('the caro', makeTree('Caro-Kann Defence'));
    // No alias exists for this wording; only resolution can find the row. This
    // is the case that was costing a second ~60s build.
    const hit = await getCachedOpening('caro kann');
    expect(hit, 'a fresh phrasing rebuilt instead of hitting the cache').not.toBeNull();
    expect(hit?.openingName).toBe('Caro-Kann Defence');
  });

  it('writes ONE row per opening however it was asked for', async () => {
    await cacheOpening('the caro', makeTree('Caro-Kann Defence'));
    await cacheOpening('Caro-Kann Defence', makeTree('Caro-Kann Defence'));
    await cacheOpening('caro kann', makeTree('Caro-Kann Defence'));
    expect(await db.cachedOpenings.count()).toBe(1);
  });

  it('keeps Face and Tour lessons on their own rows', async () => {
    // Genuinely different lessons of the same opening — a quick tour, and the
    // counter side — so sharing a row would serve the wrong lesson.
    await cacheOpening('Caro-Kann Defence', makeTree('Caro-Kann Defence'));
    await cacheOpening('Face: Caro-Kann Defence', makeTree('Caro-Kann Defence'));
    await cacheOpening('Tour: Caro-Kann Defence', makeTree('Caro-Kann Defence'));
    expect(await db.cachedOpenings.count()).toBe(3);
    expect(canonicalCacheKey('Face: the caro')).not.toBe(canonicalCacheKey('the caro'));
    expect(canonicalCacheKey('Tour: the caro')).not.toBe(canonicalCacheKey('the caro'));
  });

  it('stamps the row it actually lives in, so the stage merge can find it', async () => {
    // `generateMissingStagesInBackground` is handed the tree and merges stages
    // back by `tree.cacheKey`. A tree stamped with a key no row uses is the
    // trap-stage hang: stages written, surface waiting forever.
    const tree = makeTree('Caro-Kann Defence');
    await cacheOpening('the caro', tree);
    expect(tree.cacheKey).toBeTruthy();
    expect(await db.cachedOpenings.get(tree.cacheKey as string)).toBeTruthy();
  });

  it('still caches an opening the resolver cannot place', async () => {
    // Constructed matchups and face-mode counter lines have no DB entry. The
    // tree still knows what it taught, and a lesson that cannot be cached is a
    // lesson rebuilt on every ask.
    await cacheOpening('Frobnitz vs Widget matchup', makeTree('Frobnitz vs Widget'));
    expect(await getCachedOpening('Frobnitz vs Widget matchup')).not.toBeNull();
  });
});
