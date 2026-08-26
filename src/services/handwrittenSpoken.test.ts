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
import { validateHandwritten, corpusSources } from '../../scripts/merge-handwritten-spoken.mjs';

const ROOT = resolve(__dirname, '../..');
const read = (rel: string) => JSON.parse(readFileSync(resolve(ROOT, rel), 'utf8'));

interface Hand { spoken?: string; unspeakable?: string }
interface Baked { spoken?: string; unspeakable?: string; hand?: boolean }

describe('hand-written spoken forms', () => {
  const hand = read('src/data/corpus-spoken-handwritten.json') as Record<string, Hand>;
  const bake = read('public/data/corpus-spoken.json') as Record<string, Baked>;

  it('has some (guards the guard)', () => {
    // Every assertion below passes vacuously on an empty file. The hand-written
    // spoken bake was the REWORD layer for the farmed corpus; on 2026-08-26 the
    // anchored farmed notes (and their 267 hand-authored forms) were archived to
    // data/archive/, and voiced — the sole exact-position source now — is already
    // in spoken form and needs no rewrite. So the file is expected minimal; the
    // sibling assertions still hold whatever remains to the same gate + bake.
    expect(Object.keys(hand).length).toBeGreaterThanOrEqual(1);
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
