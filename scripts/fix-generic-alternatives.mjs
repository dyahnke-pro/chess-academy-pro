#!/usr/bin/env node
/**
 * Strips generic-stub alternative entries from annotation files.
 * Per CLAUDE.md narration rule 1 (concrete over generic) — generic
 * alternative entries violate the rule and get spoken by voice in
 * PracticeMode / DrillMode ("Other options: Other pawn moves were
 * available, but..."), confusing the student.
 *
 * Removes entries matching any of these template stems:
 *  - "Other pawn moves were available, but..."
 *  - "A different knight move was possible..."
 *  - "The bishop could go to other squares..."
 *  - "White had other options here, but..."
 *  - "Black had other options here, but..."
 *  - "A different bishop move was possible..."
 *  - "A different rook move was possible..."
 *  - other variations of the same template family
 *
 * If an annotation's alternatives array becomes empty after
 * filtering, the array is removed entirely so the "alternatives"
 * UI section doesn't render.
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const DIR = 'src/data/annotations';

const STUB_PATTERNS = [
  /^Other (?:pawn|knight|bishop|rook|queen|king|piece) moves? (?:were|was) available/i,
  /^A different (?:pawn|knight|bishop|rook|queen) move was possible/i,
  /^The (?:pawn|knight|bishop|rook|queen|king) could go to other/i,
  /^(?:White|Black) had other options here/i,
  /^Other (?:moves|options) (?:were|are) available here/i,
  /^The (?:pawn|knight|bishop|rook|queen) had other (?:moves|options|squares)/i,
  /^Other (?:legal|reasonable) moves (?:were|are) possible/i,
];

function isGenericAlternative(text) {
  if (!text || typeof text !== 'string') return false;
  return STUB_PATTERNS.some((rx) => rx.test(text.trim()));
}

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
      if (!Array.isArray(a.alternatives)) continue;
      const before = a.alternatives.length;
      a.alternatives = a.alternatives.filter((alt) => !isGenericAlternative(alt));
      const removed = before - a.alternatives.length;
      if (removed > 0) {
        edits += removed;
        if (a.alternatives.length === 0) delete a.alternatives;
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

console.log(`removed ${totalRemoved} generic-stub alternative entries from ${filesEdited} files`);
