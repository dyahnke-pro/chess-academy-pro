import { describe, it, expect } from 'vitest';
import matchups from './voiced-matchups.json';
import walkthroughs from './voiced-walkthroughs.json';

// ── THE DEPERSONALIZER GRAMMAR GATE ──────────────────────────────────────────
// `scripts/voiced-authoring/depersonalize.mjs` rewrites the pro's own series
// references out of the voiced corpus (the app is depersonalized — no names,
// ever). One of its rules matched NO preposition but emitted a phrase carrying
// one, so it substituted a prepositional phrase into slots that already had a
// preposition, and into subject position:
//
//   "with the aid of my speedrun"     → "with the aid of IN top-level play"
//   "my speedrun is about openings"   → "IN top-level play is about openings"
//   "But the point of my speedrun is" → "But the point of IN top-level play is"
//
// Ten of these shipped and were SPOKEN to the student (found 2026-09-16 by
// reading the Learn narration of the Alapin). A broken sentence is not a
// content bug the content gates can see — it is grammatical, so nothing failed.
// This gate reads the shipped strings the way the voice does.

const BAD_PREP = /\b(?:of|to|with|from|about|by|at|into|for|on|during)\s+in top-level play\b/i;
const SUBJECT = /(?:^|[.!?]\s+)in top-level play\s+(?:is|was|are|were|has|have|had)\b/i;

function everyString(node: unknown, out: string[] = []): string[] {
  if (typeof node === 'string') out.push(node);
  else if (Array.isArray(node)) for (const v of node) everyString(v, out);
  else if (node && typeof node === 'object') for (const v of Object.values(node)) everyString(v, out);
  return out;
}

describe('voiced corpus — the depersonalizer never breaks the grammar', () => {
  const corpora: Array<[string, unknown]> = [
    ['voiced-matchups.json', matchups],
    ['voiced-walkthroughs.json', walkthroughs],
  ];

  for (const [name, data] of corpora) {
    const strings = everyString(data);

    it(`${name} — no doubled preposition ("of in top-level play")`, () => {
      const bad = strings.filter((s) => BAD_PREP.test(s));
      expect(bad, `broken in ${name}:\n${bad.slice(0, 5).join('\n')}`).toEqual([]);
    });

    it(`${name} — "in top-level play" is never a sentence SUBJECT`, () => {
      const bad = strings.filter((s) => SUBJECT.test(s));
      expect(bad, `broken in ${name}:\n${bad.slice(0, 5).join('\n')}`).toEqual([]);
    });

    it(`${name} — the gate is non-vacuous (the corpus really carries the phrase)`, () => {
      expect(strings.some((s) => /top-level play/i.test(s))).toBe(true);
    });
  }
});
