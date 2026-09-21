import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
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
  const GENDERED_CEILING = 202;
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
    // AND the two voiced files are out too, because they ALREADY HAVE A GATE:
    // `voicedCorpusRegister.test.ts` carries a masculine-opponent baseline
    // (34) with a NAMED_PLAYER exemption, and its history records the real
    // work — 1145 → 34 on 2026-09-19, rewritten offline by
    // `scripts/voiced-authoring/degender.mjs`, with what survives being what
    // the script REFUSED rather than guessed ("he's pinned" is ambiguous
    // between "he IS pinned" and "he HAS pinned", which pluralise
    // differently). Two gates over one corpus is the duplicated-constant rot
    // this repo exists to kill, so these two PARTITION: that gate owns the
    // voiced corpus, this one owns the four files it never scanned.
    const ALREADY_GATED = new Set(['model-games.json', 'voiced-matchups.json', 'voiced-walkthroughs.json']);
    const SCOPED = JSON_FILES.filter((f) => !ALREADY_GATED.has(f));
    let scanned = 0;
    for (const file of SCOPED) {
      const parsed = JSON.parse(readFileSync(join(DATA_DIR, file), 'utf8'));
      const strings: string[] = [];
      collectProseStrings(parsed, strings);
      scanned += strings.length;
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
    // NON-VACUOUS — AND IT MUST COUNT THE PROSE, NOT THE FILES (tightened
    // 2026-09-20). This asserted `SCOPED.length > 0`, which only proves the
    // file LIST was non-empty: had `collectProseStrings` stopped returning
    // anything, every file would still have been "scanned" and the ceiling
    // would have passed for free, forever. That is the exact failure found the
    // same day in this file's other half, where a lesson-beat loop read a
    // field that does not exist, `?? []` swallowed it, and the we/our/us ban
    // went unchecked against a single beat while reporting green.
    // A ceiling measured through a dead reach is not a ceiling.
    expect(SCOPED.length, 'no files scanned — the ceiling would pass for free').toBeGreaterThan(0);
    expect(scanned, 'no prose strings collected — the ceiling would pass for free').toBeGreaterThan(1000);
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

  // ── C15b — GENDERED PRONOUNS IN AUTHORED LESSON BEATS ──────────────────────
  //
  // The JSON arm above has scanned shipped narration files for a gendered
  // pronoun standing for a COLOUR since 2026-09-20. The BEAT arm below has
  // only ever scanned we/our/us — `GENDERED` was never applied to a single
  // authored beat, so "Before White commits to the big central break, HE takes
  // away Black's pin" passed every gate this repo has.
  //
  // 🔒 IT SCANS THE DIRECTORY, NOT `ALL_LESSONS`, AND THAT IS THE POINT.
  // `registry.ts` contains ZERO pro-rep lessons — by design (CLAUDE.md §G9
  // step 8: "Do NOT register in registry.ts OPENINGS"), so every
  // `pro*.ts` lesson is invisible to a registry-driven gate. Measured
  // 2026-09-21: the registry sees 3,664 beat fields; the directory holds
  // 38,071. A gate reading the registry checks under 10% of the authored beat
  // text in this repo and reports green on the rest.
  //
  // Sentence-scoped, the same shape `curatedBeatSource.beatRegister` uses, so
  // a historical aside ("Bobby Fischer … HE wrote a famous article") is not
  // counted as a defect alongside "…and HE takes away Black's pin".
  //
  // Fixed offline by `scripts/degender-lesson-beats.mjs`, which reuses
  // `degender.mjs`'s verb-agreement transform rather than grepping for /he/ —
  // "he takes" → "they takes" is broken English, and that script already
  // REFUSES the ambiguous "he's X" instead of guessing. 946 sentences across
  // 165 files; 243 → 9 in the registry's own view.
  //
  // 🔴 WHAT SURVIVES IS NOT WHAT THIS COMMENT USED TO SAY, and the old claim is
  // DELETED rather than annotated. It read: "sentences naming a real person
  // (Fischer, Steinitz, Réti/Capablanca, and the pro whose games a pro-rep
  // lesson teaches) … conservative skips, not debt to clear blindly."
  //
  // All 36 were read by hand on 2026-09-21. ZERO named a person. They were 22
  // pieces of PERSONIFICATION ("the queen plants herself on h3", "slide her to
  // d3") — which the rule does not ban, since a personified queen names no
  // side — and 14 GENUINE defects the description had been excusing:
  //   "Black has a clear plan on the side of the board where HE's strongest"
  //   "around Black's fianchettoed king before HE's even castled"  (a king
  //      does not castle; the PLAYER does)
  //   "force White to commit … before HE's finished the setup THEY want"
  //      (both registers in one sentence)
  // Those 14 were rewritten to they/their; 36 -> 21.
  //
  // The comment's one good instruction was "read one before you fix it", and it
  // cut BOTH ways: three first-pass flags turned out to be a queen-pronoun whose
  // antecedent sat in the PREVIOUS sentence, while two more were real defects a
  // nearest-noun heuristic had filed as personification ("Black's up a pawn —
  // but HE's undeveloped"; a pawn is not undeveloped).
  //
  // So the remainder is now ONE coherent class: the queen as "she". Whether the
  // app should personify pieces at all is a VOICE question for David, not a
  // defect under a rule that bans a pronoun standing for a COLOUR.
  const LESSON_DIR = join(__dirname, 'lessons');
  const BEAT_LITERAL = /\b(say|sayShort)\s*:\s*(["'])((?:\\.|(?!\2)[^\\])*)\2/g;
  const GENDERED_BEAT_CEILING = 21;
  it('lesson beats: a gendered pronoun for a COLOUR only ever SHRINKS', () => {
    const offenders: string[] = [];
    let scanned = 0;
    for (const file of readdirSync(LESSON_DIR).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))) {
      const raw = readFileSync(join(LESSON_DIR, file), 'utf8');
      for (const m of raw.matchAll(BEAT_LITERAL)) {
        scanned += 1;
        const text = m[3];
        const bad = text.split(/(?<=[.!?])\s+/).some((sentence) => GENDERED.test(sentence) && COLOUR_WORD.test(sentence));
        if (bad) offenders.push(`${file}: ${text.slice(0, 110)}`);
      }
    }
    // NON-VACUOUS, counting the PROSE and not the files — the exact failure
    // this file's other half shipped for weeks (a beat loop read a field that
    // does not exist, `?? []` swallowed it, and the ban went unchecked while
    // reporting green). A ceiling measured through a dead reach is not a
    // ceiling.
    expect(scanned, 'no beat literals matched — the reach is broken and this gate is vacuous').toBeGreaterThan(30000);
    expect(
      offenders.length,
      `${offenders.length} lesson beat(s) call a player "he/his/she/her". The opponent is ` +
        `"they/their" (locked 2026-08-28). Ceiling is ${GENDERED_BEAT_CEILING} and may only ` +
        `SHRINK. Rewrite offline with scripts/degender-lesson-beats.mjs — never a live ` +
        `substitution, and never by hand-editing one sentence into "they takes". ` +
        `First offenders:\n` + offenders.slice(0, 8).map((x) => `  • ${x}`).join('\n'),
    ).toBeLessThanOrEqual(GENDERED_BEAT_CEILING);
  });

  it('lesson beats: a MASCULINE pronoun for a colour is ZERO, not a ceiling', () => {
    // THE CEILING ABOVE CANNOT SAY THE THING THAT MATTERS. 21 is a number that
    // shrinks; it does not distinguish "the queen plants herself on h3" from
    // "Black's plan is a classic: storm the queenside where HE's slow". After
    // the 2026-09-21 pass those two classes separated cleanly — every one of
    // the 21 survivors is the QUEEN as "she", and the masculine count is ZERO.
    //
    // So assert the invariant directly. He/him/his standing beside a colour is
    // always the player and always the defect the 2026-08-28 rule bans; there
    // is no legitimate instance, which is why this is a hard zero rather than
    // another baseline to erode. Piece personification stays under the ceiling
    // above, where it is a voice question rather than a correctness one.
    const MASC = /\b(he|he's|he'd|he'll|him|his|himself)\b/i;
    const offenders: string[] = [];
    let scanned = 0;
    for (const file of readdirSync(LESSON_DIR).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))) {
      const raw = readFileSync(join(LESSON_DIR, file), 'utf8');
      for (const m of raw.matchAll(BEAT_LITERAL)) {
        scanned += 1;
        for (const sentence of m[3].split(/(?<=[.!?])\s+/)) {
          if (MASC.test(sentence) && COLOUR_WORD.test(sentence)) {
            offenders.push(`${file}: ${sentence.trim().slice(0, 110)}`);
            break;
          }
        }
      }
    }
    expect(scanned, 'no beat literals matched — the reach is broken and this gate is vacuous')
      .toBeGreaterThan(30000);
    expect(
      offenders,
      `${offenders.length} lesson beat(s) call a PLAYER "he/his". The opponent is ` +
        `"they/their" (locked 2026-08-28). This is a hard ZERO, never a ceiling — ` +
        `rewrite the sentence, and mind the verb: "he takes" -> "they take", not ` +
        `"they takes".\nFirst offenders:\n` + offenders.slice(0, 8).map((x) => `  • ${x}`).join('\n'),
    ).toEqual([]);
  });

  it('lesson beats (say + sayShort): no we/our/us', () => {
    // 🚨 THIS HALF OF THE GATE WAS DEAD UNTIL 2026-09-20. It read
    // `lesson.beats` off a RegisteredLesson, which has no `beats` — the script
    // is one level down, on `.lesson`. So `?? []` swallowed it and the loop ran
    // zero times: the beats have never been scanned, while the file reported
    // green and the banned-pronoun rule read as enforced everywhere. A gate
    // that cannot fire is worse than one that fails, which is why `scanned`
    // below is asserted: a future refactor that breaks the reach fails HERE
    // rather than going quietly green again.
    const offenders: string[] = [];
    let scanned = 0;
    for (const entry of ALL_LESSONS) {
      for (const beat of entry.lesson.beats ?? []) {
        for (const field of [beat.say, beat.sayShort]) {
          if (typeof field !== 'string') continue;
          scanned += 1;
          if (BANNED.test(field)) offenders.push(`${entry.key}: ${field.slice(0, 100)}`);
        }
      }
    }
    expect(scanned, 'scanned no beat text — the reach is broken and this gate is vacuous')
      .toBeGreaterThan(500);
    expect(
      offenders.slice(0, 20),
      `${offenders.length} lesson beat(s) use we/our/us/let's. Student="you/your", opponent="they/their".`,
    ).toEqual([]);
  });
});
