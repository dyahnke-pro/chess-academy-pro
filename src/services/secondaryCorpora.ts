// secondaryCorpora — the registry of every non-primary teaching corpus.
//
// Adding a farmed creator is a two-line change here plus its corpus JSON:
// the lookup logic lives once in `secondaryCorpus.ts`. Order matters only as a
// tie-break — the gap chain prefers a LINE-ANCHORED note from any corpus over
// an opening-name match from any corpus.
//
// Doctrine (CLAUDE.md): the house narration VOICE is Naroditsky-register
// everywhere; these corpora supply IDEAS ONLY, and only where the primary is
// silent. Each keeps its own file and its own note-id prefix.
import chessbrahData from '../data/chessbrah-teachings.json';
import hangingpawnsData from '../data/hangingpawns-teachings.json';
import saintlouisData from '../data/saintlouis-teachings.json';
import { createSecondaryCorpus, gapNotesAcross, type SecondaryCorpus, type TeachingsBundle } from './secondaryCorpus';
import type { DanyaNote } from './danyaTeachingService';

export const SECONDARY_CORPORA: SecondaryCorpus[] = [
  createSecondaryCorpus('chessbrah', chessbrahData as unknown as TeachingsBundle),
  createSecondaryCorpus('hangingpawns', hangingpawnsData as unknown as TeachingsBundle),
  createSecondaryCorpus('saintlouis', saintlouisData as unknown as TeachingsBundle),
];

/** THE gap-filling entry point: teaching for an opening the primary corpus does
 *  not cover. Callers pass how many notes the primary already supplied. */
export function secondaryNotesForGap(args: {
  historySans?: string[];
  openingName?: string | null;
  primaryHits: number;
  maxNotes?: number;
}): DanyaNote[] {
  return gapNotesAcross(SECONDARY_CORPORA, args);
}

/** Secondary notes keyed EXACTLY at this line, across every corpus. */
export function secondaryNotesForPosition(historySans: string[]): DanyaNote[] {
  return SECONDARY_CORPORA.flatMap((c) => c.notesForPosition(historySans));
}

/** Per-corpus stats for audits / the settings debug panel. */
export function secondaryCorpusStats(): Array<{ key: string; notes: number; positioned: number; videos: number }> {
  return SECONDARY_CORPORA.map((c) => ({ key: c.key, ...c.stats() }));
}
