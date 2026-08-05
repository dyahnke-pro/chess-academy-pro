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
import type { TeachingsBundle } from '../services/secondaryCorpus';

/** Mirrors the `FARMED` list in farmedCorpusData — same keys, same files. */
const FARMED_FILES: Array<{ key: string; file: string }> = [
  { key: 'hangingpawns', file: 'hangingpawns-teachings.json' },
  { key: 'saintlouis', file: 'saintlouis-teachings.json' },
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
  return primed.map((c) => ({ key: c.key, notes: c.data.notes.length }));
}

/** Drop back to the static-only view (what an unprimed browser session sees
 *  before boot finishes). Use when a test needs to assert graceful degradation. */
export function unloadFullCorpus(): void {
  __setFarmedCorporaCache(undefined);
}
