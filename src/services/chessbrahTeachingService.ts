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
import type { DanyaNote } from './danyaTeachingService';

interface TeachingsBundle {
  generatedAt: string;
  videosDistilled: number;
  noteCount: number;
  notes: DanyaNote[];
}

const DATA = teachingsData as unknown as TeachingsBundle;

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

const byOpening = new Map<string, DanyaNote[]>();
const byPrefix = new Map<string, DanyaNote[]>();

for (const n of DATA.notes) {
  if (n.opening) {
    const key = normName(n.opening);
    const bucket = byOpening.get(key) ?? [];
    bucket.push(n);
    byOpening.set(key, bucket);
  }
  if (n.lineSan.length > 0) {
    const key = n.lineSan.join(' ');
    const bucket = byPrefix.get(key) ?? [];
    bucket.push(n);
    byPrefix.set(key, bucket);
  }
}

/** Opening-keyed notes by fuzzy-tokenized name, same contract (and same
 *  generic-token guard) as the primary corpus's lookup. */
export function notesForOpening(openingName: string, maxNotes = 4): DanyaNote[] {
  const qTokens = new Set(normName(openingName).split(' ').filter((t) => t.length > 2));
  if (qTokens.size === 0) return [];
  const scored: Array<{ n: DanyaNote; score: number }> = [];
  for (const [key, bucket] of byOpening) {
    const kTokens = key.split(' ').filter((t) => t.length > 2);
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
}

/** Notes keyed exactly at a played line, for the anchored subset. */
export function notesForPrefix(historySans: string[], maxNotes = 3): DanyaNote[] {
  const out: DanyaNote[] = [];
  for (let len = historySans.length; len >= 1 && out.length < maxNotes; len -= 1) {
    for (const n of byPrefix.get(historySans.slice(0, len).join(' ')) ?? []) {
      if (out.length >= maxNotes) break;
      out.push(n);
    }
  }
  return out;
}

/** Secondary notes keyed EXACTLY at this line — the only tier allowed to feed
 *  `noteAtPosition`, whose contract is "at this position, not an ancestor". */
export function secondaryNotesForPosition(historySans: string[]): DanyaNote[] {
  return byPrefix.get(historySans.join(' ')) ?? [];
}

/** THE gap-filling entry point: teaching for an opening the primary corpus does
 *  not cover. Callers pass how many notes the primary already supplied for this
 *  position; a non-empty primary result means no top-up, so the secondary can
 *  never dilute or contradict Naroditsky teaching where it exists. */
export function secondaryNotesForGap(args: {
  historySans?: string[];
  openingName?: string | null;
  primaryHits: number;
  maxNotes?: number;
}): DanyaNote[] {
  if (args.primaryHits > 0) return [];
  const max = args.maxNotes ?? 2;
  const out: DanyaNote[] = [];
  const seen = new Set<string>();
  if (args.historySans && args.historySans.length > 0) {
    for (const n of notesForPrefix(args.historySans, max)) {
      if (!seen.has(n.id)) { out.push(n); seen.add(n.id); }
    }
  }
  if (args.openingName && out.length < max) {
    for (const n of notesForOpening(args.openingName, max - out.length)) {
      if (!seen.has(n.id)) { out.push(n); seen.add(n.id); }
    }
  }
  return out;
}

/** Corpus stats for audits / the settings debug panel. */
export function chessbrahCorpusStats(): { notes: number; positioned: number; videos: number } {
  return {
    notes: DATA.notes.length,
    positioned: DATA.notes.filter((n) => n.lineSan.length > 0).length,
    videos: DATA.videosDistilled,
  };
}
