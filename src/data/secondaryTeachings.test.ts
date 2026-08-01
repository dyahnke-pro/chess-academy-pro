// The gate for EVERY farmed secondary corpus (hangingpawns, saintlouis, …).
//
// Same bar as the Danya corpus and the chessbrah one — legal (chess.js replays
// lineSan from the start, G3), anchored, sourced, original in register,
// bounded — because these notes reach the coach through the same grounding
// block and nothing about being a fallback tier lowers the standard.
//
// The depersonalization ban is PER-CREATOR: a Saint Louis note must leak
// neither a lecturer's name nor the venue, exactly as a Danya note must not
// leak his. The app speaks with one voice; these corpora supply ideas.
//
// An EMPTY corpus is legal here (the farm ships the shell before the distill
// run fills it) — but everything in a non-empty one must pass.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';

// Read from `public/data/`, not an import: a farmed corpus is fetched at
// runtime rather than bundled (see `farmedCorpusData` — they scale with a
// creator's back-catalogue and would blow the precache cap). Reading the file
// keeps this gate on the EXACT bytes the app will serve.
// cwd-anchored, not `import.meta.url`: under the jsdom test environment that
// URL does not resolve to a real filesystem path.
const readCorpus = (name: string): { notes: Note[] } =>
  JSON.parse(readFileSync(resolve(process.cwd(), `public/data/${name}-teachings.json`), 'utf8'));

interface Note {
  id: string;
  lineSan: string[];
  opening: string | null;
  phase: string;
  explains: string;
  // Optional in practice: a note may legitimately carry no plan, and this gate
  // reads raw shipped JSON rather than a typed import, so the read below stays
  // defensive.
  teaches?: string;
  plans?: string;
  sources: string[];
}

// Shared across creators: the medium itself must never surface.
const SHARED_BAN = 'naroditsky|danya|aman|hambleton|chessbrah|in this video|in the video|the streamer|chat|subscribe|this stream|speedrun';

const CORPORA: Array<{ key: string; idPrefix: string; notes: Note[]; banned: RegExp }> = [
  {
    key: 'hangingpawns',
    idPrefix: 'hp',
    notes: readCorpus('hangingpawns').notes,
    banned: new RegExp(`\\b(${SHARED_BAN}|hanging pawns|stjepan|tomic|patreon)\\b`, 'i'),
  },
  {
    key: 'saintlouis',
    idPrefix: 'sl',
    notes: readCorpus('saintlouis').notes,
    banned: new RegExp(
      `\\b(${SHARED_BAN}|saint louis|st\\. louis|chess club|finegold|seirawan|shahade|maurice ashley|shankland|yermolinsky|khachiyan|nemcova|shabalov|nyzhnyk|novikov|mikhalevski|landa|quesada|georgiev|durarbayli|cordova|chandra|denby|lecture|lectures|audience)\\b`,
      'i',
    ),
  },
];

const MOVE_NUMBER_PREFIX = /\d{1,2}(\.|…|\.\.\.)(?=[NBRQKO]|[a-h][1-8x])/;

describe.each(CORPORA.map((c) => [c.key, c] as const))('%s-teachings corpus gate', (_key, corpus) => {
  it('every position-keyed note replays legally from the start position (G3)', () => {
    for (const n of corpus.notes) {
      if (n.lineSan.length === 0) continue;
      const c = new Chess();
      for (const san of n.lineSan) {
        let ok = false;
        try { ok = !!c.move(san); } catch { ok = false; }
        expect(ok, `${n.id}: illegal move "${san}" in [${n.lineSan.join(' ')}]`).toBe(true);
      }
    }
  });

  it('every note is anchored: position-keyed or opening-named', () => {
    for (const n of corpus.notes) {
      expect(n.lineSan.length > 0 || !!n.opening, `${n.id}: unanchored note`).toBe(true);
    }
  });

  it('every note carries a yt: source', () => {
    for (const n of corpus.notes) {
      expect(n.sources.some((s) => /^yt:[\w-]{6,}$/.test(s)), `${n.id}: missing yt source`).toBe(true);
    }
  });

  it('note ids use this corpus\'s prefix (the coach dedupes by id across corpora)', () => {
    for (const n of corpus.notes) {
      expect(n.id.startsWith(corpus.idPrefix), `${n.id}: expected the "${corpus.idPrefix}" prefix`).toBe(true);
    }
  });

  it('prose is present and free of attribution / medium leaks', () => {
    for (const n of corpus.notes) {
      expect(n.explains.trim().length, `${n.id}: empty explains`).toBeGreaterThan(0);
      for (const field of ['explains', 'teaches', 'plans'] as const) {
        const text = n[field] ?? '';
        expect(corpus.banned.test(text), `${n.id}.${field}: attribution / medium leak`).toBe(false);
        expect(MOVE_NUMBER_PREFIX.test(text), `${n.id}.${field}: move-number prefix (G9.4 — Polly reads "2." as "two")`).toBe(false);
      }
    }
  });
});
