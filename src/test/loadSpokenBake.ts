// loadSpokenBake — let a test hear what the app actually SAYS.
//
// The sibling of `loadFullCorpus`, and it exists for the same reason: the file
// is FETCHED at runtime, nothing in vitest fetches it, so a test that checks
// spoken output is checking prose production never speaks.
//
// `public/data/corpus-spoken.json` is the Tier-1 bake — every corpus note
// rewritten offline into its final spoken form, gated, and committed. At
// runtime `spokenNoteBake` fetches it and `spokenBeatText` serves it. Without
// it `bakedSpoken` returns undefined for every note, and since 2026-08-08 a
// FLOATING note with no bake is deliberately SILENT — so an unloaded bake makes
// the entire tag-reached tier vanish, which is exactly what it should do in the
// app and exactly what invalidates a test.
//
// That silence rule is not an inconvenience to work around. A floating note is
// reached by concept or tactic tag, so its original prose names a foreign
// example's squares — measured at 1,665 notes naming a square that belongs to
// another game, including raw fragments like "Nxc4, exploiting the pinned
// knight on c3." Baking strips that geometry. Un-baked, the honest output is
// nothing.
//
// Call this in `beforeAll` alongside `loadFullCorpus()` in any test that
// asserts on spoken text.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { __setSpokenBakeCache } from '../services/spokenNoteBake';

interface BakedEntry { spoken?: string; kind?: string; unspeakable?: string }

let loaded = false;

/** Prime the bake cache from disk, once per process. Idempotent. */
export function loadSpokenBake(): void {
  if (loaded) return;
  const path = join(process.cwd(), 'public/data/corpus-spoken.json');
  const raw = JSON.parse(readFileSync(path, 'utf8')) as Record<string, BakedEntry>;
  __setSpokenBakeCache(new Map(Object.entries(raw)));
  loaded = true;
}
