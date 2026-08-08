// secondaryCorpus — the shared lookup engine for every NON-primary teaching
// corpus (chessbrah, hangingpawns, saintlouis, …).
//
// Why this exists: each secondary corpus needs the identical 140 lines of
// fuzzy-name / prefix lookup, and the first one (chessbrah) had them written
// out longhand. Farming two more creators (David 2026-07-31, "Farm") would
// have meant three near-identical copies drifting apart — so the lookup lives
// here once and a corpus becomes a binding, not a file of logic.
//
// The doctrine is unchanged (CLAUDE.md): the house narration VOICE stays
// Naroditsky-register everywhere, so these corpora supply IDEAS ONLY, and only
// where the primary corpus is silent. Each keeps its own file and its own note
// id prefix — the coach dedupes notes by id, so a shared prefix would silently
// drop one corpus's note.
//
// G0: notes are curated grounding CONTEXT. Code selects which ones match; the
// model phrases teaching from them and decides nothing.
import { Chess } from 'chess.js';
import type { DanyaNote } from './danyaTeachingService';
import { applyDerivedAnchors } from './noteAnchorOverrides';

export interface TeachingsBundle {
  generatedAt: string;
  videosDistilled: number;
  noteCount: number;
  notes: DanyaNote[];
}

export interface SecondaryCorpus {
  key: string;
  notesForOpening: (openingName: string, maxNotes?: number) => DanyaNote[];
  notesForPrefix: (historySans: string[], maxNotes?: number) => DanyaNote[];
  notesForPosition: (historySans: string[]) => DanyaNote[];
  /** Notes whose taught line PRODUCES this position, whatever move order
   *  reached it. The transposition tier — see `ensureFenIndex` below. */
  notesForFen: (fen: string) => DanyaNote[];
  /** Build the transposition index in CHUNKS, yielding between them. Called
   *  from the boot prewarm: replaying every positioned note's line is ~1ms of
   *  chess.js each, so doing it in one go would hold the main thread for
   *  seconds — the same jank the seed already chunks around. */
  warmFenIndex: () => Promise<void>;
  /** Build it in ONE synchronous pass. For node/tests, where a 5s stall costs
   *  nothing and determinism is worth more. NEVER call this on a UI thread. */
  warmFenIndexSync: () => void;
  stats: () => { notes: number; positioned: number; videos: number };
}

/** Placement + side + castling + en-passant. The move counters are
 *  path-dependent, so two games at the same position disagree on them —
 *  including them would defeat the whole point. Mirrors
 *  `danyaTeachingService.normFen`. */
const normFen = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');

const SPELLING_VARIANTS: Array<[RegExp, string]> = [
  [/\bdefence\b/g, 'defense'],
  [/\bcentre\b/g, 'center'],
  [/\bmanoeuvre\b/g, 'maneuver'],
];

// Mirrors danyaTeachingService.normName — the app writes British spellings and
// diacritics, corpus tags are American ASCII from the Lichess DB.
const normName = (s: string): string => {
  let out = s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  for (const [re, to] of SPELLING_VARIANTS) out = out.replace(re, to);
  return out;
};

const GENERIC_TOKENS = new Set([
  'opening', 'defense', 'game', 'attack', 'variation', 'system', 'gambit',
  'line', 'setup', 'declined', 'accepted', 'main', 'modern', 'classical',
]);

/** Build the lookup surface for one secondary corpus. Indexes are built once
 *  at module init (these files are static imports). */
