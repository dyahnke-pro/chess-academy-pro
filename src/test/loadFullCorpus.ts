// loadFullCorpus — let a test see the WHOLE teaching corpus, not just the fifth
// of it that happens to be a static import.
//
// David 2026-08-04: "I just want to confirm that you see All the downloaded
// corpus notes." The answer was no, and it invalidated a day of measurements.
//
// Two of the four corpora are FETCHED from `public/data/` at runtime rather than
// bundled — Hanging Pawns alone is 7.94 MB against Workbox's 8 MB precache cap,
// and Saint Louis is 3.7x that. In the browser `dataLoader.seedDatabase()` calls
// `loadFarmedCorpora()` on boot and all four are live. In vitest nothing calls
// it, and node's `fetch('/data/…')` has no origin to resolve a relative URL
// against, so `secondaryCorpora()` silently returns only the two static ones:
//
//     danya         8,162  static   ← visible in tests
//     chessbrah     3,223  static   ← visible in tests
//     hangingpawns 10,209  fetched  ← INVISIBLE
//     saintlouis   36,530  fetched  ← INVISIBLE
//
// 11,385 of 58,124 — 19.6%. Every coverage number measured without this helper
// is understated, and a gate written without it passes while testing a fifth of
// the data.
//
// Reads the same files the browser fetches, from disk, and primes the same cache
// the real loader fills — so retrieval runs through production code paths, not a
// reimplementation.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { __setFarmedCorporaCache } from '../services/farmedCorpusData';
import { warmSecondaryPositionIndexSync } from '../services/secondaryCorpora';
import { primeFloatingTeaching } from '../services/danyaTeachingService';
import type { TeachingsBundle } from '../services/secondaryCorpus';
import type { DanyaNote } from '../services/danyaTeachingService';
import registry from '../data/corpora.json';

/**
 * From the REGISTRY, not a copy of it.
 *
 * This list was hand-mirrored from `farmedCorpusData` and went stale the moment
 * four more corpora were farmed — so this helper, whose entire purpose is to
 * stop tests measuring a fraction of the data, was itself measuring a fraction
 * of the data. Every coverage number taken through it while it was stale
 * understated the corpus, which is precisely the failure its own header warns
 * about, recurring one level up.
 *
 * `src/data/corpora.json` is the single declaration; a new corpus appears here
 * automatically.
 */
