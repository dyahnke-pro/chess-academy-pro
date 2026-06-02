/**
 * proGameReferenceData — lazy loader for the coach's breadth layer of
 * real pro games. The reference set lives at
 * `public/data/pro-game-references.json` (built by
 * `scripts/pro-repertoire/build-game-references.mjs`) and is fetched on
 * demand rather than static-imported, so its ~2 MB (and growing, as more
 * pros are onboarded) stays OUT of the JS bundle — mirrors the
 * masters-DB pattern in `masterPlayLookup.ts`. Vite copies `public/` to
 * the build root verbatim, so the file is served same-origin and held by
 * the browser HTTP cache across reloads.
 *
 * Two access shapes:
 *  - `loadProGameReferenceData()` — async, fetches + caches once. Call
 *    it on boot (dataLoader) and before any envelope assembly that needs
 *    the games (coachService).
 *  - `getProGameReferenceDataSync()` — synchronous, returns the cached
 *    array (or `[]` if the load hasn't completed yet). Used by the
 *    envelope source `playerGames.ts`, which runs synchronously; the
 *    caller awaits `loadProGameReferenceData()` first so the cache is
 *    primed.
 */
import type { ProGameReference } from '../types';

/** Public-path of the static reference asset. Served by the same origin
 *  as the SPA (Vite copies `public/` to the build root). */
const REF_URL = '/data/pro-game-references.json';

/** `undefined` = not loaded yet; an array = loaded (possibly empty on a
 *  fetch/parse failure, which we treat as "no references"). */
let cache: ProGameReference[] | undefined;
let inflight: Promise<ProGameReference[]> | null = null;

/** Fetch + cache the reference set once. Idempotent — concurrent callers
 *  share the inflight promise; subsequent callers get the cache. On any
 *  failure (missing file / network / parse / non-browser env) resolves to
 *  an empty array so the coach simply runs without the breadth layer. */
export async function loadProGameReferenceData(): Promise<ProGameReference[]> {
  if (cache !== undefined) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      // SSR / non-browser test env without a real fetch — no references.
      if (typeof fetch !== 'function') {
        cache = [];
        return cache;
      }
      const resp = await fetch(REF_URL);
      if (!resp.ok) {
        cache = [];
        return cache;
      }
      const raw = (await resp.json()) as unknown;
      cache = Array.isArray(raw) ? (raw as ProGameReference[]) : [];
      return cache;
    } catch {
      cache = [];
      return cache;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Synchronous read of the cached references. Returns `[]` until
 *  `loadProGameReferenceData()` has resolved. Callers that need the data
 *  guaranteed must await the loader first. */
export function getProGameReferenceDataSync(): ProGameReference[] {
  return cache ?? [];
}

/** Test seam — prime (or clear) the cache without fetching. Production
 *  code never calls this; tests use it to inject the real shipped JSON. */
export function __setProGameReferenceCache(data: ProGameReference[] | undefined): void {
  cache = data;
  inflight = null;
}
