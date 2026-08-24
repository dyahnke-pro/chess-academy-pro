/**
 * farmedCorpusData — LAZY, per-corpus loader for the FARMED secondary teaching
 * corpora (the "video dumps": notes distilled from each creator's YouTube
 * back-catalogue).
 *
 * Why these left the bundle (2026-08-01): a farmed corpus scales with the
 * creator's back-catalogue, not with the app. Hanging Pawns alone distilled to
 * 10,209 notes / ~9 MB, which as a static import became a 7.94 MB chunk against
 * Workbox's 8 MB precache cap — ~250 KB of headroom. Saint Louis has 3.7x the
 * videos, so it could never have fitted. Fetching from `public/` instead keeps
 * every future farm out of the JS bundle entirely: the corpus grows, the bundle
 * does not. Same pattern as `proGameReferenceData` and `masterPlayLookup`.
 *
 * Why it is now LAZY and per-corpus (2026-08-23, David: "video dumps pulling
 * over too much data" — the app was OOM-crashing desktop machines and iOS
 * WKWebView). The old shape fetched ALL SIX corpora in one boot `Promise.all`
 * — 53 MB with the spoken bake — and parsed each multi-MB file back-to-back on
 * the main thread AT BOOT, then held every byte forever. Saint Louis (28 MB)
 * dominated. The fetch+parse spike (six JSON.parse of multi-MB strings) landed
 * on the boot critical path of EVERY session, even ones that never opened the
 * coach, and the retained ~109 MB of raw corpus ballooned the heap. This module
 * now:
 *   - loads each corpus INDEPENDENTLY, not all-or-nothing;
 *   - primes them ONLY when a teaching lookup actually consults the tier
 *     (`primeFarmedCorporaLazily`, called from the secondaryCorpora lookups),
 *     never on boot — so a dashboard/kids/tactics session pays nothing;
 *   - primes SEQUENTIALLY, smallest first with Saint Louis LAST, so there is
 *     never a simultaneous multi-file fetch or a back-to-back parse burst.
 *
 * The lookup API stays SYNCHRONOUS (see `secondaryCorpora`), and the sync read
 * (`getFarmedCorporaSync`) stays a PURE accessor — it returns whatever corpora
 * have loaded so far and triggers nothing. Priming is an explicit call. That
 * degradation is safe: these corpora are the GAP tier, consulted only where the
 * primary corpus is silent, so an unprimed cache means "no gap teaching yet",
 * never wrong teaching. Empty beats invented (CLAUDE.md). Coverage self-heals
 * within a second or two of the first coach lookup.
 */
import type { TeachingsBundle } from './secondaryCorpus';
import { loadSpokenBake } from './spokenNoteBake';

/** Farmed corpora in canonical registry order. `bytes` is the approximate
 *  on-disk size, used ONLY to order the lazy prewarm (small first, Saint Louis
 *  last). The registry order below is what `getFarmedCorporaSync` returns, so
 *  the round-robin tie-break in `supportNotesAcross` is unchanged. Served
 *  same-origin: Vite copies `public/` to the build root verbatim, and Capacitor
 *  bundles that same `dist/` into the native app. */
const FARMED: Array<{ key: string; url: string; bytes: number }> = [
  { key: 'hangingpawns', url: '/data/hangingpawns-teachings.json', bytes: 9_100_000 },
  { key: 'saintlouis', url: '/data/saintlouis-teachings.json', bytes: 28_300_000 },
  { key: 'gothamchess', url: '/data/gothamchess-teachings.json', bytes: 1_160_000 },
  { key: 'hikaru', url: '/data/hikaru-teachings.json', bytes: 850_000 },
  { key: 'imrosen', url: '/data/imrosen-teachings.json', bytes: 620_000 },
  { key: 'magnuscarlsen', url: '/data/magnuscarlsen-teachings.json', bytes: 60_000 },
  // Voiced DNA corpus — position-keyed board-true notes; feeds free-play/review/tactics.
  { key: 'voiced', url: '/data/voiced-teachings.json', bytes: 400_000 },
];

const EMPTY: TeachingsBundle = { generatedAt: '', videosDistilled: 0, noteCount: 0, notes: [] };

/** key → loaded bundle. Absence = not loaded yet. */
const cache = new Map<string, TeachingsBundle>();
/** key → in-flight fetch, so concurrent callers share one request per corpus. */
const inflight = new Map<string, Promise<void>>();
/** Guards the sequential prewarm so many hot lookups can call it for free. */
let primeStarted = false;
/** Bumped on every cache reset. An in-flight load or prewarm captures the
 *  generation it started under and drops itself if the cache was reset since —
 *  so `__setFarmedCorporaCache` is authoritative and a stale fetch can never
 *  repopulate a cleared cache (which otherwise leaks state across tests). */
