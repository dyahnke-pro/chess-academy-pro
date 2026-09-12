#!/usr/bin/env node
// Apply the corpus trim AT THE SOURCE (David 2026-09-12: "Confident only then
// you go in personally and determine the rest in a second pass").
//
// WHY THE SOURCE AND NOT THE SHIPPED FILE. `voiced-walkthroughs.json`,
// `voiced-teachings.json` and `voiced-matchups.json` are all DERIVED from
// `data/video-narration-voiced/*.json` by their build scripts. Trimming a
// derived file means the next rebuild quietly reinstates every cut — the edit
// would look applied, pass review, and undo itself the first time anyone
// regenerates. So the cut lands on `spoken` in the source and the derived files
// are rebuilt from it.
//
// CONFIDENT CLASSES ONLY. `fragment` is held back for a hand pass: it is a
// class defined by ABSENCE (no square, no piece, no chess idea) and it takes
// real coaching along with the filler — "Patience turns into a free move" and
// "Very well played by my opponent" are indistinguishable to it.
//
//   node scripts/corpus-sweep/apply.mjs            # dry run, writes nothing
//   node scripts/corpus-sweep/apply.mjs --write    # apply, then rebuild derived
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { trimPassage, CONFIDENT_CUT_CLASSES, toClauses, classifyClause } from '../../src/services/narrationQuality.shared.mjs';

const SRC = 'data/video-narration-voiced';
const WRITE = process.argv.includes('--write');

const stats = { files: 0, beats: 0, unchanged: 0, trimmed: 0, silenced: 0, before: 0, after: 0 };
const byClass = {};
const samples = [];
const touched = [];

for (const file of readdirSync(SRC).filter((f) => f.endsWith('.json'))) {
  const path = `${SRC}/${file}`;
  const raw = readFileSync(path, 'utf8');
  const doc = JSON.parse(raw);
  // PRESERVE THE FILE'S OWN FORMATTING. Writing back with a hard-coded indent
  // reformatted 118 files wholesale — a 48,000-line diff for a 0.56% text
  // change, unreviewable and hiding what actually changed. This corpus is
  // written with a single-space indent; detect it rather than assume.
  const indentMatch = /\n( +)"/.exec(raw);
  const indent = indentMatch ? indentMatch[1].length : 1;
  const trailingNewline = raw.endsWith('\n') ? '\n' : '';
  const moves = doc.moves ?? [];
  let changed = false;

  for (const beat of moves) {
    const original = (beat.spoken ?? '').trim();
    if (!original) continue;
    stats.beats += 1;
    stats.before += original.length;

    // Record WHICH class took each removed clause, so the report and the edit
    // can never disagree about what was cut or why.
    for (const clause of toClauses(original)) {
      const r = classifyClause(clause);
      if (r.disposition === 'cut' && CONFIDENT_CUT_CLASSES.includes(r.class)) {
        byClass[r.class] = (byClass[r.class] ?? 0) + 1;
      }
    }

    const trimmed = trimPassage(original);
    stats.after += trimmed.length;

    if (trimmed === original) { stats.unchanged += 1; continue; }
    changed = true;
    if (!trimmed) stats.silenced += 1; else stats.trimmed += 1;
    if (samples.length < 12 && trimmed && original.length < 300) {
      samples.push({ file: doc.videoId ?? file, before: original, after: trimmed });
    }
    beat.spoken = trimmed;
  }

  stats.files += 1;
  if (changed) {
    touched.push(file);
    if (WRITE) writeFileSync(path, JSON.stringify(doc, null, indent) + trailingNewline);
  }
}

console.log(`${WRITE ? 'APPLIED' : 'DRY RUN — nothing written'}`);
console.log(`source files      : ${stats.files}  (${touched.length} would change)`);
console.log(`spoken beats      : ${stats.beats}`);
console.log(`  unchanged       : ${stats.unchanged} (${((100 * stats.unchanged) / stats.beats).toFixed(1)}%)`);
console.log(`  trimmed         : ${stats.trimmed}`);
console.log(`  silenced        : ${stats.silenced}`);
console.log(`characters        : ${stats.before} -> ${stats.after}  (-${((100 * (stats.before - stats.after)) / stats.before).toFixed(2)}%)`);
console.log(`clauses cut by class:`, byClass);
console.log('\n── sample edits ──');
for (const s of samples) {
  console.log(`\n[${s.file}]`);
  console.log(`  BEFORE: ${s.before}`);
  console.log(`  AFTER : ${s.after}`);
}
if (WRITE) {
  console.log('\nNow rebuild the derived files:');
  console.log('  node scripts/build-voiced-walkthroughs.mjs');
  console.log('  node scripts/build-voiced-teachings.mjs');
  console.log('  node scripts/build-voiced-matchups.mjs');
}
