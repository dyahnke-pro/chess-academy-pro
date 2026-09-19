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
]);

/** An adverb may sit between the pronoun and its verb ("he simply doesn't"). */
const ADVERB = new Set([
  'simply', 'just', 'also', 'already', 'then', 'now', 'quickly', 'immediately',
  'usually', 'often', 'never', 'always', 'still', 'probably', 'actually',
  'really', 'finally', 'instead', 'again', 'happily', 'clearly', 'obviously',
  'basically', 'literally', 'certainly', 'definitely', 'quietly', 'calmly',
  'only', 'even', 'rarely', 'sometimes', 'eventually', 'promptly', 'duly',
]);

/** 3rd-person-singular -> plural, for a regular verb. */
function pluralise(v) {
  const lower = v.toLowerCase();
  if (IRREGULAR.has(lower)) return match(v, IRREGULAR.get(lower));
  if (NO_CHANGE.has(lower)) return v;
  // PAST TENSE NEEDS NO AGREEMENT: "he resigned" -> "they resigned". The first
  // cut flagged every one of these as an unrecognised verb, which is how a
  // refuse-rather-than-guess rule turns into a pile of false work.
  if (/ed$/.test(lower)) return v;
  if (!/s$/.test(lower) || /ss$/.test(lower)) return null;   // not a -s verb: refuse
  if (/ies$/.test(lower)) return match(v, lower.slice(0, -3) + 'y');
  if (/(ch|sh|x|z|s|o)es$/.test(lower)) return match(v, lower.slice(0, -2));
  return match(v, lower.slice(0, -1));
}

/** Keep the original capitalisation of a replaced word. */
function match(original, replacement) {
  return /^[A-Z]/.test(original)
    ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
    : replacement;
}

const flagged = [];

function transform(text, where) {
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
    flagged.push(`${where}: "${whole}" — is/has is ambiguous, left alone`);
    return whole;
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
  out = out.replace(/\b(he)(\s+)([A-Za-z']+)((\s+)([A-Za-z']+))?/gi, (whole, pron, sp1, w1, rest, sp2, w2) => {
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

  return out;
}

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
for (const f of readdirSync(SRC).filter((n) => n.endsWith('.json'))) {
  const p = join(SRC, f);
  const raw = readFileSync(p, 'utf8');
  const doc = JSON.parse(raw);
  files += 1;
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
    if (WRITE) writeFileSync(p, `${JSON.stringify(doc, null, 2)}\n`);
  }
}

console.log(`${WRITE ? 'WROTE' : 'DRY RUN'} — ${files} files scanned, ${changed} changed, ${strings} strings rewritten`);
console.log(`flagged (left alone, need a human): ${flagged.length}`);
for (const f of flagged.slice(0, 40)) console.log('  ' + f);
if (flagged.length > 40) console.log(`  … and ${flagged.length - 40} more`);
