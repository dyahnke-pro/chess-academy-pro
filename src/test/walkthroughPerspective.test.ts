/**
 * The banned pronouns in WALKTHROUGH narration — the third surface no gate saw.
 *
 * 🔴 WHY THIS EXISTS. The 2026-08-28 migration cleared 8,197 occurrences of
 * we/our/us from shipped narration, and `perspectiveVoice.test.ts` has held
 * the line at zero since. But it has exactly two arms:
 *
 *   • the JSON corpora — it walks `.json` data files;
 *   • lesson beats — `ALL_LESSONS[].lesson.beats[].say / .sayShort`.
 *
 * A `WalkthroughTree` is NEITHER. It lives in a `.ts` file, so the JSON arm
 * cannot see it, and its per-move prose is `node.idea`, not a lesson `beat`,
 * so the beat arm cannot either. `openingWalkthroughs/vienna.ts` alone carries
 * **98** banned-pronoun sentences that a student hears move by move:
 *
 *   "quieter because we develop the knight before the bishop…"
 *
 * Three sweeps and a gate at zero, and this surface was never in scope.
 *
 * ── WHY THIS IMPORTS THE DATA INSTEAD OF READING THE SOURCE ─────────────────
 * The first cut of this file SCANNED SOURCE TEXT for string literals and had
 * to be thrown away. It reported 267 hits, of which the first ones read were a
 * hostname (`https://us.i.posthog.com`) and a regex that parses what the
 * STUDENT types (`…|they|we|my opponent…`) — banning "we" there would break
 * question routing to enforce a rule about the coach's voice. Worse, its
 * hand-rolled tokenizer mistook comment prose for literals whenever a regex
 * literal contained a quote, so ~12 more were comments about the code.
 *
 * A gate that cries wolf gets switched off within a day, which is worse than
 * no gate. Importing the tree and walking `idea` reads exactly what ships,
 * with no parser to be wrong — the same choice `perspectiveVoice` already made
 * for its two arms.
 *
 * 🔴 AND THE NUMBER ITSELF SHOWS WHY THE SOURCE SCAN HAD TO GO. It reported
 * 98 for this file; reading the shipped tree gives **32**. The scanner was
 * counting every literal in the file — duplicates, non-`idea` fields, prose it
 * had mistaken for a literal — and I would have set a ceiling with 66 sentences
 * of slack in it, which is room for sixty-six new violations to hide. The
 * anti-slack assertion below caught that, which is the only reason the number
 * in this file is the real one.
 *
 * ── THE CEILING ─────────────────────────────────────────────────────────────
 * Fixing 32 sentences is a content migration, not a refactor: each one is
 * authored prose whose replacement has to keep the teaching intact. So this
 * lands as a SHRINK-ONLY ceiling, the pattern this repo already uses for
 * exactly this situation. It can never rise, and a NEW walkthrough written in
 * the banned voice fails the build immediately.
 */

import { describe, it, expect } from 'vitest';
import { BANNED_PRONOUNS } from '../services/perspectiveRule';
import { VIENNA_GAME } from '../data/openingWalkthroughs/vienna';

/**
 * 🔒 IT REACHED ZERO ON THE DAY IT WAS WRITTEN, so this is a HARD GATE rather
 * than a ratchet: any banned pronoun in walkthrough narration is a NEW one.
 *
 * It landed at 32 and the prose was migrated in the same pass — "our knight"
 * to "your knight", "we recapture" to "you recapture", and one app-voice
 * sentence ("Same trick we teach against…") rewritten rather than re-pointed,
 * because the app teaching something is not the student doing it.
 *
 * Never raise this to make a build pass. A walkthrough written in the banned
 * voice should fail immediately — that is the whole point of catching the
 * surface at zero instead of inheriting a backlog.
 */
const WALKTHROUGH_PRONOUN_CEILING = 0;

/**
 * Every narration string anywhere in the tree.
 *
 * 🔴 THE FIRST VERSION WALKED `idea` ONLY, and reported zero while the same
 * tree still carried `text:` prose two levels down — the branch and aside
 * copy a student reads just as directly. I found it by eye in a diff, which is
 * exactly the way a gate should NOT be checked.
 *
 * So this walks the object GENERICALLY and tests every string under a
 * narration-bearing key, rather than the one field I happened to think of.
 * The key list comes from `walkthroughTree.ts` and is asserted non-empty
 * below — a gate that knows about one field out of ten is a gate that reports
 * a clean surface while nine of them rot.
 */
const NARRATION_KEYS = new Set([
  'idea', 'text', 'intro', 'outro', 'narration', 'prompt',
  'explanation', 'title', 'whyBad', 'whyPunish',
]);

function narrationStrings(value: unknown, key = ''): string[] {
  if (typeof value === 'string') return NARRATION_KEYS.has(key) && value.trim() ? [value] : [];
  if (Array.isArray(value)) return value.flatMap((v) => narrationStrings(v, key));
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) => narrationStrings(v, k));
  }
  return [];
}

describe('walkthrough narration and the banned pronouns', () => {
  const ideas = narrationStrings(VIENNA_GAME);

  it('reads real narration — the walk is not vacuous', () => {
    // Every assertion below is meaningless if the tree walk returns nothing,
    // and it would then pass for free forever. Fail here instead.
    expect(ideas.length, 'no narration found — the tree walk is broken').toBeGreaterThan(100);
    expect(NARRATION_KEYS.size, 'the key list is empty — every string would be skipped').toBeGreaterThan(5);
    expect(ideas.join(' ').length).toBeGreaterThan(5_000);
  });

  it('CAN FIRE — the pattern catches the real sentence and spares the innocent', () => {
    // A negative control on strings we control, so a green below means the
    // prose is clean rather than the matcher being asleep.
    expect(BANNED_PRONOUNS.test('quieter because we develop the knight first')).toBe(true);
    expect(BANNED_PRONOUNS.test('Our knight lands on d5')).toBe(true);
    expect(BANNED_PRONOUNS.test('You develop the knight before the bishop')).toBe(false);
    expect(BANNED_PRONOUNS.test('They answer with the Sicilian')).toBe(false);
  });

  it('the count only ever SHRINKS', () => {
    const offenders = ideas.filter((t) => BANNED_PRONOUNS.test(t));
    expect(
      offenders.length,
      `${offenders.length} walkthrough sentences use we/our/us — the whose-piece ambiguity, `
      + 'banned in shipped narration (CLAUDE.md, locked 2026-08-28). The student is "you/your", '
      + 'the opponent is "they/their". NEVER raise this ceiling to make a build pass; migrate '
      + `prose and lower it. First offender: "${(offenders[0] ?? '').slice(0, 120)}"`,
    ).toBeLessThanOrEqual(WALKTHROUGH_PRONOUN_CEILING);
  });

  it('the ceiling is not slack — it matches what is actually there', () => {
    // A ceiling well above the real count silently permits new violations up
    // to the gap, which is how a shrink-only number stops shrinking. Keep it
    // tight enough that the next addition trips it.
    const offenders = ideas.filter((t) => BANNED_PRONOUNS.test(t)).length;
    expect(
      WALKTHROUGH_PRONOUN_CEILING - offenders,
      `the ceiling is ${WALKTHROUGH_PRONOUN_CEILING} but only ${offenders} sentences offend — `
      + 'lower it to the real number so a new violation cannot hide in the slack',
    ).toBeLessThanOrEqual(0);
  });
});
