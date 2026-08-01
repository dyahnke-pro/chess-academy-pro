/**
 * farmedCorpusData — lazy loader for the FARMED secondary teaching corpora.
 *
 * Why these left the bundle (2026-08-01): a farmed corpus scales with the
 * creator's back-catalogue, not with the app. Hanging Pawns alone distilled to
 * 10,209 notes / ~9 MB, which as a static import became a 7.94 MB chunk against
 * Workbox's 8 MB precache cap — ~250 KB of headroom. Saint Louis has 3.7x the
 * videos, so it could never have fitted. Fetching from `public/` instead keeps
 * every future farm out of the JS bundle entirely: the corpus grows, the bundle
 * does not. Same pattern as `proGameReferenceData` and `masterPlayLookup`.
 *
 * chessbrah stays a static import — it is small and predates this, and moving it
 * would change behaviour for no gain.
 *
 * The lookup API stays SYNCHRONOUS (see `secondaryCorpora`), so this exposes the
 * same two shapes as the pro-game loader: an async prewarm called on boot, and a
 * sync read that returns nothing until the prewarm resolves. That degradation is
 * safe here — these corpora are the GAP tier, consulted only where the primary
 * corpus is silent, so an unprimed cache means "no gap teaching yet", never
 * wrong teaching. Empty beats invented (CLAUDE.md).
 */
import type { TeachingsBundle } from './secondaryCorpus';

/** Farmed corpora, in gap-tier preference order. Served same-origin: Vite
 *  copies `public/` to the build root verbatim. */
const FARMED: Array<{ key: string; url: string }> = [
  { key: 'hangingpawns', url: '/data/hangingpawns-teachings.json' },
  { key: 'saintlouis', url: '/data/saintlouis-teachings.json' },
];

const EMPTY: TeachingsBundle = { generatedAt: '', videosDistilled: 0, noteCount: 0, notes: [] };

/** `undefined` = not loaded yet. */
let cache: Array<{ key: string; data: TeachingsBundle }> | undefined;
let inflight: Promise<Array<{ key: string; data: TeachingsBundle }>> | null = null;

const isBundle = (raw: unknown): raw is TeachingsBundle =>
  !!raw && typeof raw === 'object' && Array.isArray((raw as TeachingsBundle).notes);

async function fetchOne(url: string): Promise<TeachingsBundle> {
  try {
    if (typeof fetch !== 'function') return EMPTY;
    const resp = await fetch(url);
    if (!resp.ok) return EMPTY;
    const raw = (await resp.json()) as unknown;
    return isBundle(raw) ? raw : EMPTY;
  } catch {
    // Missing file / offline / parse error — the gap tier simply stays quiet.
    return EMPTY;
  }
}

/** Fetch + cache every farmed corpus once. Idempotent; concurrent callers share
 *  the inflight promise. Never rejects — a failed corpus resolves to empty. */
export async function loadFarmedCorpora(): Promise<Array<{ key: string; data: TeachingsBundle }>> {
  if (cache !== undefined) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const loaded = await Promise.all(
        FARMED.map(async ({ key, url }) => ({ key, data: await fetchOne(url) })),
      );
      cache = loaded;
      return cache;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Synchronous read. Returns `[]` until `loadFarmedCorpora()` has resolved. */
export function getFarmedCorporaSync(): Array<{ key: string; data: TeachingsBundle }> {
  return cache ?? [];
}

/** Test seam — prime (or clear) the cache without fetching. */
export function __setFarmedCorporaCache(
  data: Array<{ key: string; data: TeachingsBundle }> | undefined,
): void {
  cache = data;
  inflight = null;
}
