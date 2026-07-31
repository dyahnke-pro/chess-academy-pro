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
import type { DanyaNote } from './danyaTeachingService';

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
  stats: () => { notes: number; positioned: number; videos: number };
}

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
export function createSecondaryCorpus(key: string, data: TeachingsBundle): SecondaryCorpus {
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

  const notesForOpening = (openingName: string, maxNotes = 4): DanyaNote[] => {
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

  const notesForPrefix = (historySans: string[], maxNotes = 3): DanyaNote[] => {
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
  const max = args.maxNotes ?? 2;
  const out: DanyaNote[] = [];
  const seen = new Set<string>();
  const take = (notes: DanyaNote[]): void => {
    for (const n of notes) {
      if (out.length >= max) return;
      if (seen.has(n.id)) continue;
      out.push(n);
      seen.add(n.id);
    }
  };
  // Line-anchored notes from every corpus first — a note keyed at the exact
  // line beats any opening-name match, whichever corpus it came from.
  if (args.historySans && args.historySans.length > 0) {
    for (const c of corpora) {
      if (out.length >= max) break;
      take(c.notesForPrefix(args.historySans, max - out.length));
    }
  }
  if (args.openingName) {
    for (const c of corpora) {
      if (out.length >= max) break;
      take(c.notesForOpening(args.openingName, max - out.length));
    }
  }
  return out;
}
