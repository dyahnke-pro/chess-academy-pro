#!/usr/bin/env node
/**
 * apply-anchors — write Stage-1 HIGH-confidence anchors back into the shipped
 * corpus (src/data/danya-teachings.json).
 *
 * Why: the deterministic delivery paths key on EXACT position — noteAtPosition
 * (fact packages, walkthrough splice) and notesForFen. Only notes with a
 * lineSan can ever fire there. The v2 distiller deliberately fails closed on
 * positioning, so its notes ship opening-keyed; anchor-notes.mjs recovers
 * positions from each note's own prose under a board-truth gate. This script
 * applies ONLY the `high` tier (contiguous replay of the note's own moves plus
 * a verified claim, or a long replay) — medium stays advisory-only.
 *
 * Run AFTER anchor-notes.mjs against the same corpus revision. Idempotent.
 * The corpus gates (danyaTeachings.test.ts) re-verify legality downstream.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolveCreator } from './creator.mjs';

const CORPUS = resolveCreator().corpus;
const REPORT = `${resolveCreator().anchorDir}/report.json`;

const corpus = JSON.parse(await readFile(CORPUS, 'utf8'));
const report = JSON.parse(await readFile(REPORT, 'utf8'));

const anchors = new Map();
for (const r of report.results) {
  if (r.outcome === 'anchored' && r.tier === 'high' && Array.isArray(r.lineSan) && r.lineSan.length > 0) {
    anchors.set(r.id, r);
  }
}

let applied = 0;
let already = 0;
let conflicting = 0;
for (const n of corpus.notes) {
  const a = anchors.get(n.id);
  if (!a) continue;
  if (n.lineSan.length > 0) {
    // The note already ships a position (the fail-closed aligner's). The
    // anchor was verified against board truth; the aligner position wasn't
    // claim-checked. When they differ, the verified one wins.
    if (n.lineSan.join(' ') === a.lineSan.join(' ')) { already += 1; continue; }
    conflicting += 1;
  }
  n.lineSan = a.lineSan;
  applied += 1;
}

corpus.generatedAt = new Date().toISOString();
await writeFile(CORPUS, JSON.stringify(corpus, null, 1));

const positioned = corpus.notes.filter((n) => n.lineSan.length > 0).length;
console.log(`[apply-anchors] high anchors in report: ${anchors.size}`);
console.log(`[apply-anchors] applied: ${applied} (${conflicting} replaced an unverified aligner position; ${already} already matched)`);
console.log(`[apply-anchors] corpus positioned notes now: ${positioned} / ${corpus.notes.length}`);
