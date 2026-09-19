#!/usr/bin/env node
/**
 * degender — the opponent is THEY, never HE.
 *
 * CLAUDE.md, locked 2026-08-28: the student is "you/your", the opponent is
 * "they/their". The 8,197 we/our/us were migrated then; nothing ever checked
 * he/his/him, so the voiced corpus still says "he takes on d5" about the
 * opponent — and on a surface where the opponent might be the student's own
 * coach, a spectator, or a woman.
 *
 * WHY A SCRIPT AND NOT A REGEX AT THE CHOKEPOINT: "he takes" -> "they takes" is
 * broken English, and a live transform ships its failures straight to a
 * student's ears with nobody having read them. This rewrites the AUTHORED
 * source, so every change lands in a diff and the board-truth + register gates
 * run on it.
 *
 * WHY A SCRIPT AND NOT BY HAND: 837 notes.
 *
 * IT REFUSES RATHER THAN GUESSES. "he's pinned" is genuinely ambiguous — "he
 * IS pinned" (passive) and "he HAS pinned" (perfect) are both real chess
 * sentences and they pluralise differently (they're / they've). Those are
 * LEFT ALONE and printed, because a wrong guess here is a sentence that reads
 * fine and means something else.
 *
 * Usage:  node scripts/voiced-authoring/degender.mjs [--write]
 *         (default is a dry run; --write edits the authored files)
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'data/video-narration-voiced';
const WRITE = process.argv.includes('--write');

/** Verbs whose plural is not "strip the -s". */
const IRREGULAR = new Map(Object.entries({
  has: 'have', is: 'are', was: 'were', does: 'do', goes: 'go',
  "doesn't": "don't", "isn't": "aren't", "wasn't": "weren't", "hasn't": "haven't",
}));

/** Words that are already plural-compatible — a modal, a past tense, an
 *  auxiliary. "he could take" -> "they could take": the verb does not move. */
const NO_CHANGE = new Set([
  'can', "can't", 'could', "couldn't", 'should', "shouldn't", 'would', "wouldn't",
  'will', "won't", 'may', 'might', 'must', 'had', "hadn't", 'did', "didn't",
  'went', 'took', 'played', 'gave', 'kept', 'found', 'knew', 'wanted', 'needed',
  'ever', 'never', 'not', 'also',
  // Irregular PAST tenses — no -ed to spot them by, and they need no agreement.
  'saw', 'came', 'made', 'got', 'ran', 'won', 'lost', 'held', 'thought', 'said',
  'left', 'put', 'set', 'hit', 'cut', 'sent', 'spent', 'built', 'felt', 'meant',
  'slept', 'told', 'sold', 'brought', 'caught', 'taught', 'fought', 'bought',
  'began', 'chose', 'drew', 'threw', 'grew', 'blew', 'stood', 'understood',
  'wrote', 'spoke', 'broke', 'wore', 'rose', 'fell', 'led', 'read', 'meant',
  'beat', 'hit', 'quit', 'shut', 'split', 'bet', 'let', 'cost', 'burst',
]);

/** An adverb may sit between the pronoun and its verb ("he simply doesn't"). */
const ADVERB = new Set([
  'simply', 'just', 'also', 'already', 'then', 'now', 'quickly', 'immediately',
  'usually', 'often', 'never', 'always', 'still', 'probably', 'actually',
  'really', 'finally', 'instead', 'again', 'happily', 'clearly', 'obviously',
  'basically', 'literally', 'certainly', 'definitely', 'quietly', 'calmly',
  'only', 'even', 'rarely', 'sometimes', 'eventually', 'promptly', 'duly',
  'somehow', 'almost', 'nearly', 'barely', 'hardly', 'seemingly', 'apparently',
  'essentially', 'first', 'later', 'often', 'suddenly', 'briefly', 'correctly',
]);

