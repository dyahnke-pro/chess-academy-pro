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
 *
 * STRIPPING IS THE OTHER HALF OF THE JOB (2026-08-14). Applying verified
 * anchors was only ever half of it: a note can ALSO ship a position the
 * aligner guessed and the anchor pass then DISPROVED. Those were left
 * untouched, so the corpus kept a position that board-truth had already
 * rejected — and because they are position-keyed, `noteAtPosition` can select
 * them for that exact FEN and hand them to the model as authoritative facts
 * about that board. Measured on the first Hikaru farm: 23 notes keyed to the
 * 9-ply London position `d4 Nf6 Nf3 g6 Bf4 Bg7 e3 d6 Bd3`, whose prose talks
 * about "the knight on f4" (it is a BISHOP), "the knight on g4" (g4 is EMPTY),
 * and opens with a Bd6 that is not even legal there. That is precisely the
 * "Bg5 pins the knight to the queen" failure CLAUDE.md was written around,
 * manufactured at farm scale.
 *
 * So: a prior position that FAILED re-verification is REMOVED, not kept. The
 * note itself survives — it falls back to opening-name / concept keying (the
 * advisory gap tier), which is exactly what the fail-closed design intends.
 * Empty beats invented. Nothing here deletes teaching; it only refuses to
 * assert WHERE that teaching applies when the board says otherwise.
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

// Notes that ARRIVED with a position (`was > 0`) which the anchor pass could
// not re-verify. `was` is the prior lineSan LENGTH, not the line itself.
const disproven = new Set(
  report.results.filter((r) => r.was > 0 && r.outcome !== 'anchored').map((r) => r.id),
);

let applied = 0;
let already = 0;
let conflicting = 0;
let stripped = 0;
for (const n of corpus.notes) {
  const a = anchors.get(n.id);
  if (!a) {
    // No verified anchor. If the position it already carries was DISPROVEN,
    // drop it rather than ship a board claim the anchor pass rejected.
    if (n.lineSan.length > 0 && disproven.has(n.id)) {
      n.lineSan = [];
      stripped += 1;
    }
    continue;
  }
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
console.log(`[apply-anchors] stripped: ${stripped} disproven position${stripped === 1 ? '' : 's'} (note kept, falls back to opening/concept keying)`);
console.log(`[apply-anchors] corpus positioned notes now: ${positioned} / ${corpus.notes.length}`);
