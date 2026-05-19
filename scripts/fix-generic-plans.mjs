#!/usr/bin/env node
/**
 * Strips generic-stub `plans[]` entries from annotation files.
 * 7197 out of 7934 plans entries (90%) are identical LLM fallback
 * filler with 11 distinct phrases. PracticeMode and DrillMode pipe
 * them into voice as "Plans: <plan1>, <plan2>" — generic vocal
 * filler that violates CLAUDE.md narration rule 1.
 *
 * If a plans array becomes empty after filtering, the array is
 * removed entirely.
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const DIR = 'src/data/annotations';

const STUB_PHRASES = new Set([
  'Complete piece development and prepare castling',
  'Fight for central control with pawns and pieces',
  'Convert the positional advantages into concrete gains',
  'Coordinate pieces for maximum effectiveness in the coming exchanges',
  'Improve piece placement and prepare the middlegame plan',
  'Look for pawn breaks to open lines for the active pieces',
  "Look for tactical opportunities to exploit the opponent's inaccuracy",
  'Maintain piece pressure while avoiding counter-tactics',
  "Be alert to the opponent's active ideas in this position",
  'Maintain solid piece coordination to neutralize threats',
  'Continue developing and improving piece placement',
  'Look for tactical opportunities',
]);

let totalRemoved = 0;
let filesEdited = 0;

const files = await readdir(DIR);
for (const fname of files) {
  if (!fname.endsWith('.json')) continue;
  const path = join(DIR, fname);
  const doc = JSON.parse(await readFile(path, 'utf-8'));
  let edits = 0;
  function clean(arr) {
    for (const a of arr || []) {
      if (!Array.isArray(a.plans)) continue;
      const before = a.plans.length;
      a.plans = a.plans.filter((p) => !STUB_PHRASES.has((p || '').trim()));
      const removed = before - a.plans.length;
      if (removed > 0) {
        edits += removed;
        if (a.plans.length === 0) delete a.plans;
      }
    }
  }
  clean(doc.moveAnnotations);
  for (const s of doc.subLines || []) clean(s.moveAnnotations);
  if (edits > 0) {
    await writeFile(path, JSON.stringify(doc, null, 2) + '\n');
    filesEdited++;
    totalRemoved += edits;
  }
}
console.log(`removed ${totalRemoved} generic-stub plans from ${filesEdited} files`);
