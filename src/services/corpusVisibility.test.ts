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
import { danyaCorpusStats } from './danyaTeachingService';

describe('teaching corpus visibility', () => {
  // 120s: the helper parses ~37 MB of corpus JSON and builds the transposition
  // index in one synchronous pass. Heavy, deliberately — see loadFullCorpus.
  beforeAll(() => {
    loadFullCorpus();
  }, 120_000);

  it('sees all four corpora, with counts matching the files on disk', () => {
    const secondary = secondaryCorpusStats();
    const keys = secondary.map((s) => s.key).sort();
    expect(keys).toEqual(['chessbrah', 'hangingpawns', 'saintlouis']);

    const byKey = Object.fromEntries(secondary.map((s) => [s.key, s.notes]));
    const primary = danyaCorpusStats().notes;

    // Exact counts, not floors: a corpus that silently shrinks (a re-farm that
    // dropped videos, a truncated download) is exactly what this must catch.
    expect(primary).toBe(8162);
    expect(byKey.chessbrah).toBe(3223);
    expect(byKey.hangingpawns).toBe(10209);
    expect(byKey.saintlouis).toBe(36530);
    expect(primary + byKey.chessbrah + byKey.hangingpawns + byKey.saintlouis).toBe(58124);
  });

  it('degrades to the static corpora when the farmed fetch has not resolved', async () => {
    // Not a hypothetical: this is every page-load before the boot prewarm lands,
    // and it must mean "no gap teaching yet", never wrong teaching.
    const { unloadFullCorpus } = await import('../test/loadFullCorpus');
    unloadFullCorpus();
    expect(secondaryCorpusStats().map((s) => s.key)).toEqual(['chessbrah']);
    loadFullCorpus();
  });
});
