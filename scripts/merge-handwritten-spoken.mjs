#!/usr/bin/env node
/**
 * merge-handwritten-spoken — put the HAND-WRITTEN spoken forms into the bake.
 *
 * David 2026-08-15: "I'm willing to spend your context on better hand written
 * notes. But you need to guarantee me that you can get them to fire when they
 * are supposed to!!!"
 *
 * The guarantee has two halves and this script is the second one.
 *
 *   MEASURE — `selectedNotes.report.test.ts` names the note ids that are
 *   actually SELECTED on the lines we teach. Wording has no effect on
 *   selection, so writing prose for a note that is never chosen is wasted
 *   motion; the write list comes from the measurement, never from a hunch.
 *
 *   MERGE — a hand-written form only reaches a student through
 *   `public/data/corpus-spoken.json`, which `spokenBeatText` serves verbatim
 *   ("THE BAKE WINS"). That file is 13 MB of machine output, so the
 *   hand-written entries live apart, in `src/data/corpus-spoken-handwritten.json`,
 *   where they can be read and reviewed — and this merges them in.
 *
 * HAND-WRITTEN WINS. When an id exists in both, the hand-written form replaces
 * the baked one; the bake script only ever fills gaps, so nothing here is
 * undone by a later bake run.
 *
 * Every entry is run through the REAL `gateSpoken` before it is merged — the
 * same gate the model's output has to pass, imported rather than copied. A
 * rejection is a hard stop: the file is not written, so the bake can never
 * carry an entry the gate would refuse.
 *
 *   node scripts/merge-handwritten-spoken.mjs [--check]
 *
 * `--check` validates and reports without writing (what CI wants).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gateSpoken } from './bake-spoken-notes.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HAND = resolve(ROOT, 'src/data/corpus-spoken-handwritten.json');
const BAKE = resolve(ROOT, 'public/data/corpus-spoken.json');

const CORPORA = JSON.parse(
  readFileSync(resolve(ROOT, 'src/data/corpora.json'), 'utf8'),
).corpora.map((c) => c.path);

/** id → { explains, kind } for every note in every declared corpus. */
export function corpusSources() {
  const out = new Map();
  for (const rel of CORPORA) {
    const raw = JSON.parse(readFileSync(resolve(ROOT, rel), 'utf8'));
    for (const n of Array.isArray(raw) ? raw : raw.notes ?? []) {
      if (!n?.id) continue;
      out.set(n.id, {
        explains: (n.explains ?? '').trim(),
        kind: n.lineSan?.length ? 'anchored' : 'floating',
      });
    }
  }
  return out;
}

/** Returns the rejections. Empty array = every hand-written form is clean. */
export function validateHandwritten(hand, sources) {
  const bad = [];
  for (const [id, entry] of Object.entries(hand)) {
    const src = sources.get(id);
    if (!src) { bad.push(`${id}: no such note in any declared corpus`); continue; }
    // DELIBERATE SILENCE is a legitimate hand-written verdict, and the most
    // honest one for a note whose prose teaches an opening other than the one
    // it is filed under — measured, not guessed: `dt-1ee` is anchored in the
    // Open Sicilian and explains the Grünfeld. Empty beats generic beats
    // invented; a rewrite would only launder the misfile.
    if (entry?.unspeakable) {
      if (entry.spoken) bad.push(`${id}: both spoken and unspeakable`);
      continue;
    }
    if (!entry?.spoken?.trim()) { bad.push(`${id}: empty spoken`); continue; }
    // The note's OWN kind decides which rules apply — never the file's claim
    // about itself, or a floating note could be admitted under anchored rules
    // and speak a foreign game's squares.
    if (entry.kind && entry.kind !== src.kind) {
      bad.push(`${id}: declared ${entry.kind}, corpus says ${src.kind}`);
      continue;
    }
    const reason = gateSpoken(src.explains, entry.spoken, src.kind);
    if (reason) bad.push(`${id}: ${reason}`);
  }
  return bad;
}

function main() {
  const check = process.argv.includes('--check');
  const hand = JSON.parse(readFileSync(HAND, 'utf8'));
  const sources = corpusSources();
  const bad = validateHandwritten(hand, sources);

  if (bad.length > 0) {
    console.error(`[handwritten] ${bad.length} rejected:`);
    for (const b of bad) console.error(`   ${b}`);
    process.exit(1);
  }

  const bake = JSON.parse(readFileSync(BAKE, 'utf8'));
  let replaced = 0;
  let added = 0;
  for (const [id, entry] of Object.entries(hand)) {
    const already = bake[id];
    const next = entry.unspeakable
      ? { unspeakable: entry.unspeakable, hand: true }
      : { spoken: entry.spoken, kind: sources.get(id).kind, hand: true };
    if (already?.spoken === next.spoken && already?.unspeakable === next.unspeakable) continue;
    if (already) replaced += 1; else added += 1;
    bake[id] = next;
  }

  console.log(`[handwritten] ${Object.keys(hand).length} entries clean · ${added} new · ${replaced} replacing a baked line`);
  if (check) return;
  writeFileSync(BAKE, JSON.stringify(bake));
  console.log(`[handwritten] merged into ${BAKE}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
