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
const JSON_FILES = [
  'voiced-matchups.json',
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

describe('perspective voice — no first-person-plural in shipped narration', () => {
  for (const file of JSON_FILES) {
    it(`${file}: no we/our/us in narration prose`, () => {
      const parsed = JSON.parse(readFileSync(join(DATA_DIR, file), 'utf8'));
      const strings: string[] = [];
      collectProseStrings(parsed, strings);
      const offenders = strings.filter((s) => BANNED.test(s)).slice(0, 20);
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
    for (const lesson of ALL_LESSONS) {
      for (const beat of lesson.beats ?? []) {
        for (const field of [beat.say, beat.sayShort]) {
          if (typeof field === 'string' && BANNED.test(field)) {
            offenders.push(`${lesson.openingId}: ${field.slice(0, 100)}`);
          }
        }
      }
    }
    expect(
      offenders.slice(0, 20),
      `${offenders.length} lesson beat(s) use we/our/us/let's. Student="you/your", opponent="they/their".`,
    ).toEqual([]);
  });
});
