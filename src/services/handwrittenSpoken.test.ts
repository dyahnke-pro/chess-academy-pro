// The hand-written spoken forms have to still be in the file the app FETCHES.
//
// A hand-written note lives in two places by design: `corpus-spoken-handwritten.json`,
// which is small enough to read and review, and `public/data/corpus-spoken.json`,
// the 13 MB bake the runtime actually serves. Only the second one reaches a
// student. Two files means they can drift — a re-bake, a merge, an edit to the
// big file — and the drift is SILENT: the app keeps speaking, just not the
// reviewed words.
//
// This is the gate for that. It asserts the merge has been run and that every
// hand-written line is in the bake verbatim, which is the only claim that
// matters. `spokenBakeFidelity` separately re-runs the gate over the whole
// bake, so these lines are held to the same rules as the machine's.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// Typed via a `.d.mts` beside the module (2026-09-21) — the suppression this
// replaces made every call an unsafe `any` call.
import { validateHandwritten, corpusSources } from '../../scripts/merge-handwritten-spoken.mjs';

const ROOT = resolve(__dirname, '../..');
const read = (rel: string) => JSON.parse(readFileSync(resolve(ROOT, rel), 'utf8'));

interface Hand { spoken?: string; unspeakable?: string }
interface Baked { spoken?: string; unspeakable?: string; hand?: boolean }

describe('hand-written spoken forms', () => {
  const hand = read('src/data/corpus-spoken-handwritten.json') as Record<string, Hand>;
  const bake = read('public/data/corpus-spoken.json') as Record<string, Baked>;

  it('has some (guards the guard)', () => {
    // 🔒 EMPTY BY DESIGN, AND THAT IS THE ASSERTION (2026-09-21).
    //
    // This was the REWORD layer for the FARMED corpus. On 2026-08-26 the
    // anchored farmed notes and their 267 hand-authored forms were archived;
    // on 2026-09-21 the seven farmed creators were removed outright, leaving
    // danya + voiced — and voiced is already in spoken form, so there is
    // nothing here to reword. Its last entry (`hp-2a8`) was a hangingpawns
    // note and went orphan with its corpus.
    //
    // The old floor asked for >= 1 entry to prove non-vacuity. That is now
    // unsatisfiable AND wrong: the honest claim is that the layer is dormant.
    // So assert emptiness, with the reason — and note that the two sibling
    // assertions below iterate `hand`, so they re-arm on their own the moment
    // an entry is added. A reader must not mistake them for live coverage
    // while this is {}.
    expect(Object.keys(hand)).toEqual([]);
  });

  it('passes the same gate the machine-baked lines pass', () => {
    expect(validateHandwritten(hand, corpusSources())).toEqual([]);
  });

  it('is in the shipped bake, word for word', () => {
    const missing: string[] = [];
    const drifted: string[] = [];
    for (const [id, entry] of Object.entries(hand)) {
      const shipped = bake[id];
      if (!shipped) { missing.push(id); continue; }
      if (entry.unspeakable) {
        if (shipped.unspeakable !== entry.unspeakable) drifted.push(id);
        continue;
      }
      if (shipped.spoken !== entry.spoken) drifted.push(id);
    }
    // `npm run merge-handwritten` is the fix for both.
    expect({ missing, drifted }).toEqual({ missing: [], drifted: [] });
  });
});
