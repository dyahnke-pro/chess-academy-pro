#!/usr/bin/env node
/**
 * degender-lesson-beats — C15b. The opponent is THEY, never HE, in authored
 * lesson beats too.
 *
 * WHY THIS EXISTS. `perspectiveVoice.test.ts` has two arms. The JSON arm scans
 * shipped narration files for a gendered pronoun standing for a COLOUR and
 * holds a shrink-only ceiling. The LESSON-BEAT arm scans only for we/our/us —
 * `GENDERED` was never applied to a single authored beat. Measured 2026-09-21:
 * **243 sentences across 122 lessons**, out of 3,664 beat fields.
 *
 * WHY IT REUSES `degender.mjs` RATHER THAN GREPPING FOR /he|his/. Two reasons,
 * both learned the expensive way in this repo:
 *
 *  1. THE DISCRIMINATOR ALREADY EXISTS AND IS SUBTLER THAN A GREP.
 *     `curatedBeatSource.beatRegister` calls a beat `spectator` when a gendered
 *     pronoun appears in a SENTENCE THAT ALSO NAMES A COLOUR — sentence-scoped
 *     on purpose, so a historical aside ("Fischer and his 1972 match") is not
 *     swept up with "…and HE takes away Black's pin". A fresh grep would
 *     re-derive that worse and would "fix" prose that is already correct. This
 *     script uses the same rule, and only rewrites the offending SENTENCE.
 *  2. THE AGREEMENT IS THE HARD PART. "he takes" → "they takes" is broken
 *     English. `degender.mjs` already pluralises verbs, knows the irregulars,
 *     and — crucially — REFUSES rather than guesses on the genuinely ambiguous
 *     "he's X" (IS vs HAS pluralise differently and both read fine). Writing a
 *     second transform would mean two answers to one question drifting apart.
 *
 * WHY OFFLINE AND NOT AT THE CHOKEPOINT: a live rewrite ships its failures
 * straight to a student's ears with nobody having read them. This edits the
 * AUTHORED source so every change lands in a diff and the board-truth,
 * register and perspective gates all run on it.
 *
 * SAFETY: every literal is decoded, transformed and re-encoded, and a
 * ROUND-TRIP GUARD proves the encoder reproduces the ORIGINAL byte-for-byte
 * before it is trusted to write a changed one. A literal that does not
 * round-trip is REFUSED and reported, never reformatted.
 *
 * Usage:  node scripts/degender-lesson-beats.mjs [--write]
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { transform, flagged } from './voiced-authoring/degender.mjs';

const DIR = 'src/data/lessons';
const WRITE = process.argv.includes('--write');

/** The `beatRegister` discriminator, verbatim in spirit: a gendered pronoun
 *  STANDING FOR A COLOUR. Both must be in the SAME sentence. */
