// spokenNoteBake — the BAKED spoken form of every corpus note.
//
// David 2026-08-07: "I'm willing to pay the price this time if it means never
// using it again for the coach tab." The rewrite happens once, offline
// (`scripts/bake-spoken-notes.mjs`), is gated before it is committed, and at
// runtime is this Map lookup. No model on the critical path, ever.
//
// TWO KINDS, and the difference is the whole point:
//
//   anchored — the note has a move prefix, so the coach speaks it only ON that
//              position and its squares are true. Baked for spoken register.
//   floating — reached by concept or tactic tag, so it is spoken over a board
//              it was never written about. Its ORIGINAL text names a foreign
//              example's squares ("bishop d2 attacks the queen … rook to b1
//              skewers"), every one of which is a false claim on the live
//              board. The bake generalizes the geometry away entirely; that is
//              what makes this tier speakable at all.
//
// A note with `unspeakable` could not be taught without its geometry and is
// deliberately never spoken — honest silence over a confident lie.
//
// Served same-origin from `public/`, like the farmed corpora, because it is too
// large to bundle. Until the fetch resolves the lookup returns undefined and
// callers fall back to the original prose, which is the pre-bake behaviour.

export interface BakedNote {
  /** The spoken rewrite. Absent when the note is deliberately unspeakable. */
  spoken?: string;
  kind?: 'anchored' | 'floating';
  /** Why this note is never spoken (e.g. 'needs-geometry'). */
  unspeakable?: string;
}

const URL = '/data/corpus-spoken.json';

/** `undefined` = not loaded yet; an empty Map = loaded and empty. */
let cache: Map<string, BakedNote> | undefined;
let inflight: Promise<Map<string, BakedNote>> | null = null;

const toMap = (raw: unknown): Map<string, BakedNote> => {
  const out = new Map<string, BakedNote>();
  if (!raw || typeof raw !== 'object') return out;
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v && typeof v === 'object') out.set(id, v as BakedNote);
  }
  return out;
};

/** Fetch + cache the bake once. Idempotent; concurrent callers share the
 *  inflight promise. Never rejects — a missing bake just means the corpus
 *  speaks in its original prose. */
export async function loadSpokenBake(): Promise<Map<string, BakedNote>> {
  if (cache !== undefined) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      if (typeof fetch !== 'function') { cache = new Map(); return cache; }
      const resp = await fetch(URL);
      cache = resp.ok ? toMap(await resp.json()) : new Map();
      return cache;
    } catch {
      cache = new Map();
      return cache;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Synchronous lookup. `undefined` until the bake has loaded, or when the note
 *  was never baked — both mean "use the original prose". */
export function bakedSpoken(id: string): BakedNote | undefined {
  return cache?.get(id);
}

/** How much of the corpus is baked; for audits and the settings debug panel. */
export function spokenBakeStats(): { loaded: boolean; baked: number; unspeakable: number } {
  if (!cache) return { loaded: false, baked: 0, unspeakable: 0 };
  let baked = 0;
  let unspeakable = 0;
  for (const v of cache.values()) {
    if (v.spoken) baked += 1;
    else if (v.unspeakable) unspeakable += 1;
  }
  return { loaded: true, baked, unspeakable };
}

/** Test seam — prime (or clear) the cache without fetching. */
export function __setSpokenBakeCache(data: Map<string, BakedNote> | undefined): void {
  cache = data;
  inflight = null;
}
