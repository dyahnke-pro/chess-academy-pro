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

import teachingsData from '../data/chessbrah-teachings.json';
import { createSecondaryCorpus, gapNotesAcross, type TeachingsBundle } from './secondaryCorpus';
import type { DanyaNote } from './danyaTeachingService';

// The lookup engine moved to `secondaryCorpus.ts` when two more creators were
// farmed (2026-07-31) — three verbatim copies of it would have drifted. This
// file is now the chessbrah BINDING; the gap chain across all corpora lives in
// `secondaryCorpora.ts`, which is what danyaTeachingService consumes.
const CORPUS = createSecondaryCorpus('chessbrah', teachingsData as unknown as TeachingsBundle);

export const notesForOpening = CORPUS.notesForOpening;
export const notesForPrefix = CORPUS.notesForPrefix;

/** Secondary notes keyed EXACTLY at this line — chessbrah only. */
export function secondaryNotesForPosition(historySans: string[]): DanyaNote[] {
  return CORPUS.notesForPosition(historySans);
}

/** Gap notes from the chessbrah corpus alone. */
export function secondaryNotesForGap(args: {
  historySans?: string[];
  openingName?: string | null;
  primaryHits: number;
  maxNotes?: number;
}): DanyaNote[] {
  return gapNotesAcross([CORPUS], args);
}

/** Corpus stats for audits / the settings debug panel. */
export function chessbrahCorpusStats(): { notes: number; positioned: number; videos: number } {
  return CORPUS.stats();
}
