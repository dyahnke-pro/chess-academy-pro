// The corpus-visibility gate (David 2026-08-04: "I just want to confirm that
// you see All the downloaded corpus notes").
//
// Two of the four teaching corpora are FETCHED from `public/data/` rather than
// bundled, because a farmed corpus scales with the creator's back-catalogue and
// Hanging Pawns alone sat 250 KB under Workbox's 8 MB precache cap. That is the
// right call for the bundle — but it makes the two biggest corpora INVISIBLE to
// anything that doesn't run the boot prewarm. A day of coverage measurements was
// computed against 11,385 of 58,124 notes before this was noticed.
//
// The failure mode is silent in both directions: a corpus that stops being
// fetched keeps every test green while halving what the coach can find, and a
// measurement taken without priming understates coverage by ~80%. So this pins
// the counts to the files on disk.
import { describe, it, expect, beforeAll } from 'vitest';
import { loadFullCorpus } from '../test/loadFullCorpus';
import { secondaryCorpusStats } from './secondaryCorpora';
import { danyaCorpusStats, primeFloatingTeaching } from './danyaTeachingService';
import { readFileSync } from 'node:fs';
import registry from '../data/corpora.json';

describe('teaching corpus visibility', () => {
  // 120s: the helper parses ~37 MB of corpus JSON and builds the transposition
  // index in one synchronous pass. Heavy, deliberately — see loadFullCorpus.
  beforeAll(() => {
    loadFullCorpus();
    // The PRIMARY corpus now ships in two halves — the 122 positioned notes are
    // bundled so position lookups stay synchronous at boot, and the 10,022
    // un-positioned ones are fetched (2026-09-19). Merging the fetched half is
    // what "sees ALL the downloaded corpus notes" means for it, and without
    // this call the assertion below would pass against 1.2% of the corpus —
    // this gate's own failure mode, one level up, for the third time.
    primeFloatingTeaching();
  }, 120_000);

  it('sees every declared corpus, with counts matching the files on disk', () => {
    // Derived from the REGISTRY and the files themselves, never a hand-typed
    // roster. The roster is what rotted: this gate asserted four corpora and
    // 58,124 notes while eight were shipping, so it went green over a corpus a
    // third larger than the one it was checking — the exact blindness it exists
    // to prevent, one level up.
    const secondary = secondaryCorpusStats();
    const expectedKeys = registry.corpora
      .filter((c) => !c.primary)
      .map((c) => c.key)
      .sort();
    expect(secondary.map((s) => s.key).sort()).toEqual(expectedKeys);

    const byKey = Object.fromEntries(secondary.map((s) => [s.key, s.notes]));
    // Exact counts, read from disk: a corpus that silently shrinks — a re-farm
    // that dropped videos, a truncated download — is what this must catch, and
    // a floor would let that through.
    const noteCount = (path: string): number =>
      (JSON.parse(readFileSync(path, 'utf8')) as { notes: unknown[] }).notes.length;
    for (const c of registry.corpora) {
      // BOTH halves where a corpus declares one: the split is a load strategy,
      // never a reduction in what the coach can find.
      const floatingPath = (c as { floatingPath?: string }).floatingPath;
      const onDisk = noteCount(c.path) + (floatingPath ? noteCount(floatingPath) : 0);
      const seen = c.primary ? danyaCorpusStats().notes : byKey[c.key];
      expect(seen, `${c.key}: loader sees ${seen} notes, files hold ${onDisk}`).toBe(onDisk);
    }
  });

  it('degrades to NO secondary corpus when the fetch has not resolved', async () => {
    // Not a hypothetical: this is every page-load before the prewarm lands, and
    // it must mean "no gap teaching yet", never wrong teaching.
    //
    // 🔴 This expected `['chessbrah']` until 2026-09-19, when chessbrah was the
    // one statically-imported secondary corpus. It is fetched now — 1.81 MB of
    // boot payload for 2,766 notes of which 2,748 carry no position, so not one
    // of those bytes could answer a position query — and the old expectation is
    // DELETED rather than annotated. There is no static tier left, which makes
    // the degraded state EMPTY and the contract stricter, not weaker.
    const { unloadFullCorpus } = await import('../test/loadFullCorpus');
    unloadFullCorpus();
    expect(secondaryCorpusStats().map((s) => s.key)).toEqual([]);
    loadFullCorpus();
  });
});