const COLOUR = /\b(White|Black)\b/;
const GENDERED = /\b(he|he's|he'd|he'll|him|his|himself)\b/i;
/** She/her are in the gate's regex but mean the QUEEN in this corpus ("the
 *  queen leaps to h4, she defies it"), which is ordinary chess prose and not a
 *  player pronoun. Left alone deliberately; reported so the count is honest. */
const FEMININE = /\b(she|she's|her|hers|herself)\b/i;
/** A capitalised word that is a PERSON's name rather than a colour, a sentence
 *  opener or a piece. Used only by pass 2 — see the note there. */
const PROPER_NOUN = /(?<!^)(?<![.!?]\s)\b(?!White|Black|The|A|An|And|But|So|If|Now|Then|You|Your|It|This|That|Here|When|After|Before|Once|Every|His|He|Both|One|Two|Three)[A-Z][a-z]{3,}\b/;

const splitSentences = (s) => s.split(/(?<=[.!?])(\s+)/);

/** Decode a TS string literal body to its value. */
function decode(body, quote) {
  return JSON.parse(quote === '"' ? `"${body}"` : `"${body.replace(/\\'/g, "'").replace(/"/g, '\\"')}"`);
}
/** Encode a value back into a literal body using the SAME quote character. */
function encode(value, quote) {
  const json = JSON.stringify(value).slice(1, -1);
  return quote === '"' ? json : json.replace(/\\"/g, '"').replace(/'/g, "\\'");
}

let files = 0, changed = 0, sentences = 0, skippedFeminine = 0, refused = 0, skippedNamed = 0;
const refusals = [];

for (const name of readdirSync(DIR).filter((n) => n.endsWith('.ts') && !n.endsWith('.test.ts'))) {
  const path = join(DIR, name);
  const raw = readFileSync(path, 'utf8');
  files += 1;
  let touched = false;

  const out = raw.replace(
    /\b(say|sayShort)(\s*:\s*)(["'])((?:\\.|(?!\3)[^\\])*)\3/g,
    (whole, key, sep, quote, body) => {
      let value;
      try { value = decode(body, quote); } catch { refused += 1; refusals.push(`${name}: undecodable ${key}`); return whole; }
      // ROUND-TRIP GUARD — prove the encoder reproduces THIS literal exactly
      // before trusting it to write a changed one.
      if (encode(value, quote) !== body) {
        refused += 1;
        refusals.push(`${name}: ${key} does not round-trip — left alone`);
        return whole;
      }
      if (!GENDERED.test(value) || !COLOUR.test(value)) return whole;

      const parts = splitSentences(value);
      let localChanged = false;
      for (let i = 0; i < parts.length; i += 1) {
        const sentence = parts[i];
        if (!COLOUR.test(sentence) || !GENDERED.test(sentence)) continue;
        if (FEMININE.test(sentence)) { skippedFeminine += 1; continue; }
        const next = transform(sentence, `${name}:${key}`);
        if (next !== sentence) { parts[i] = next; localChanged = true; sentences += 1; }
      }
      // ── PASS 2 — DON'T LEAVE A BEAT SPEAKING BOTH WAYS AT ONCE ──────────
      //
      // Found by READING the pass-1 output, which is the only thing that would
      // have: "…that's fine, let THEM. Every second it costs HIM, you've spent
      // placing a piece on a natural square." One spoken paragraph, two
      // pronouns for one player. Measured across the corpus: 85 beats came out
      // mixed — 8.8% of those touched, and they read WORSE than before the fix.
      //
      // The sentence scope is right for CLASSIFYING a beat (`beatRegister`
      // must not call a whole lesson spectator over one aside) and wrong for
      // REWRITING one. So once a beat has been established as talking about a
      // COLOUR in gendered terms, the rest of its player pronouns follow.
      //
      // THE GUARD IS A PROPER NOUN, because that is the case the sentence
      // scope was protecting: "Bobby Fischer … HE wrote a famous article",
      // "Wilhelm Steinitz HIMSELF … walked HIS king", "Réti, who used it to
      // hand Capablanca HIS first loss". Those are correct English about real
      // people and must never become "they". Measured: 9 such sentences, all
      // genuinely named people; 88 with no name, all genuinely the opponent.
      // A handful of false positives stay gendered (a sentence naming an
      // OPENING — "The King's Indian race … throw everything at his king"),
      // which leaves them exactly as they are today. Conservative where
      // unsure, per the standing rule: skip rather than guess.
      if (localChanged || (COLOUR.test(value) && /\b(they|their|them)\b/i.test(value) && GENDERED.test(value))) {
        for (let i = 0; i < parts.length; i += 1) {
          const sentence = parts[i];
          if (!GENDERED.test(sentence) || FEMININE.test(sentence)) continue;
          if (PROPER_NOUN.test(sentence)) { skippedNamed += 1; continue; }
          const next = transform(sentence, `${name}:${key}(pass2)`);
          if (next !== sentence) { parts[i] = next; localChanged = true; sentences += 1; }
        }
      }

      if (!localChanged) return whole;
      touched = true;
      return `${key}${sep}${quote}${encode(parts.join(''), quote)}${quote}`;
    },
  );

  if (touched) {
    changed += 1;
    if (WRITE) writeFileSync(path, out);
  }
}

console.log(`${WRITE ? 'WROTE' : 'DRY RUN'} — ${files} lesson files scanned, ${changed} changed, ${sentences} sentences rewritten`);
console.log(`left alone: ${skippedFeminine} feminine (the QUEEN, not a player), ${skippedNamed} naming a real person, ${refused} refused by the round-trip guard`);
for (const r of refusals.slice(0, 20)) console.log('  ' + r);
console.log(`flagged by the transform (ambiguous, need a human): ${flagged.length}`);
for (const f of flagged.slice(0, 25)) console.log('  ' + f);
if (flagged.length > 25) console.log(`  … and ${flagged.length - 25} more`);
