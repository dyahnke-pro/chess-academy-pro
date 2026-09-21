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
// ONE LOAD SHAPE (2026-09-19). Every secondary corpus is FETCHED from
// `public/` — see `farmedCorpusData`. The public API below stays SYNCHRONOUS;
// a corpus simply contributes nothing until its lazy load resolves, which is
// safe because this is the gap tier: an unprimed cache means "no gap teaching
// yet", never wrong teaching.
//
// 🔴 The note that stood here — "chessbrah is small and stays a static import"
// — is DELETED rather than annotated (the Lake Butler rule), because it stopped
// being true and nobody noticed. chessbrah was 1.81 MB in the JS bundle, and
// `dist/index.html` modulepreloads every `appdata-*` chunk, so "static" meant
// every user downloaded it before seeing a square. Measured the same day: all
// 2,766 of its notes are FLOATING (zero positioned), so none of that payload
// could ever answer a position query. It now loads like its six siblings.
import { getFarmedCorporaSync, isFloatingHalf, onFarmedCorpusLoaded, primeFarmedCorporaLazily } from './farmedCorpusData';
import { createSecondaryCorpus, gapNotesAcross, supportNotesAcross, type SecondaryCorpus, type TeachingsBundle } from './secondaryCorpus';
import type { DanyaNote } from './danyaTeachingService';

// Indexing a farmed corpus is O(notes) and these run tens of thousands of notes,
// so build each one ONCE and keep it — keyed by the bundle identity so a test
// that swaps the cache rebuilds instead of serving a stale index.
const builtFarmed = new Map<string, { source: TeachingsBundle; corpus: SecondaryCorpus }>();

function farmedCorpora(): SecondaryCorpus[] {
  const out: SecondaryCorpus[] = [];
  for (const { key, data } of getFarmedCorporaSync()) {
    // The PRIMARY corpus's floating half rides the same prewarm but is not a
    // secondary corpus — `danyaTeachingService` merges it into its own index.
    // Letting it in here would double-count every note and hand the gap tier
    // the primary's own teaching as a "gap".
    if (isFloatingHalf(key)) continue;
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
 *  lazy prewarm (`primeFarmedCorporaLazily`) has landed them. Pure: reads
 *  whatever is loaded, triggers no fetch (priming is done by the lookup
 *  entry points below, so a stats/debug read never kicks a 28 MB download). */
export function secondaryCorpora(): SecondaryCorpus[] {
  return farmedCorpora();
}

// Warm each farmed corpus's transposition index AS IT LANDS. `warmFenIndex` is
// chunked + cursor-guarded (idempotent), so re-warming the whole set on every
// corpus-loaded event is safe and keeps the position tier current without a
// boot prewarm. Off the critical path — a lookup that beats it gets whatever is
// indexed so far, which for the gap tier is honest silence, never wrong.
onFarmedCorpusLoaded(() => {
  void warmSecondaryPositionIndex().catch(() => { /* the corpus is a bonus, never a blocker */ });
});

/**
 * 🔒 DORMANT SINCE 2026-09-21 — KEPT ON PURPOSE, DO NOT FEED IT (David's call:
 * "dormant").
 *
 * Both tiers below match by opening NAME. That only ever worked because seven
 * farmed creators carried opening tags on 16,298 notes; those creators were
 * removed when David set the corpus to ONE source ("there are only one source
 * of corpus notes. and its the danya ones that we have tied exactly to
 * positions. nothing else!"). The one registered non-primary corpus now is
 * VOICED, whose notes carry `opening: null` by design — they are selected by
 * exact position — so neither tier can match anything and both return [].
 *
 * 🚨 THE FAILURE MODE THIS COMMENT EXISTS TO STOP: a future session reads a
 * coverage number, finds these functions returning nothing, and "fixes" it by
 * registering another creator in `corpora.json`. That is not a fix — it
 * re-opens name-based selection, which is the 2026-08-04 determinism lock's
 * whole subject: teaching authored at one position, handed to the model to
 * phrase as if it described another. Coverage grows by FARMING AND VOICING more
 * position-keyed notes, never by loosening selection.
 *
 * They return honest empties rather than being deleted so the shape survives
 * for the day a second position-keyed corpus exists.
 */
/** THE gap-filling entry point: teaching for an opening the primary corpus does
 *  not cover. Callers pass how many notes the primary already supplied.
 *  DORMANT — see above. */
export function secondaryNotesForGap(args: {
  historySans?: string[];
  openingName?: string | null;
  primaryHits: number;
  maxNotes?: number;
}): DanyaNote[] {
  primeFarmedCorporaLazily();
  return gapNotesAcross(secondaryCorpora(), args);
}

/** SUPPORT tier: secondary notes for this line/opening REGARDLESS of whether the
 *  primary corpus covers the opening. Callers fill from the primary corpus
 *  first and pass only the slots left over, so this supplements the house voice
 *  and never displaces it. See `supportNotesAcross` for why the gap tier's
 *  opening-level gate was too coarse.
 *  DORMANT — see the block above `secondaryNotesForGap`. */
export function secondarySupportNotes(args: {
  historySans?: string[];
  openingName?: string | null;
  maxNotes?: number;
  exclude?: ReadonlySet<string>;
  accept?: (note: DanyaNote) => boolean;
}): DanyaNote[] {
  primeFarmedCorporaLazily();
  return supportNotesAcross(secondaryCorpora(), args);
}

/** Secondary notes keyed EXACTLY at this line, across every corpus. */
export function secondaryNotesForPosition(historySans: string[]): DanyaNote[] {
  primeFarmedCorporaLazily();
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
  primeFarmedCorporaLazily();
  return secondaryCorpora().flatMap((c) => c.notesForFen(fen));
}

/** Build every secondary corpus's transposition index. Call from the boot
 *  prewarm: replaying ~5,400 note lines is seconds of chess.js, which belongs
 *  off the critical path rather than on whichever lookup happens to be first. */
export async function warmSecondaryPositionIndex(): Promise<void> {
  for (const c of secondaryCorpora()) await c.warmFenIndex();
}

/** The same build in one synchronous pass — for node and tests, where the stall
 *  is free and a half-built index would make assertions depend on timing. */
export function warmSecondaryPositionIndexSync(): void {
  for (const c of secondaryCorpora()) c.warmFenIndexSync();
}

/** Per-corpus stats for audits / the settings debug panel. */
export function secondaryCorpusStats(): Array<{ key: string; notes: number; positioned: number; videos: number }> {
  return secondaryCorpora().map((c) => ({ key: c.key, ...c.stats() }));
}
