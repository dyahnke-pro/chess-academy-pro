import { describe, it, expect } from 'vitest';
import matchups from './voiced-matchups.json';
import walkthroughs from './voiced-walkthroughs.json';

// ── THE VOICED-CORPUS REGISTER GATE (shrink-only) ────────────────────────────
// Narration Voice Rule 6 bans first person and meta: "the narrator is the
// position, not a tutor character." The voiced corpus is distilled from real
// teaching transcripts, and residue of the speaker survived the authoring pass —
// found 2026-09-16 by READING the shipped Learn narration of the Alapin, where
// the coach said "My hunch was right — Kalifman recommends a queen check on a4"
// and "Normally against the Alapin I like ...d5".
//
// These baselines are CEILINGS THAT MAY ONLY SHRINK (the sealed-gate rule). They
// are NOT permission: they record the size of a known backlog so it cannot grow
// while it is worked down. Lower a number when you clear some; never raise one.
//
// Deliberately NOT gated: named historical players (Fischer, Magnus). The
// depersonalization rule is about never attributing the app's VOICE to a pro —
// citing a famous game is ordinary chess teaching. Flagged for David, not
// assumed to be a defect.

const FIRST_PERSON = /\b(?:I like|I think|I want|I'd |I'm |my hunch|my plan|I believe|I would|I'll |let me show)\b/;
// A leading ellipsis followed by a MOVE is legitimate Black-move notation
// ("…Nf6"); followed by prose it is a transcript fragment read aloud.
const ELLIPSIS = /^\s*(?:\.\.\.|…)/;
const NOTATION = /^\s*(?:\.\.\.|…)\s*(?:[NBRQK]?[a-h]?[1-8]?x?[a-h][1-8]|O-O)/;
const META = /\b(?:this video|today we|short game, let's|recording|subscribe|channel)\b/i;
// THE OPPONENT IS "they / their" (David 2026-08-28, LOCKED). The 2026-08-28
// migration cleared all 8,197 we/our/us and `perspectiveVoice.test.ts` gates
// that — but nothing ever checked he/his/him, so 1,146 spoken strings still
// assume the opponent is male. A NAMED historical player keeps his pronouns
// ("A game of Fischer's — he was ahead of his time"); that is a real person,
// not the person sitting across from the student.
const MASCULINE = /\b(?:he|he's|his|him|himself)\b/i;
const NAMED_PLAYER = /\b(?:Fischer|Magnus|Carlsen|Kasparov|Morphy|Capablanca|Tal|Petrosian|Alekhine|Lasker|Karpov)\b/;

const SPOKEN_FIELD = /\.(?:idea|shortIdea|say|sayShort|text|narration|intro|outro)(?:\[|$)/;

function spokenStrings(node: unknown, path = '', out: string[] = []): string[] {
  if (typeof node === 'string') { if (SPOKEN_FIELD.test(path)) out.push(node); }
  else if (Array.isArray(node)) node.forEach((v, i) => spokenStrings(v, `${path}[${i}]`, out));
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) spokenStrings(v, `${path}.${k}`, out);
  }
  return out;
}

const ALL = new Set([
  ...spokenStrings(matchups),
  ...spokenStrings(walkthroughs),
]);

// Measured 2026-09-16 across 11,809 unique spoken strings.
const BASELINE_FIRST_PERSON = 521;
const BASELINE_FRAGMENT = 81;
const BASELINE_META = 0;
// 1145 -> 34 (2026-09-19, in two passes). `scripts/voiced-authoring/degender.mjs` rewrote the
// AUTHORED source offline, so every change landed in a readable diff and these
// gates ran on it. What survives is what the script REFUSED rather than
// guessed: "he's pinned" is ambiguous — "he IS pinned" and "he HAS pinned" are
// both real chess sentences and pluralise differently (they're / they've).
// Those need a human, so they are still counted here. Lower this as they go.
const BASELINE_MASCULINE_OPPONENT = 34;

describe('voiced corpus register — shrink-only backlog', () => {
  it('the corpus is actually loaded (non-vacuous)', () => {
    expect(ALL.size).toBeGreaterThan(5000);
  });

  it(`first-person residue never grows (baseline ${BASELINE_FIRST_PERSON})`, () => {
    const hits = [...ALL].filter((s) => FIRST_PERSON.test(s));
    expect(
      hits.length,
      `first-person grew to ${hits.length}; e.g.\n${hits.slice(0, 3).join('\n')}`,
    ).toBeLessThanOrEqual(BASELINE_FIRST_PERSON);
  });

  it(`prose fragments opening on an ellipsis never grow (baseline ${BASELINE_FRAGMENT})`, () => {
    const hits = [...ALL].filter((s) => ELLIPSIS.test(s) && !NOTATION.test(s));
    expect(
      hits.length,
      `fragments grew to ${hits.length}; e.g.\n${hits.slice(0, 3).join('\n')}`,
    ).toBeLessThanOrEqual(BASELINE_FRAGMENT);
  });

  it(`video/meta residue never grows (baseline ${BASELINE_META})`, () => {
    const hits = [...ALL].filter((s) => META.test(s));
    expect(hits.length, `meta grew to ${hits.length}:\n${hits.join('\n')}`)
      .toBeLessThanOrEqual(BASELINE_META);
  });

  it(`the opponent is never "he" — never grows (baseline ${BASELINE_MASCULINE_OPPONENT})`, () => {
    const hits = [...ALL].filter((s) => MASCULINE.test(s) && !NAMED_PLAYER.test(s));
    expect(
      hits.length,
      `masculine opponent grew to ${hits.length}; e.g.\n${hits.slice(0, 3).join('\n')}`,
    ).toBeLessThanOrEqual(BASELINE_MASCULINE_OPPONENT);
  });

  it('a NAMED historical player keeps his pronouns (not a violation)', () => {
    const s = "A game of Fischer's — he was ahead of his time.";
    expect(MASCULINE.test(s) && !NAMED_PLAYER.test(s)).toBe(false);
  });

  it('legitimate …SAN Black-move notation is NOT counted as a fragment', () => {
    expect(NOTATION.test('...Nf6 develops')).toBe(true);
    expect(NOTATION.test('...the bishop to g4 is fine')).toBe(false);
  });
});
