import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ALL_LESSONS } from './lessons/registry';

// ── PERSPECTIVE VOICE GATE (David 2026-08-28, locked) ────────────────────────
// "We should always have the coach narrate the same perspective across app." /
// "Then yes. Lock in and make changes across entire app."
//
// THE STANDARD: the student's OWN side is "you / your"; the opponent is
// "they / their" (or, when the coach itself is the opponent in a live game,
// "I / my"). "we / our / us" is BANNED in shipped chess narration — it is
// ambiguous about whose piece it is (a live tester can't tell if the coach
// means them or the opponent). This gate scans the coach's OWN authored
// narration and fails on any first-person-plural pronoun.
//
// EXCLUDED: the public-domain book corpus (chess-concepts, opening-book-pages,
// library/*) — those are verbatim quotes (Capablanca's "we" is his), not the
// coach's voice, and are never migrated.
//
// Baseline is EMPTY: the 2026-08-28 migration cleared all 8,197 occurrences.
// It only ever shrinks. A new violation = author it in the standard, do not add
// to the baseline.

// The hard, unambiguous ban: first-person-plural pronouns that blur whose piece
// it is. ("let's" is a rhetorical idiom — "let's be honest", "let's see" — not a
// whose-piece ambiguity; it's discouraged in the prompts but not gated here.)
const BANNED = /\b(we|we're|we'll|we've|we'd|our|ours|us|ourselves|ourself)\b/i;

const DATA_DIR = join(__dirname);
// 🔒 THE VOICED PLAY-SURFACE FILES WERE NEVER IN THIS GATE (added 2026-09-12).
// The 2026-08-28 migration cleared 8,197 occurrences from the files listed
// here — and these two were not listed, so they kept shipping the banned
// pronoun to the play surfaces where voiced is the SOLE exact-position source:
// 9,361 occurrences in voiced-walkthroughs.json and 5,625 in
// voiced-teachings.json, unseen for two weeks because nothing looked. Both are
// migrated now and both are gated, so the gap cannot reopen.
const JSON_FILES = [
  'voiced-matchups.json',
  'voiced-walkthroughs.json',
  'middlegame-plans.json',
  'common-mistakes.json',
  'model-games.json',
  'pro-repertoires.json',
  'repertoire.json',
];

// Only test PROSE string values — skip ids/slugs/FENs/PGNs/SANs/URLs/eco codes
// which never carry narration but could coincidentally contain "us"/"we".
function isProse(s: string): boolean {
  if (!s.includes(' ')) return false; // slugs, ids, single tokens
  if (/^https?:\/\//i.test(s)) return false; // source URLs
  if (/^[rnbqkpRNBQKP1-8/]+ [wb] /.test(s)) return false; // FEN
  if (/^\s*1\.\s*[a-hNBRQKO]/.test(s)) return false; // PGN movetext
  return true;
}

function collectProseStrings(node: unknown, out: string[]): void {
  if (typeof node === 'string') {
    if (isProse(node)) out.push(node);
  } else if (Array.isArray(node)) {
    for (const v of node) collectProseStrings(v, out);
  } else if (node && typeof node === 'object') {
    for (const v of Object.values(node)) collectProseStrings(v, out);
  }
}

const EXTRA_FILES: [string, string][] = [
  ['voiced-teachings.json', join(__dirname, '../../public/data/voiced-teachings.json')],
];

// "the US Championship" is a COUNTRY, not the pronoun "us". BANNED is
// case-insensitive by design (it must catch "Us" at a sentence start), so the
// three real mentions of the US Championship in the voiced corpus would read as
// violations. Excised before the test, and deliberately narrow: only uppercase
// US immediately followed by a capitalised word.
const stripCountry = (s: string): string => s.replace(/\bUS(?= [A-Z])/g, '');

describe('perspective voice — no first-person-plural in shipped narration', () => {
  for (const [name, path] of EXTRA_FILES) {
    it(`${name}: no we/our/us in narration prose`, () => {
      const parsed = JSON.parse(readFileSync(path, 'utf8'));
      const strings: string[] = [];
      collectProseStrings(parsed, strings);
      const offenders = strings.filter((x) => BANNED.test(stripCountry(x))).slice(0, 20);
      expect(
        offenders,
        `${name}: ${offenders.length} narration string(s) use we/our/us. First offenders:\n` +
          offenders.map((x) => `  • ${x.slice(0, 120)}`).join('\n'),
      ).toEqual([]);
    });
  }

  for (const file of JSON_FILES) {
    it(`${file}: no we/our/us in narration prose`, () => {
      const parsed = JSON.parse(readFileSync(join(DATA_DIR, file), 'utf8'));
      const strings: string[] = [];
      collectProseStrings(parsed, strings);
      const offenders = strings.filter((s) => BANNED.test(stripCountry(s))).slice(0, 20);
      expect(
        offenders,
        `${file}: ${offenders.length} narration string(s) use we/our/us/let's. ` +
          `The student is "you/your", the opponent is "they/their". First offenders:\n` +
          offenders.map((s) => `  • ${s.slice(0, 120)}`).join('\n'),
      ).toEqual([]);
    });
  }

  it('lesson beats (say + sayShort): no we/our/us', () => {
    const offenders: string[] = [];
    // 🚨 `lesson.lesson.beats`, not `lesson.beats` (2026-09-21). `ALL_LESSONS`
    // holds RegisteredLesson — {scope, key, openingId, lesson} — which has no
    // `beats`, so `lesson.beats ?? []` was `undefined ?? []` and this gate
    // walked NOTHING. It is the beat half of the locked perspective rule and it
    // had been vacuously green. The `?? []` is what hid it: `beats` is required
    // on LessonScript, so the fallback could only ever mask a wrong reach.
    let beatsWalked = 0;
    for (const { lesson: script, openingId } of ALL_LESSONS) {
      for (const beat of script.beats) {
        beatsWalked += 1;
        for (const field of [beat.say, beat.sayShort]) {
          if (typeof field === 'string' && BANNED.test(field)) {
            offenders.push(`${openingId}: ${field.slice(0, 100)}`);
          }
        }
      }
    }
    // Non-vacuity: an empty offender list means nothing unless the walk
    // actually reached the beats. This is the assertion the version above
    // could never have made.
    expect(beatsWalked).toBeGreaterThan(1_000);
    expect(
      offenders.slice(0, 20),
      `${offenders.length} lesson beat(s) use we/our/us/let's. Student="you/your", opponent="they/their".`,
    ).toEqual([]);
  });
});
