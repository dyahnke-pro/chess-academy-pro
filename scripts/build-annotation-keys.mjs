#!/usr/bin/env node
// Regenerate src/data/annotationKeys.json — the list of legacy auto-annotation
// files in src/data/annotations/ (David 2026-09-26, app-size plan).
//
// The annotations used to be reached through `import.meta.glob('./*.json')`,
// which compiled every file into its own JS chunk: 1,889 chunks, 17 MB inside
// the iOS app. They are now copied to `/data/annotations/` at build time
// (vite.config.ts) and fetched per opening on demand through dataFile.ts, so
// the resolver needs the set of keys without importing the files. Run this
// after adding or removing an annotation file; annotationKeys.test.ts fails
// until you do.
import { readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'src/data/annotations');
const keys = readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.slice(0, -'.json'.length))
  .sort();
writeFileSync(join(ROOT, 'src/data/annotationKeys.json'), `${JSON.stringify(keys, null, 0)}\n`);
console.log(`[annotation-keys] ${keys.length} keys`);
