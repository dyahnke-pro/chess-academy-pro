#!/usr/bin/env node
/**
 * Applies haiku-annotation-enrichments.json cached annotations back
 * into source files, replacing the stub-template text.
 *
 * Idempotent: only writes when the current annotation still matches
 * one of the stub patterns. Preserves shortNarration / pawnStructure
 * / plans / alternatives / arrows / highlights as-is.
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const DIR = 'src/data/annotations';
const CACHE_PATH = 'docs/audit-runs/2026-05-19-content-scan/haiku-annotation-enrichments.json';

const STUB_PATTERNS = [
  /this capture changes the character of the position\.\s*Be alert/i,
  /Continuing\s+[A-Z][\w\s'-]+:\s+[A-Za-z][\w+#=!?-]*\s+is a known theory move in this line/i,
  /Central pawns control space and restrict the opponent['']s piece activity/i,
  /This is the natural continuation that leads into the warning line/i,
  /This sequence leads to the dangerous line/i,
  /^The position looks normal so far/i,
  /This is a critical moment in the trap/i,
  /The position looks safe, but danger lurks/i,
  /Remember this pattern\s*[—–-]\s*your opponents will fall/i,
  /This is the position you must avoid/i,
];

const isStub = (s) => typeof s === 'string' && STUB_PATTERNS.some((rx) => rx.test(s));

const cache = JSON.parse(await readFile(CACHE_PATH, 'utf-8'));
console.log(`cached entries: ${Object.keys(cache.entries).length}`);

const files = await readdir(DIR);
let replaced = 0;
let filesEdited = 0;
for (const fname of files) {
  if (!fname.endsWith('.json')) continue;
  const fpath = join(DIR, fname);
  const doc = JSON.parse(await readFile(fpath, 'utf-8'));
  let edits = 0;
  function processSubline(arr, sublineName) {
    if (!Array.isArray(arr)) return;
    for (let i = 0; i < arr.length; i++) {
      const key = `${fname}::${sublineName}::${i}`;
      const cached = cache.entries[key];
      if (!cached || !cached.annotation) continue;
      const a = arr[i];
      if (!isStub(a.annotation)) continue;
      a.annotation = cached.annotation;
      replaced++;
      edits++;
    }
  }
  processSubline(doc.moveAnnotations, '__main__');
  for (const s of doc.subLines || []) processSubline(s.moveAnnotations, s.name);
  if (edits > 0) {
    await writeFile(fpath, JSON.stringify(doc, null, 2) + '\n');
    filesEdited++;
  }
}
console.log(`replaced ${replaced} annotation entries in ${filesEdited} files`);
