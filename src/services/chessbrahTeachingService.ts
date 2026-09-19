// chessbrahTeachingService — the SECONDARY teaching corpus, covering openings
// the Naroditsky corpus is silent on.
//
// Why a second corpus file and not more notes in the first one: the house
// narration VOICE is Naroditsky-register everywhere (CLAUDE.md doctrine), and
// mixing another creator's notes into `danya-teachings.json` would quietly make
// that corpus a blend. This one supplies IDEAS ONLY, and only where the primary
// has nothing — see `secondaryNotesForGap` and its single consumer, the teaching
// block builder in danyaTeachingService.
//
// Built offline by scripts/danya-corpus/ with `--creator chessbrah` from Aman
// Hambleton's instructional series. Same guarantees as the primary: original
// prose (7-gram overlap gate against the transcript), code-stamped opening tags,
// every note source-tagged `yt:<videoId>`. Raw transcripts never ship.
//
// G0: notes are curated grounding CONTEXT. Code selects which ones match; the
// model phrases teaching from them and decides nothing.

import { getFarmedCorporaSync } from './farmedCorpusData';
import { createSecondaryCorpus, gapNotesAcross, type SecondaryCorpus, type TeachingsBundle } from './secondaryCorpus';
import type { DanyaNote } from './danyaTeachingService';

// The lookup engine moved to `secondaryCorpus.ts` when two more creators were
// farmed (2026-07-31) — three verbatim copies of it would have drifted. This
// file is now the chessbrah BINDING; the gap chain across all corpora lives in
// `secondaryCorpora.ts`, which is what danyaTeachingService consumes.
//
// 🔒 FETCHED, not imported (2026-09-19). The corpus JSON used to be a static
// import here AND in `secondaryCorpora`, so 1.81 MB rode the boot payload
// twice over — and all 2,766 of its notes are floating, so not one of those
// bytes could answer a position query. It now reads the same lazily-fetched
// cache as every other secondary corpus, which means this module has NO data
// of its own until that lands. Every export below degrades to empty until it
// does; that is the gap tier's normal contract ("no gap teaching yet", never
// wrong teaching).
const EMPTY_BUNDLE: TeachingsBundle = { generatedAt: '', videosDistilled: 0, noteCount: 0, notes: [] };
let built: { source: TeachingsBundle; corpus: SecondaryCorpus } | null = null;

function corpus(): SecondaryCorpus {
  const data = getFarmedCorporaSync().find((c) => c.key === 'chessbrah')?.data ?? EMPTY_BUNDLE;
  // Indexing is O(notes); rebuild only when the underlying bundle identity
  // changes (a load landing, or a test swapping the cache).
  if (!built || built.source !== data) built = { source: data, corpus: createSecondaryCorpus('chessbrah', data) };
  return built.corpus;
}

export const notesForOpening = (...args: Parameters<SecondaryCorpus['notesForOpening']>) =>
  corpus().notesForOpening(...args);
export const notesForPrefix = (...args: Parameters<SecondaryCorpus['notesForPrefix']>) =>
  corpus().notesForPrefix(...args);

/** Secondary notes keyed EXACTLY at this line — chessbrah only. */
export function secondaryNotesForPosition(historySans: string[]): DanyaNote[] {
  return corpus().notesForPosition(historySans);
}

/** Gap notes from the chessbrah corpus alone. */
export function secondaryNotesForGap(args: {
  historySans?: string[];
  openingName?: string | null;
  primaryHits: number;
  maxNotes?: number;
}): DanyaNote[] {
  return gapNotesAcross([corpus()], args);
}

/** Corpus stats for audits / the settings debug panel. */
export function chessbrahCorpusStats(): { notes: number; positioned: number; videos: number } {
  return corpus().stats();
}
