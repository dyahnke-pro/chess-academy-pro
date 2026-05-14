#!/usr/bin/env node
/**
 * scripts/verify-pro-suffix-bases.mjs
 *
 * Reads PRO_SUFFIX_TO_BASE from annotationService.ts and confirms
 * every base value resolves to a real `*.json` file in
 * src/data/annotations/. Catches orphan-rename drift where the
 * resolver still points at filenames the rename pass deleted.
 *
 * Exit 1 + report mismatches when any base is missing.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');
const ANNOTATIONS_DIR = join(REPO, 'src/data/annotations');
const SERVICE_PATH = join(REPO, 'src/services/annotationService.ts');

const src = readFileSync(SERVICE_PATH, 'utf8');

function parseSuffixToBase() {
  const start = src.indexOf('PRO_SUFFIX_TO_BASE');
  const open = src.indexOf('{', start);
  const close = src.indexOf('};', open);
  const body = src.slice(open + 1, close);
  const out = {};
  for (const m of body.matchAll(/'([^']+)':\s*'([^']+)'/g)) {
    out[m[1]] = m[2];
  }
  return out;
}

function parseNameAliases() {
  // Optional cross-check; not all aliases point at annotation files.
  const start = src.indexOf('PRO_ID_TO_SUBLINE');
  if (start < 0) return {};
  const open = src.indexOf('{', start);
  const close = src.indexOf('};', open);
  const body = src.slice(open + 1, close);
  const out = {};
  for (const m of body.matchAll(/'([^']+)':\s*'([^']+)'/g)) {
    out[m[1]] = m[2];
  }
  return out;
}

const PRO_SUFFIX_TO_BASE = parseSuffixToBase();
const broken = [];
for (const [suffix, base] of Object.entries(PRO_SUFFIX_TO_BASE)) {
  const path = join(ANNOTATIONS_DIR, `${base}.json`);
  if (!existsSync(path)) {
    broken.push({ suffix, base });
  }
}

if (broken.length === 0) {
  console.log(`PRO_SUFFIX_TO_BASE: ${Object.keys(PRO_SUFFIX_TO_BASE).length} aliases, all targets exist.`);
  process.exit(0);
} else {
  console.error(`PRO_SUFFIX_TO_BASE: ${broken.length} broken aliases pointing at missing files:`);
  for (const { suffix, base } of broken) {
    console.error(`  '${suffix}' → '${base}.json'  (file missing)`);
  }
  process.exit(1);
}
