// secondaryCorpora — the registry of every non-primary teaching corpus.
//
// Adding a farmed creator is a one-line change in `farmedCorpusData` plus its
// corpus JSON in `public/data/`: the lookup logic lives once in
// `secondaryCorpus.ts`. Order matters only as a tie-break — the gap chain
// prefers a LINE-ANCHORED note from any corpus over an opening-name match from
// any corpus.
//
// Doctrine (CLAUDE.md): the house narration VOICE is Naroditsky-register
// everywhere; these corpora supply IDEAS ONLY, and only where the primary is
// silent. Each keeps its own file and its own note-id prefix.
//
// TWO LOAD SHAPES, one registry (2026-08-01). chessbrah is small and stays a
// static import. The FARMED corpora scale with a creator's back-catalogue, not
// with the app, so they are fetched from `public/` — see `farmedCorpusData` for
// why (Hanging Pawns alone would have sat 250 KB under the precache cap, and
// Saint Louis could never have fitted). The public API below stays SYNCHRONOUS
// either way; farmed corpora simply contribute nothing until the boot prewarm
// resolves, which is safe because this is the gap tier: an unprimed cache means
// "no gap teaching yet", never wrong teaching.
import chessbrahData from '../data/chessbrah-teachings.json';
import { getFarmedCorporaSync } from './farmedCorpusData';
import { createSecondaryCorpus, gapNotesAcross, supportNotesAcross, type SecondaryCorpus, type TeachingsBundle } from './secondaryCorpus';
import type { DanyaNote } from './danyaTeachingService';

const STATIC_CORPORA: SecondaryCorpus[] = [
  createSecondaryCorpus('chessbrah', chessbrahData as unknown as TeachingsBundle),
];

// Indexing a farmed corpus is O(notes) and these run tens of thousands of notes,
// so build each one ONCE and keep it — keyed by the bundle identity so a test
// that swaps the cache rebuilds instead of serving a stale index.
const builtFarmed = new Map<string, { source: TeachingsBundle; corpus: SecondaryCorpus }>();

function farmedCorpora(): SecondaryCorpus[] {
  const out: SecondaryCorpus[] = [];
  for (const { key, data } of getFarmedCorporaSync()) {
    const cached = builtFarmed.get(key);
    if (cached && cached.source === data) {
      out.push(cached.corpus);
      continue;
    }
    const corpus = createSecondaryCorpus(key, data);
    builtFarmed.set(key, { source: data, corpus });
    out.push(corpus);
  }
  return out;
}

/** Every corpus currently available — static ones always, farmed ones once the
 *  boot prewarm (`loadFarmedCorpora`) has resolved. */
export function secondaryCorpora(): SecondaryCorpus[] {
  return [...STATIC_CORPORA, ...farmedCorpora()];
}

/** THE gap-filling entry point: teaching for an opening the primary corpus does
 *  not cover. Callers pass how many notes the primary already supplied. */
export function secondaryNotesForGap(args: {
  historySans?: string[];
  openingName?: string | null;
  primaryHits: number;
  maxNotes?: number;
}): DanyaNote[] {
  return gapNotesAcross(secondaryCorpora(), args);
}

/** SUPPORT tier: secondary notes for this line/opening REGARDLESS of whether the
 *  primary corpus covers the opening. Callers fill from the primary corpus
 *  first and pass only the slots left over, so this supplements the house voice
 *  and never displaces it. See `supportNotesAcross` for why the gap tier's
 *  opening-level gate was too coarse. */
export function secondarySupportNotes(args: {
  historySans?: string[];
  openingName?: string | null;
  maxNotes?: number;
  exclude?: ReadonlySet<string>;
  accept?: (note: DanyaNote) => boolean;
}): DanyaNote[] {
  return supportNotesAcross(secondaryCorpora(), args);
}

/** Secondary notes keyed EXACTLY at this line, across every corpus. */
export function secondaryNotesForPosition(historySans: string[]): DanyaNote[] {
  return secondaryCorpora().flatMap((c) => c.notesForPosition(historySans));
}

/** Secondary notes whose taught line PRODUCES this position, across every
 *  corpus — transposition-safe, so a note authored through one move order is
 *  found by a lesson that reached the same board through another.
 *
 *  This is the deterministic way to widen what the coach can say about a ply:
 *  the note IS about this board, proven by chess.js. It replaced the fuzzy
 *  opening-name arm that used to fill those plies with teaching authored
 *  somewhere else (2026-08-04). */
export function secondaryNotesForFen(fen: string): DanyaNote[] {
  return secondaryCorpora().flatMap((c) => c.notesForFen(fen));
}

/** Build every secondary corpus's transposition index. Call from the boot
 *  prewarm: replaying ~5,400 note lines is seconds of chess.js, which belongs
 *  off the critical path rather than on whichever lookup happens to be first. */
export async function warmSecondaryPositionIndex(): Promise<void> {
  for (const c of secondaryCorpora()) await c.warmFenIndex();
}

/** Per-corpus stats for audits / the settings debug panel. */
export function secondaryCorpusStats(): Array<{ key: string; notes: number; positioned: number; videos: number }> {
  return secondaryCorpora().map((c) => ({ key: c.key, ...c.stats() }));
}