export function createSecondaryCorpus(key: string, bundle: TeachingsBundle): SecondaryCorpus {
  // Derived anchors first, so EVERY index below (prefix, fen, opening, stats)
  // is built from the corrected line. Applying it downstream of an index would
  // leave that index keyed on the truncation — see noteAnchorOverrides.
  const data: TeachingsBundle = { ...bundle, notes: applyDerivedAnchors(bundle.notes ?? []) };
  const byOpening = new Map<string, DanyaNote[]>();
  const byPrefix = new Map<string, DanyaNote[]>();

  for (const n of data.notes) {
    if (n.opening) {
      const k = normName(n.opening);
      const bucket = byOpening.get(k) ?? [];
      bucket.push(n);
      byOpening.set(k, bucket);
    }
    if (n.lineSan.length > 0) {
      const k = n.lineSan.join(' ');
      const bucket = byPrefix.get(k) ?? [];
      bucket.push(n);
      byPrefix.set(k, bucket);
    }
  }

  // No default bound on ELIGIBILITY (David 2026-08-04: "I do not want a corpus
  // cap"). What a caller may FIND is unbounded; what it SPEAKS is budgeted at
  // the call site. The two were conflated, and it mattered: every consumer here
  // takes `[0]` or `.find(...)` after filtering, so a pool of 4 meant a note
  // rejected by the caller's own scope check had no successor to fall back to —
  // the position went silent with usable teaching sitting behind the cap.
  const notesForOpening = (openingName: string, maxNotes = Infinity): DanyaNote[] => {
    const qTokens = new Set(normName(openingName).split(' ').filter((t) => t.length > 2));
    if (qTokens.size === 0) return [];
    const scored: Array<{ n: DanyaNote; score: number }> = [];
    for (const [k, bucket] of byOpening) {
      const kTokens = k.split(' ').filter((t) => t.length > 2);
      if (kTokens.length === 0) continue;
      const sharedTokens = kTokens.filter((t) => qTokens.has(t));
      if (!sharedTokens.some((t) => !GENERIC_TOKENS.has(t))) continue;
      const score = sharedTokens.length / Math.max(1, Math.min(kTokens.length, qTokens.size));
      if (score >= 0.6) for (const n of bucket) scored.push({ n, score });
    }
    return scored
      .sort((a, b) => b.score - a.score || (b.n.lineSan.length - a.n.lineSan.length))
      .slice(0, maxNotes)
      .map((s) => s.n);
  };

  // ── TRANSPOSITION index, lazy ────────────────────────────────────────────
  // Only the PRIMARY corpus was indexed by position until 2026-08-04, so 5,412
  // position-keyed notes across the secondary corpora could be found only by an
  // exact move-order string match — a Caro-Kann note authored via 2.d4 was
  // invisible to a lesson that transposed. That scarcity is what made the fuzzy
  // opening-name arm look necessary; indexing by position is the deterministic
  // way to get the reach, and it takes position-keyed coverage from 1,356 notes
  // to 6,768.
  //
  // Built lazily and memoised: replaying every positioned note's line is ~1ms
  // each (chess.js), so the farmed corpora together are seconds of work. That is
  // fine off the critical path — `warmFenIndex` is called from the boot prewarm
  // that already fetches these files — and correct, if slow, if a lookup beats
  // it there.
  const byFen = new Map<string, DanyaNote[]>();
  // ONE cursor, so the chunked build and a synchronous lookup that races it can
  // never index the same note twice — the lookup simply finishes what the
  // prewarm started, from wherever it got to.
  let fenCursor = 0;
  const indexUpTo = (limit: number): void => {
    const end = Math.min(limit, data.notes.length);
    for (; fenCursor < end; fenCursor += 1) {
      const n = data.notes[fenCursor];
      if (n.lineSan.length === 0) continue;
      try {
        const c = new Chess();
        for (const san of n.lineSan) c.move(san);
        const k = normFen(c.fen());
        const bucket = byFen.get(k) ?? [];
        bucket.push(n);
        byFen.set(k, bucket);
      } catch { /* a note whose line won't replay simply isn't position-keyed */ }
    }
  };
  const warmFenIndexSync = (): void => { indexUpTo(data.notes.length); };
  const warmFenIndex = async (): Promise<void> => {
    while (fenCursor < data.notes.length) {
      indexUpTo(fenCursor + 500);
      // Yield so the main thread can paint and run queued taps between batches.
      await new Promise<void>((resolve) => { setTimeout(resolve, 0); });
    }
  };
  // READ-ONLY: never forces the build. A lookup that beats the prewarm gets
  // whatever is indexed so far, which for an unbuilt index is nothing.
  //
  // The alternative — finishing the index synchronously on first miss — was
  // tried and is worse: it is ~5s of chess.js across the farmed corpora, on
  // whatever thread happens to ask first, which on a phone is a frozen UI. It
  // also broke a 5s unit test outright, which is the same stall wearing a
  // different hat.
  //
  // Degrading to silence is the sanctioned trade for this whole tier (an
  // unprimed corpus cache means "no gap teaching yet", never wrong teaching) and
  // it self-heals within a second of boot. Coverage may lag the prewarm; what is
  // spoken is never wrong.
  const notesForFen = (fen: string): DanyaNote[] => byFen.get(normFen(fen)) ?? [];

  const notesForPrefix = (historySans: string[], maxNotes = Infinity): DanyaNote[] => {
    const out: DanyaNote[] = [];
    for (let len = historySans.length; len >= 1 && out.length < maxNotes; len -= 1) {
      for (const n of byPrefix.get(historySans.slice(0, len).join(' ')) ?? []) {
        if (out.length >= maxNotes) break;
        out.push(n);
      }
    }
    return out;
  };

  return {
    key,
    notesForOpening,
    notesForPrefix,
    /** Notes keyed EXACTLY at this line — the only tier allowed to feed
     *  `noteAtPosition`, whose contract is "at this position, not an
     *  ancestor". */
    notesForPosition: (historySans: string[]): DanyaNote[] =>
      byPrefix.get(historySans.join(' ')) ?? [],
    notesForFen,
    warmFenIndex,
    warmFenIndexSync,
    stats: () => ({
      notes: data.notes.length,
      positioned: data.notes.filter((n) => n.lineSan.length > 0).length,
      videos: data.videosDistilled,
    }),
  };
}

