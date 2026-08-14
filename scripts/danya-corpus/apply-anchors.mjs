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
import { recoverPosition } from './recover-positions.mjs';

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

// Notes that ARRIVED with a position (`was > 0`) the anchor pass did not
// re-anchor. `was` is the prior lineSan LENGTH, not the line itself.
//
// 🚨 "NOT RE-ANCHORED" IS NOT "FALSE" (David 2026-08-14: "most of them were
// wrong because you were looking at them wrong"). anchor-notes rejects for ANY
// failure to re-anchor — including its requirement that the note's own moves
// play 2-deep from the candidate root — so this set bundles together notes that
// are false, notes that are unverifiable, and notes that are simply fine.
// Stripping all of them, which this script did on its first cut, DELETES
// CORRECT DATA: measured across the four shipped corpora, of 2,164 such notes
// only 1,077 are genuinely unplaceable, while 304 verify TRUE where they sit,
// 657 make no checkable claim at all, and 124 are recoverable a few plies on.
//
// So each one is re-judged individually against the board (`recoverPosition`,
// pure chess.js) and only the genuinely unplaceable lose their position.
const notReanchored = new Set(
  report.results.filter((r) => r.was > 0 && r.outcome !== 'anchored').map((r) => r.id),
);

let applied = 0;
let already = 0;
let conflicting = 0;
let stripped = 0;
let recovered = 0;
let keptTrue = 0;
let keptUnverifiable = 0;
for (const n of corpus.notes) {
  const a = anchors.get(n.id);
  if (!a) {
    if (n.lineSan.length > 0 && notReanchored.has(n.id)) {
      const prose = [n.explains, n.teaches, n.plans].filter(Boolean).join(' ');
      const res = recoverPosition(n.lineSan, prose);
      if (res.outcome === 'recovered') {
        n.lineSan = res.lineSan;          // mis-filed by a few plies — walk it forward
        recovered += 1;
      } else if (res.outcome === 'already-true') {
        keptTrue += 1;                     // its claims hold right here; nothing to fix
      } else if (res.outcome === 'unrecoverable') {
        n.lineSan = [];                    // claims false here and no walk makes them true
        stripped += 1;
      } else {
        keptUnverifiable += 1;             // no claim to check — no basis to strip it
      }
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
console.log(`[apply-anchors] recovered: ${recovered} mis-filed position${recovered === 1 ? '' : 's'} walked forward to the moment the note describes`);
console.log(`[apply-anchors] kept: ${keptTrue} verify TRUE where filed, ${keptUnverifiable} make no checkable claim`);
console.log(`[apply-anchors] stripped: ${stripped} genuinely unplaceable (note kept, falls back to opening/concept keying)`);
console.log(`[apply-anchors] corpus positioned notes now: ${positioned} / ${corpus.notes.length}`);
