import type { OpeningAnnotations } from '../../types';
import { loadDataJson } from '../../services/dataFile';
import keys from '../annotationKeys.json';

/**
 * The legacy auto-generated opening annotations — one JSON file per opening
 * in this directory, used only by the non-curated fallback walkthrough.
 *
 * FETCHED PER OPENING, NOT COMPILED IN (David 2026-09-26, app-size plan).
 * This used to be `import.meta.glob('./*.json')`, which turned every file into
 * its own JS chunk: 1,889 chunks, 17 MB of the iOS app, for a fallback most
 * sessions never open. The files are now copied to `/data/annotations/` at
 * build time (vite.config.ts `data-files`) and read through `dataFile.ts` —
 * same-origin on the web; on the iOS app downloaded the first time an opening
 * needs them, then kept.
 *
 * `ANNOTATION_KEYS` is the set of files that exist, so the resolver in
 * annotationService can pick an id synchronously. Regenerate it with
 * `node scripts/build-annotation-keys.mjs`; annotationKeys.test.ts fails when
 * it drifts from this directory.
 */
export const ANNOTATION_KEYS: ReadonlySet<string> = new Set(keys);

type AnnotationReader = (key: string) => Promise<unknown>;

/** Vitest has no server, so src/test/setup.ts installs a disk reader on this
 *  global. Nothing in the app ever sets it. */
interface DiskReaderHost { __readAnnotationFromDisk?: AnnotationReader }

const fetchReader: AnnotationReader = (key) => {
  const disk = (globalThis as DiskReaderHost).__readAnnotationFromDisk;
  return disk ? disk(key) : loadDataJson(`/data/annotations/${key}.json`);
};
let reader: AnnotationReader = fetchReader;

/** Load one opening's annotations, or null when absent / unreachable. */
export async function loadAnnotationFile(key: string): Promise<OpeningAnnotations | null> {
  if (!ANNOTATION_KEYS.has(key)) return null;
  const raw = await reader(key);
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as OpeningAnnotations) : null;
}

/** Test seam — the vitest setup points this at the files on disk, since there
 *  is no server in node. Production code never calls it. */
export function __setAnnotationReader(next: AnnotationReader | null): void {
  reader = next ?? fetchReader;
}