const FARMED_FILES: Array<{ key: string; file: string }> = [
  ...registry.corpora
    .filter((c) => c.load === 'fetch')
    .map((c) => ({ key: c.key, file: c.path.replace(/^public\/data\//, '') })),
  // The PRIMARY corpus's floating half (2026-09-19). It is fetched like a
  // farmed corpus, so vitest cannot see it either — and it is 10,022 of
  // danya's 10,144 notes. Omitting it here would make this helper understate
  // the corpus by 99%, which is precisely the failure its own header exists to
  // prevent, recurring one level up for the second time.
  ...registry.corpora
    .filter((c): c is typeof c & { floatingPath: string } => typeof c.floatingPath === 'string')
    .map((c) => ({ key: `${c.key}:floating`, file: c.floatingPath.replace(/^public\/data\//, '') })),
];

const EMPTY: TeachingsBundle = { generatedAt: '', videosDistilled: 0, noteCount: 0, notes: [] };

let primed: Array<{ key: string; data: TeachingsBundle }> | null = null;

/**
 * Prime the farmed corpora from disk so `secondaryCorpora()` sees all four.
 * Idempotent and memoised — the two files are ~37 MB of JSON, so parsing them
 * once per process matters for suite runtime.
 *
 * Returns the per-corpus note counts so a caller can assert on them.
 */
export function loadFullCorpus(): Array<{ key: string; notes: number }> {
  if (!primed) {
    primed = FARMED_FILES.map(({ key, file }) => {
      try {
        const raw = JSON.parse(
          readFileSync(join(process.cwd(), 'public', 'data', file), 'utf8'),
        ) as TeachingsBundle;
        return { key, data: Array.isArray(raw?.notes) ? raw : EMPTY };
      } catch {
        // A missing file is a real signal, not something to paper over — the
        // caller's assertion on the counts is what surfaces it.
        return { key, data: EMPTY };
      }
    });
  }
  __setFarmedCorporaCache(primed);
  // Build the transposition index too. In the browser the boot prewarm does this
  // in chunks; nothing in vitest performs that either, and `notesForFen` is
  // read-only by design (forcing the build on a lookup is a multi-second stall
  // on a phone). Without this, a test asserting on the transposition tier would
  // pass or fail on whether some earlier test happened to warm the index.
  warmSecondaryPositionIndexSync();
  // The PRIMARY corpus's floating half merges into its concept index through
  // `primeFloatingTeaching` — in the browser the first consumer calls it; in
  // vitest nothing did, so a test that read the concept index before any
  // retrieval saw only the 122 bundled positioned notes and reported concepts
  // the corpus holds hundreds of as missing. Same production path, once.
  primeFloatingTeaching();
  return primed.map((c) => ({ key: c.key, notes: c.data.notes.length }));
}

/**
 * EVERY corpus half as `{ key, path }`, repo-relative, registry-derived.
 *
 * Three gates hand-listed these paths and the 2026-09-19 split broke all three
 * at once (chessbrah moved out of `src/data/`): one crashed on import and took
 * eleven tests with it, one silently skipped the missing file and went red on
 * its own note-count floor, one skipped a whole corpus from its report. A list
 * of file paths is a duplicated constant, and duplicated constants drift.
 */
export const CORPUS_FILES: Array<{ key: string; path: string }> = registry.corpora.flatMap((c) => [
  { key: c.key, path: c.path },
  ...(typeof c.floatingPath === 'string' ? [{ key: `${c.key}:floating`, path: c.floatingPath }] : []),
]);

/**
 * EVERY note of EVERY corpus half — static, fetched, and floating — read from
 * the registry.
 *
 * `loadFullCorpus` primes the production cache and reports COUNTS; a gate that
 * needs the notes themselves used to hand-list the files, and the 2026-09-19
 * corpus split made that list wrong in two directions at once:
 * `src/data/chessbrah-teachings.json` moved to `public/data/` (so the import
 * threw and took the whole file down with it), and `src/data/danya-teachings.json`
 * became the 122 POSITIONED notes with the other 10,022 in `danya-floating.json`.
 * Four creators were never listed at all. So the reader lives here, beside the
 * other one, and both derive from `corpora.json`.
 */
function readNotes(rel: string): DanyaNote[] {
  try {
    const raw = JSON.parse(readFileSync(join(process.cwd(), rel), 'utf8')) as TeachingsBundle;
    return Array.isArray(raw?.notes) ? raw.notes : [];
  } catch {
    // A missing half is a real signal; the caller's floor assertion surfaces it
    // rather than this swallowing it into a quiet zero.
    return [];
  }
}

export function allCorpusNotes(): DanyaNote[] {
  return CORPUS_FILES.flatMap((c) => readNotes(c.path));
}

/**
 * The PRIMARY corpus's notes only (both halves).
 *
 * Anchor derivation is primary-only by rule — an anchor makes a note
 * selectable at an exact board, and only danya's may be (David 2026-09-21).
 * Anything measuring COVERAGE wants `allCorpusNotes`; anything about ANCHORS
 * wants this.
 */
export function primaryCorpusNotes(): DanyaNote[] {
  const primary = registry.corpora.filter((c) => c.primary);
  return primary.flatMap((c) => [
    ...readNotes(c.path),
    ...(typeof c.floatingPath === 'string' ? readNotes(c.floatingPath) : []),
  ]);
}

/** Drop back to the static-only view (what an unprimed browser session sees
 *  before boot finishes). Use when a test needs to assert graceful degradation. */
export function unloadFullCorpus(): void {
  __setFarmedCorporaCache(undefined);
}

/**
 * PROVE THE WHOLE CORPUS LOADED — derived from the registry, never a count.
 *
 * Two suites used to assert a hard-coded floor (`> 46_000`, `> 45_000`) to
 * prove they were not measuring a fraction of the data. The floor was a copy of
 * the roster, and it went stale the day the anchored farms were retired: the
 * registry now declares two corpora and both load in full, yet both suites
 * failed "not primed" on 17,405 notes. The claim the floor stood for is this
 * one: EVERY fetched corpus the registry declares was read, and none came back
 * empty. A missing or unreadable file still fails here, loudly.
 */
export function unprimedCorpora(loaded: ReadonlyArray<{ key: string; notes: number }>): string[] {
  const got = new Map(loaded.map((c) => [c.key, c.notes]));
  return FARMED_FILES.filter(({ key }) => !((got.get(key) ?? 0) > 0)).map(({ key, file }) => `${key} (${file})`);
}
