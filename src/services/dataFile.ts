// dataFile — how the app reads a large `public/data/*.json` file.
//
// WEB: exactly what it always did — `fetch('/data/x.json')`, same-origin,
// held by the browser HTTP cache / the service worker.
//
// NATIVE (the iOS app): since 2026-09-26 the big data files are stripped from
// the app bundle and the OTA bundle (scripts/ci/strip-native-bundle.mjs) — 69
// MB of the 133 MB app was data a session may never read. So on native a file
// is looked for in this order:
//
//   1. the copy this phone already downloaded and kept (Dexie `dataFiles`),
//      when it is still the current version;
//   2. the copy inside the app bundle — present on every build made before the
//      strip, and for the files deliberately kept bundled. This makes the
//      rollout order-independent: the code can ship before or after the strip;
//   3. the web origin — downloaded ONCE, then kept (step 1 from then on);
//   4. a kept copy that is out of date, when the network is unavailable —
//      yesterday's notes beat silence.
//
// "Current version" comes from `/data-versions.json`, a map of path → content
// hash written at build time (vite.config.ts `data-versions`). It is read once
// per session. Without it (offline) a kept copy is trusted as-is.
//
// Every caller already treats `null` as "stay quiet" — a missing file never
// becomes wrong teaching, only silence.
// The database is imported LAZILY, and only on native: this module sits under
// corpus/bake loaders that are otherwise Dexie-free, and a static import here
// would drag the whole schema into every one of them.
import { WEB_ORIGIN, isNativeApp } from '../utils/webOrigin';

/** One kept data file. */
export interface DataFileRecord {
  /** The `/data/...` path — the key. */
  path: string;
  /** Content hash from data-versions.json at download time ('' if unknown). */
  version: string;
  /** The file's raw JSON text. Kept as TEXT, not as the parsed object: the
   *  masters DB is 131,895 positions, and structured-cloning an object that
   *  size into IndexedDB is far slower and heavier on a phone than one string. */
  text: string;
  fetchedAt: number;
}

export interface LoadDataOptions {
  /** Keep the downloaded copy on the phone (Dexie). Default true. Pass false
   *  for a file the caller already persists in its own table. */
  persist?: boolean;
}

let versionsPromise: Promise<Record<string, string> | null> | null = null;

/** The deployed path → content-hash map, fetched once per session. `null`
 *  when unreachable (offline) — callers then trust whatever they kept. */
export function remoteDataVersions(): Promise<Record<string, string> | null> {
  if (versionsPromise) return versionsPromise;
  versionsPromise = (async () => {
    try {
      const resp = await fetch(`${WEB_ORIGIN}/data-versions.json?cb=${Date.now()}`, { cache: 'no-store' });
      if (!resp.ok) return null;
      const raw = (await resp.json()) as unknown;
      return raw && typeof raw === 'object' && !Array.isArray(raw)
        ? (raw as Record<string, string>)
        : null;
    } catch {
      return null;
    }
  })();
  return versionsPromise;
}

async function fetchJson(url: string): Promise<unknown> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    // A stripped file may come back as the app shell (HTML) rather than a 404,
    // depending on the WebView's asset handler — so a parse failure is a miss.
    return (await resp.json()) as unknown;
  } catch {
    return null;
  }
}

/** Fetch and parse; returns the text too so it can be kept verbatim. */
async function fetchText(url: string): Promise<{ text: string; json: unknown } | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const text = await resp.text();
    // A stripped file may come back as the app shell (HTML) rather than a 404,
    // depending on the WebView's asset handler — so a parse failure is a miss.
    return { text, json: JSON.parse(text) as unknown };
  } catch {
    return null;
  }
}

function parseKept(record: DataFileRecord): unknown {
  try {
    return JSON.parse(record.text) as unknown;
  } catch {
    return null;
  }
}

async function readKept(path: string): Promise<DataFileRecord | undefined> {
  try {
    const { db } = await import('../db/schema');
    return await db.dataFiles.get(path);
  } catch {
    return undefined;
  }
}

async function keep(record: DataFileRecord): Promise<void> {
  try {
    const { db } = await import('../db/schema');
    await db.dataFiles.put(record);
  } catch {
    // Storage full / IndexedDB abort — the file still serves this session and
    // is downloaded again next time. Never fails the read.
  }
}

/**
 * Read a `/data/...` JSON file. Resolves to the parsed JSON, or `null` when it
 * cannot be had at all. Never rejects.
 */
export async function loadDataJson(path: string, opts: LoadDataOptions = {}): Promise<unknown> {
  if (typeof fetch !== 'function') return null;
  if (!isNativeApp()) return fetchJson(path);

  const persist = opts.persist ?? true;
  const [kept, versions] = await Promise.all([
    persist ? readKept(path) : Promise.resolve(undefined),
    remoteDataVersions(),
  ]);
  const current = versions?.[path];

  // 1. Kept and current (or we cannot tell, because we are offline).
  if (kept && (!current || kept.version === current)) {
    const data = parseKept(kept);
    if (data !== null) return data;
  }

  // 2. Still inside the app bundle.
  const bundled = await fetchJson(path);
  if (bundled !== null) return bundled;

  // 3. Download once from the web origin, then keep it.
  const remote = await fetchText(`${WEB_ORIGIN}${path}${current ? `?v=${current}` : ''}`);
  if (remote !== null) {
    if (persist) void keep({ path, version: current ?? '', text: remote.text, fetchedAt: Date.now() });
    return remote.json;
  }

  // 4. Offline with an out-of-date copy — better than nothing.
  return kept ? parseKept(kept) : null;
}

/** Test seam — forget the per-session version map. */
export function __resetDataVersions(): void {
  versionsPromise = null;
}