/** 3rd-person-singular -> plural, for a regular verb. */
function pluralise(v) {
  const lower = v.toLowerCase();
  if (IRREGULAR.has(lower)) return match(v, IRREGULAR.get(lower));
  if (NO_CHANGE.has(lower)) return v;
  // A MODAL takes a bare infinitive and never agrees: "he cannot take" ->
  // "they cannot take", "if he were White" -> "if they were White".
  if (MODALS.has(lower)) return v;
  // PAST TENSE NEEDS NO AGREEMENT: "he resigned" -> "they resigned". The first
  // cut flagged every one of these as an unrecognised verb, which is how a
  // refuse-rather-than-guess rule turns into a pile of false work.
  if (/ed$/.test(lower)) return v;
  if (!/s$/.test(lower) || /ss$/.test(lower)) return null;   // not a -s verb: refuse
  if (/ies$/.test(lower)) return match(v, lower.slice(0, -3) + 'y');
  // 🚨 REQUIRE A GENUINE DOUBLE-S, NOT ANY s BEFORE "es". The first cut wrote
  // `(ch|sh|x|z|s|o)es$` and turned "loses" into "los", "collapses" into
  // "collaps", "chases" into "chas". Only a stem really ending ch/sh/x/z/ss/o
  // takes the "-es" plural; everything else ("lose", "chase") is a silent-e
  // stem that takes a plain "-s". Found by reading the diff — the output is
  // still pronounceable, so nothing else would have caught it.
  if (/(ch|sh|x|z|ss|o)es$/.test(lower)) return match(v, lower.slice(0, -2));
  return match(v, lower.slice(0, -1));
}

/** Keep the original capitalisation of a replaced word. */
function match(original, replacement) {
  return /^[A-Z]/.test(original)
    ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
    : replacement;
}

/** "he's X" ruled on by reading each one in its sentence (2026-09-19). */
const ADJUDICATED = new Map(Object.entries({
  // IS — an adjective, adverb or preposition follows.
  forced: "they're", uncastled: "they're", good: "they're", active: "they're",
  left: "they're", totally: "they're", too: "they're", mated: "they're",
  really: "they're", close: "they're", clearly: "they're", so: "they're",
  cooked: "they're", essentially: "they're", also: "they're", busted: "they're",
  just: "they're", super: "they're", actually: "they're", basically: "they're",
  annoyed: "they're",
  // HAS — a direct object follows.
  chosen: "they've", clamped: "they've", moved: "they've", created: "they've",
  mixed: "they've", survived: "they've", blundered: "they've",
  damaged: "they've", blunted: "they've", lost: "they've",
  castled: "they've", forgotten: "they've", given: "they've", got: "they've",
  opened: "they've", panicked: "they've", resigned: "they've",
  stopped: "they've", taken: "they've",
}));

/** Modals + subjunctive `were`: no agreement, ever. */
const MODALS = new Set([
  'can', "can't", 'cannot', 'could', "couldn't", 'would', "wouldn't", 'should',
  "shouldn't", 'must', 'might', 'may', 'will', "won't", 'shall', 'were', 'dare',
]);

const flagged = [];

/**
 * Match each file's OWN formatting. The corpus is mixed — some authored files
 * are one-space indented and some two — so a single hard-coded width reformats
 * half of them. Sniffed from the file's second line, then proven by the
 * round-trip guard rather than trusted.
 */