/** Chain the gap lookup across every registered secondary corpus, in order.
 *  `primaryHits > 0` means the Naroditsky corpus already covers this position,
 *  so no secondary is consulted at all — a secondary can never dilute or
 *  contradict primary teaching where it exists. */
export function gapNotesAcross(
  corpora: SecondaryCorpus[],
  args: {
    historySans?: string[];
    openingName?: string | null;
    primaryHits: number;
    maxNotes?: number;
  },
): DanyaNote[] {
  if (args.primaryHits > 0) return [];
  return supportNotesAcross(corpora, args);
}

/** The same lookup WITHOUT the primary-coverage gate — the SUPPORT tier.
 *
 *  David 2026-08-01: "I want the notes to be able to cover gaps in any
 *  masterclass or Danya openings we teach. Splice them in anywhere there is a
 *  gap or where they can be used even when either of these two have primary
 *  teachings. A third source that supports at runtime."
 *
 *  The gap tier answers "does the primary corpus know this OPENING?", which is
 *  too coarse: it knows the Caro-Kann, so a farmed note on the Advance/Tal
 *  sub-line was suppressed even at a position the primary has nothing to say
 *  about — and the caller then fell through to STRUCTURE TRANSFER, borrowing a
 *  note from a DIFFERENT opening entirely. A real note about the opening in
 *  front of the student beats a structural analogy from another one, so callers
 *  now consult this tier before transfer.
 *
 *  It never displaces primary teaching: callers fill from the primary corpus
 *  first and use this only for the slots still empty, so the house voice keeps
 *  the lead and these supply supporting IDEAS. */
export function supportNotesAcross(
  corpora: SecondaryCorpus[],
  args: {
    historySans?: string[];
    openingName?: string | null;
    maxNotes?: number;
    /** Note ids the caller has already used. Excluded here rather than by the
     *  caller after the fact, so the budget goes to notes it can actually use.
     *  Filtering downstream wastes every slot on a repeat and returns nothing. */
    exclude?: ReadonlySet<string>;
    /** The caller's own scope test (is this note on THIS line, in THIS phase,
     *  about THIS opening). Applied here for the same reason as `exclude`:
     *  a caller that filters the RESULT is really filtering after the budget
     *  has been spent, so `maxNotes` silently becomes an eligibility cap and a
     *  single off-scope note at the head of the list means silence. Inside, the
     *  budget counts only notes the caller can actually use. */
    accept?: (note: DanyaNote) => boolean;
  },
): DanyaNote[] {
  const max = args.maxNotes ?? 2;
  const out: DanyaNote[] = [];
  const seen = new Set<string>();
  const take = (notes: DanyaNote[]): void => {
    for (const n of notes) {
      if (out.length >= max) return;
      if (seen.has(n.id) || args.exclude?.has(n.id)) continue;
      if (args.accept && !args.accept(n)) continue;
      out.push(n);
      seen.add(n.id);
    }
  };
  // ROUND-ROBIN across corpora, not corpus-at-a-time. Draining the first corpus
  // before touching the second sounds harmless because "order is only a
  // tie-break" — it is not, once the budget is small. Callers ask for 1-4 slots,
  // so the FIRST-registered corpus took every slot and the others never
  // contributed at all: chessbrah (2.5 MB) shut out Hanging Pawns (10,209
  // notes) on every opening they both cover. Interleaving gives each corpus its
  // turn, so the budget is shared instead of claimed.
  const roundRobin = (pick: (c: SecondaryCorpus) => DanyaNote[]): void => {
    const queues = corpora.map(pick);
    for (let i = 0; out.length < max; i += 1) {
      // Stop once every queue is exhausted at this depth.
      if (queues.every((q) => i >= q.length)) break;
      for (const q of queues) {
        if (out.length >= max) break;
        if (i < q.length) take([q[i]]);
      }
    }
  };
  // Line-anchored notes from every corpus first — a note keyed at the exact
  // line beats any opening-name match, whichever corpus it came from.
  if (args.historySans && args.historySans.length > 0) {
    roundRobin((c) => c.notesForPrefix(args.historySans as string[]));
  }
  if (args.openingName) {
    roundRobin((c) => c.notesForOpening(args.openingName as string));
  }
  return out;
}
