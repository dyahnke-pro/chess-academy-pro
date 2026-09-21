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

  // 🔒 THE SECOND BANNED PRONOUN — GENDERED (C15/#22, 2026-09-20).
  //
  // CLAUDE.md records this hole in the PROMPTS and fixed it there
  // (`perspectiveRule`): "every copy banned we/our/us and NONE banned a
  // gendered pronoun". The DATA gate had the identical hole and nobody had
  // looked — this file scanned only for we/our/us, so 99 shipped narration
  // strings call the OPPONENT "he" ("he's paralyzed", "he's welcome to
  // trade", "he's completely ignored the threats") against the locked rule
  // that the opponent is they/their. Measured, none of the 99 names a real
  // player, so none is the legitimate "Fischer … he" case.
  //
  // A shrink-only CEILING rather than `toEqual([])`, matching how this repo
  // treats a real backlog: the debt is visible, it can only go down, and a
  // NEW offender cannot be added. The prose fix is an offline BAKE, never a
  // substitution table — "White does" → "you does" is why `beatRegister`
  // classifies instead of rewriting.
  const COLOUR_WORD = /\b(White|Black)\b/;
  const GENDERED = /\b(he|he's|he'd|he'll|him|his|himself|she|she's|her|hers|herself)\b/i;
  const GENDERED_CEILING = 246;
  it('voiced narration: gendered pronouns for the opponent only ever SHRINK', () => {
    const offenders: string[] = [];
    const perFile: Record<string, number> = {};
    // model-games.json is OUT OF SCOPE, and by the rule rather than by
    // convenience: CLAUDE.md sanctions the SPECTATOR register for a pure model
    // game ("the student plays neither side — use White/Black, since neither
    // side is 'you'"), and those overviews are third-person prose about NAMED
    // historical players. "Fischer abandons his lifelong 1.e4" and "Marshall
    // unveiled his prepared gambit" are correct there. Including the file put
    // 133 legitimate strings in the backlog and would have pushed someone to
    // "fix" sentences that are right.
    const SCOPED = JSON_FILES.filter((f) => f !== 'model-games.json');
    for (const file of SCOPED) {
      const parsed = JSON.parse(readFileSync(join(DATA_DIR, file), 'utf8'));
      const strings: string[] = [];
      collectProseStrings(parsed, strings);
      for (const s of strings) {
        // A gendered pronoun is only a DEFECT when it stands for a COLOUR —
        // "White takes and he's up a point". Naming a real player and then
        // saying "his" is correct prose ("Fischer abandons his lifelong 1.e4",
        // "Marshall unveiled his prepared gambit"), and model-games is full of
        // it. So the test is the same shape `beatRegister` uses: the pronoun
        // and a colour in the SAME sentence. A blanket scan would baseline 133
        // legitimate model-game overviews as debt and push someone to "fix"
        // sentences that are right.
        const bad = s.split(/(?<=[.!?])\s+/).some((sentence) => GENDERED.test(sentence) && COLOUR_WORD.test(sentence));
        if (!bad) continue;
        offenders.push(`${file}: ${s.slice(0, 110)}`);
        perFile[file] = (perFile[file] ?? 0) + 1;
      }
    }
    const split = Object.entries(perFile).sort((a, b) => b[1] - a[1]).map(([f, n]) => `${f}=${n}`).join(' ');
    expect(
      offenders.length,
      `${offenders.length} narration string(s) call a player "he/his/she/her" — the opponent is ` +
        `"they/their" (locked). Per file: ${split}. ` +
        `Ceiling is ${GENDERED_CEILING} and may only SHRINK; lower it when you ` +
        `clear backlog, never raise it. First offenders:\n` +
        offenders.slice(0, 8).map((s) => `  • ${s}`).join('\n'),
    ).toBeLessThanOrEqual(GENDERED_CEILING);
    // Non-vacuous: the scan must actually be reading prose. A collector that
    // returned nothing would satisfy the ceiling for free.
    expect(SCOPED.length, 'no files scanned — the ceiling would pass for free').toBeGreaterThan(0);
  });

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