function indentOf(raw) {
  const m = /\n( +)"/.exec(raw);
  return m ? m[1].length : 2;
}
function serialise(doc, indent, trailingNewline, escapeUnicode) {
  let out = JSON.stringify(doc, null, indent);
  // One authored file writes its em-dashes as \u2014 rather than the literal
  // character. `JSON.stringify` always emits the literal, so without this the
  // guard would refuse that file forever and its "he" strings would never be
  // fixed — a silent hole hiding behind a safety check.
  if (escapeUnicode) {
    out = out.replace(/[\u0080-\uffff]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
  }
  return out + (trailingNewline ? '\n' : '');
}

export function transform(text, where = 'inline') {
  let out = text;

  // 1. THE FREE ONES — no verb involved, so no agreement to get wrong.
  out = out.replace(/\bhimself\b/g, 'themselves').replace(/\bHimself\b/g, 'Themselves');
  out = out.replace(/\bhis\b/g, 'their').replace(/\bHis\b/g, 'Their');
  out = out.replace(/\bhe'd\b/gi, (m) => match(m, "they'd"));
  out = out.replace(/\bhe'll\b/gi, (m) => match(m, "they'll"));

  // "him" is object-position only, so it never touches a verb.
  out = out.replace(/\bhim\b/g, 'them').replace(/\bHim\b/g, 'Them');

  // 2. he's — DECIDE ONLY WHERE IT IS DECIDABLE.
  out = out.replace(/\bhe's\s+([A-Za-z]+)/gi, (whole, next) => {
    const n = next.toLowerCase();
    const head = whole.slice(0, whole.length - next.length);
    // "-ing" can only be the progressive, so this is IS, never HAS.
    if (/ing$/.test(n)) return `${match(head.trim(), "they're")} ${next}`;
    // A state, not an action: "he's a pawn up", "he's fine", "he's not".
    if (['a', 'an', 'the', 'not', 'fine', 'better', 'worse', 'up', 'down', 'out', 'in', 'still', 'already', 'about', 'ready'].includes(n)) {
      return match(whole, "they're") + ` ${next}`;
    }
    // HAND ADJUDICATION. Every "he's X" in the corpus was READ IN CONTEXT and
    // ruled on; the rule that emerged is simply whether a direct object
    // follows ("he's created a lot of weaknesses" = HAS) or an adjective /
    // adverb / preposition does ("he's forced to drop back" = IS). Recorded as
    // a table rather than inferred, because the inference needs the rest of the
    // sentence and a wrong guess reads fine while meaning something else.
    const ruling = ADJUDICATED.get(n);
    if (ruling) return `${match(whole, ruling)} ${next}`;
    flagged.push(`${where}: "${whole}" — is/has is ambiguous, left alone`);
    return whole;
  });

  // 2b. AN AUXILIARY BEFORE THE PRONOUN — a question or a modal. The verb after
  // "he" is then a BARE INFINITIVE and must not be touched ("can he prevent" ->
  // "can they prevent"), and the auxiliary itself carries the agreement
  // ("does he have" -> "DO they have"). Run before step 3 so it never sees
  // these and never pluralises a bare infinitive into nonsense.
  const AUX = new Map(Object.entries({
    does: 'do', "doesn't": "don't", is: 'are', was: 'were', has: 'have',
    // Already agreement-free — listed so the pronoun still flips.
    can: 'can', "can't": "can't", cannot: 'cannot', could: 'could', would: 'would',
    should: 'should', must: 'must', might: 'might', may: 'may', will: 'will',
    "won't": "won't", did: 'did', "didn't": "didn't", dare: 'dare', shall: 'shall',
    had: 'had', do: 'do',
  }));
  out = out.replace(/\b([A-Za-z']+)(\s+)he\b/gi, (whole, aux, sp) => {
    const to = AUX.get(aux.toLowerCase());
    return to ? `${match(aux, to)}${sp}they` : whole;
  });

  // 3. he <verb> — the agreement case.
  //
  // 🚨 TWO BUGS LIVED HERE AND ONLY READING THE OUTPUT FOUND THEM:
  //  (a) the regex was case-SENSITIVE, so every sentence starting "He …" fell
  //      through to a blunt "He " -> "They " swap that never touched the verb.
  //      That is where "They develops" and "They castles" came from.
  //  (b) it CAPTURED a trailing word and did not put it back, so "he can attack
  //      them later" became "they can them later" — a sentence that still reads
  //      like English and has lost its verb.
  // Both are silent in a diff you do not read, and both would have shipped
  // straight to a student's ear from a live transform.
  out = out.replace(/\b(he)(\s+)([A-Za-z'-]+)((\s+)([A-Za-z'-]+))?/gi, (whole, pron, sp1, w1, rest, sp2, w2) => {
    const they = match(pron, 'they');
    // An adverb may sit between the pronoun and its verb ("he simply doesn't").
    if (ADVERB.has(w1.toLowerCase()) && w2) {
      const pl = pluralise(w2);
      if (pl === null) { flagged.push(`${where}: "${whole}" — unrecognised verb after adverb`); return whole; }
      return `${they}${sp1}${w1}${sp2}${pl}`;
    }
    const pl = pluralise(w1);
    if (pl === null) { flagged.push(`${where}: "${whole}" — unrecognised verb form`); return whole; }
    // `rest` is put back verbatim. Dropping it is bug (b).
    return `${they}${sp1}${pl}${rest ?? ''}`;
  });

  // 3b. COMPOUND VERBS — found by READING the diff, not by a test.
  // "he recaptures and pins your knight" came out "they recapture and PINS",
  // because step 3 only ever pluralises the verb directly after the pronoun.
  // Five of them in 1,239 rewrites: consolidate/escapes, castle/puts,
  // take/trades, recapture/pins, recapture/piles. A sentence with one verb
  // fixed and one not still scans, which is why nothing else would catch it.
  out = out.replace(/\b(they)(\s+)([a-z']+)(\s+)(and|or|then)(\s+)([a-z']+)/gi, (whole, they, s1, v1, s2, conj, s3, v2) => {
    // Only when the FIRST verb is already plural — i.e. this is a compound we
    // just created. Otherwise leave it: "they tried and failed" is past tense
    // and correct, and a blanket rule would break it.
    if (/s$/.test(v1.toLowerCase()) && !/ss$/.test(v1.toLowerCase())) return whole;
    const pl = pluralise(v2);
    if (pl === null || pl === v2) return whole;
    return `${they}${s1}${v1}${s2}${conj}${s3}${pl}`;
  });

  return out;
}

// Imported for the transform alone (see `perspective.mjs`) — do not run the
// corpus scan in that case.
const IS_CLI = process.argv[1] && process.argv[1].endsWith('degender.mjs');
if (!IS_CLI) { /* module use: stop before the file walk */ }

// --demo: run the rules over real sentences and PRINT them. Reading the output
// is the only thing that catches "they takes"; a green run proves nothing.
if (process.argv.includes('--demo')) {
  const cases = [
    'He develops, and the knight to f3 attacks your pawn on e5.',
    "White's hypermodern idea is to tempt your pawns forward now so he can attack them later.",
    "He's blitzing his moves out, shuffling the same knight again and again in the opening.",
    'He plays g3.', 'He fianchettoes with the bishop to g2.', 'He castles.',
    'He answers with h4, but that only softens his kingside further.',
    "He simply doesn't have a plan here.",
    'He goes for it, and he has the bishop pair.',
    'He tries to hold, but he is already worse.',
    'He resigned after he pushed his passed pawn.',
    'He never saw it, and he lost his rook to the fork.',
  ];
  for (const c of cases) console.log('  ' + transform(c, 'demo'));
  console.log(`\n  flagged in demo: ${flagged.length}`);
  process.exit(0);
}

let files = 0, changed = 0, strings = 0;
for (const f of (IS_CLI ? readdirSync(SRC) : []).filter((n) => n.endsWith('.json'))) {
  const p = join(SRC, f);
  const raw = readFileSync(p, 'utf8');
  const doc = JSON.parse(raw);
  files += 1;

  // 🚨 ROUND-TRIP GUARD. The authored files are ONE-space indented; a writer
  // that re-serialises at two would reformat all 257 touched files and bury
  // 1,242 real changes in a diff nobody can read — which destroys the entire
  // reason for doing this offline instead of at the chokepoint. So prove the
  // serializer reproduces the file EXACTLY before trusting it to edit one.
  const indent = indentOf(raw);
  // Some authored files end with a newline and some do not. Adding one is a
  // one-byte change on every line of the diff tooling's mind — preserve it.
  const nl = raw.endsWith('\n');
  // DON'T GUESS THE ESCAPING CONVENTION — try both and keep the one that
  // reproduces the file byte-for-byte. A heuristic ("does it contain a \\u
  // escape?") got 8 files wrong where plain serialisation got 1; the
  // round-trip IS the test, so let it decide.
  const esc = [false, true].find((e) => serialise(JSON.parse(raw), indent, nl, e) === raw);
  if (esc === undefined) {
    console.error(`REFUSING: ${f} does not round-trip byte-identically — fix the serializer, do not reformat the corpus`);
    process.exitCode = 1;
    continue;
  }
  let touched = false;
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === 'string' && ['spoken', 'teaches', 'plans'].includes(k)) {
        if (!/\b(he|his|him|himself|he's|he'd|he'll)\b/i.test(v)) continue;
        const next = transform(v, `${f}:${k}`);
        if (next !== v) { node[k] = next; touched = true; strings += 1; }
      } else if (v && typeof v === 'object') walk(v);
    }
  };
  walk(doc);
  if (touched) {
    changed += 1;
    if (WRITE) writeFileSync(p, serialise(doc, indent, nl, esc));
  }
}

console.log(`${WRITE ? 'WROTE' : 'DRY RUN'} — ${files} files scanned, ${changed} changed, ${strings} strings rewritten`);
console.log(`flagged (left alone, need a human): ${flagged.length}`);
for (const f of flagged.slice(0, 40)) console.log('  ' + f);
if (flagged.length > 40) console.log(`  … and ${flagged.length - 40} more`);