let generation = 0;

/** Fires as each corpus finishes loading — the index-warming hook subscribes
 *  here so a corpus's transposition index builds as soon as its data lands,
 *  wherever the prime was triggered. */
type LoadListener = (key: string, data: TeachingsBundle) => void;
const listeners = new Set<LoadListener>();

/** Subscribe to corpus-loaded events. Returns an unsubscribe. */
export function onFarmedCorpusLoaded(fn: LoadListener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

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

/** Load one corpus into the cache, deduped by key. Never rejects — a failed
 *  corpus caches as empty and the tier stays quiet for it. */
function beginLoad(key: string, url: string): Promise<void> {
  if (cache.has(key)) return Promise.resolve();
  const existing = inflight.get(key);
  if (existing) return existing;
  const gen = generation;
  const p: Promise<void> = fetchOne(url)
    .then((data) => {
      // Drop if the cache was reset since this load started (the test seam, or a
      // superseded in-flight) — never clobber a newer state with a stale result.
      if (gen !== generation || inflight.get(key) !== p) return;
      cache.set(key, data);
      for (const l of listeners) {
        try { l(key, data); } catch { /* a listener never blocks or fails a load */ }
      }
    })
    .finally(() => { if (inflight.get(key) === p) inflight.delete(key); });
  inflight.set(key, p);
  return p;
}

/** Kick off the lazy prewarm: load every farmed corpus SEQUENTIALLY, smallest
 *  first with Saint Louis (28 MB) LAST, so there is never a simultaneous
 *  multi-file fetch or a back-to-back multi-MB parse burst. Idempotent and
 *  cheap after the first call — safe to invoke from hot lookup paths. Runs
 *  entirely off the critical path; callers read synchronously and get whatever
 *  has landed so far. */
export function primeFarmedCorporaLazily(): void {
  if (primeStarted) return;
  primeStarted = true;
  const gen = generation;
  const order = [...FARMED].sort((a, b) => a.bytes - b.bytes);
  void (async () => {
    for (const { key, url } of order) {
      if (gen !== generation) return; // cache was reset — abandon this prewarm
      // One at a time: await this corpus's fetch+parse before starting the next
      // so the main thread never parses two multi-MB files in the same tick.
      try { await beginLoad(key, url); } catch { /* one corpus failing never stops the rest */ }
    }
  })();
}

/**
 * Fetch + cache EVERY farmed corpus and resolve once all are in hand. This is
 * the explicit full-warm path — used by tests and any caller that needs the
 * whole tier deterministically. Production surfaces should prefer
 * `primeFarmedCorporaLazily`, which never blocks and never spikes. Idempotent;
 * concurrent callers share the per-corpus in-flight promises. Never rejects.
 */
export async function loadFarmedCorpora(): Promise<Array<{ key: string; data: TeachingsBundle }>> {
  primeStarted = true; // a full load subsumes the lazy prewarm
  await Promise.all(FARMED.map(({ key, url }) => beginLoad(key, url)));
  return getFarmedCorporaSync();
}

/** Synchronous, PURE read. Returns the corpora loaded so far (in canonical
 *  registry order), `[]` until any have landed. Triggers nothing — call
 *  `primeFarmedCorporaLazily()` to start loading. */
export function getFarmedCorporaSync(): Array<{ key: string; data: TeachingsBundle }> {
  const out: Array<{ key: string; data: TeachingsBundle }> = [];
  for (const { key } of FARMED) {
    const data = cache.get(key);
    if (data) out.push({ key, data });
  }
  return out;
}

/** Prime the whole teaching tier (farmed corpora + the spoken bake) lazily and
 *  off the critical path. The single trigger a teaching surface calls when it
 *  first needs corpus teaching. */
export function primeTeachingCorpora(): void {
  primeFarmedCorporaLazily();
  void loadSpokenBake();
}

/** Test seam — prime (or clear) the cache without fetching. */
export function __setFarmedCorporaCache(
  data: Array<{ key: string; data: TeachingsBundle }> | undefined,
): void {
  generation += 1; // invalidate any in-flight load/prewarm from before this reset
  cache.clear();
  inflight.clear();
  primeStarted = false;
  if (data) for (const { key, data: d } of data) cache.set(key, d);
}
