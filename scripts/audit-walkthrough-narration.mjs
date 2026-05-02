#!/usr/bin/env node
/**
 * audit-walkthrough-narration.mjs
 * --------------------------------
 * Simulate the runtime walkthrough narration pipeline against the
 * static JSON to catch silent-skip bugs without needing a browser.
 *
 * For one or more openings + sublines, the script:
 *
 *   1. Loads src/data/annotations/<openingId>.json the same way the
 *      app does.
 *   2. Runs the same isGenericAnnotationText filter the runtime uses
 *      (parsed dynamically from src/services/walkthroughNarration.ts
 *      so the mirror cannot drift).
 *   3. Replicates getNarrationFor() and pickNarrationText() — applies
 *      narration?.trim() ?? annotation, drops generic filler, returns
 *      the text the voice service would actually speak.
 *   4. Flags any annotation whose simulated runtime output is empty
 *      (= the user would hear silence on that move).
 *
 * This catches:
 *   - Annotations where narration is set to filler text
 *   - Annotations where annotation is set to filler text and
 *     narration is empty
 *   - Annotations where both fields are empty / whitespace
 *   - Annotations whose text is non-empty but matches a runtime
 *     suppression pattern that wasn't in the regen mirror
 *
 * Usage:
 *   node scripts/audit-walkthrough-narration.mjs birds-opening
 *   node scripts/audit-walkthrough-narration.mjs birds-opening "Bird's: From's Gambit"
 *
 * Outputs: console table + audit-reports/walkthrough-narration-<id>.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const repoRoot = resolve(new URL('..', import.meta.url).pathname);
const outDir = join(repoRoot, 'audit-reports');
mkdirSync(outDir, { recursive: true });

const target = process.argv[2];
const sublineFilter = process.argv[3] ?? null;
if (!target) {
  console.error('usage: node scripts/audit-walkthrough-narration.mjs <openingId> [sublineName]');
  process.exit(2);
}

// ─── Load runtime suppression patterns from the TS source ─────────────────

function loadGenericPatterns() {
  const ts = readFileSync(join(repoRoot, 'src/services/walkthroughNarration.ts'), 'utf-8');
  const start = ts.indexOf('const GENERIC_ANNOTATION_PATTERNS');
  if (start < 0) return [];
  const end = ts.indexOf('];', start) + 2;
  const block = ts.slice(start, end);
  const out = [];
  for (const line of block.split('\n')) {
    const m = line.match(/^\s*(\/.*\/[a-z]*),?\s*$/);
    if (!m) continue;
    try { out.push(eval(m[1])); } catch { /* skip */ }
  }
  return out;
}

const GENERIC_PATTERNS = loadGenericPatterns();

function isGenericAnnotationText(text) {
  if (!text) return false;
  const t = text.trim();
  if (t.length === 0) return false;
  return GENERIC_PATTERNS.some((re) => re.test(t));
}

// ─── Simulate runtime getNarrationFor + pickNarrationText ─────────────────

function simulateRuntime(ann) {
  // Mirrors WalkthroughMode.tsx:139 + walkthroughNarration.ts:218 path.
  const fullText = ann.narration ?? ann.annotation ?? '';
  if (!fullText || !fullText.trim()) return { text: '', reason: 'empty' };
  if (isGenericAnnotationText(fullText)) return { text: '', reason: 'generic-filler' };
  return { text: fullText, reason: 'speakable' };
}

// ─── Walk + audit ──────────────────────────────────────────────────────────

const data = JSON.parse(
  readFileSync(join(repoRoot, `src/data/annotations/${target}.json`), 'utf-8'),
);

const findings = [];

function walkLine(arr, sublineName, source) {
  for (let i = 0; i < arr.length; i++) {
    const ann = arr[i];
    const result = simulateRuntime(ann);
    findings.push({
      source,
      sublineName,
      moveIndex: i,
      san: ann.san,
      narrationField: ann.narration === undefined ? '<undefined>' : ann.narration === '' ? '<empty>' : ann.narration.slice(0, 60),
      annotationField: !ann.annotation ? '<empty>' : ann.annotation.slice(0, 60),
      simulatedSpeak: result.text ? result.text.slice(0, 60) : '',
      reason: result.reason,
      silent: result.text === '',
    });
  }
}

if (!sublineFilter || sublineFilter === '(main)') {
  walkLine(data.moveAnnotations ?? [], '(main)', 'main');
}
for (const sl of data.subLines ?? []) {
  if (sublineFilter && sl.name !== sublineFilter) continue;
  walkLine(sl.moveAnnotations ?? [], sl.name, 'subline');
}

// ─── Report ────────────────────────────────────────────────────────────────

const total = findings.length;
const silent = findings.filter((f) => f.silent);
const speakable = findings.filter((f) => !f.silent);

const bySl = new Map();
for (const f of findings) {
  const key = f.sublineName;
  if (!bySl.has(key)) bySl.set(key, { speakable: 0, silent: 0 });
  if (f.silent) bySl.get(key).silent++;
  else bySl.get(key).speakable++;
}

console.log(`\n[audit-walkthrough] ${target}: ${total} annotations, ${speakable.length} speakable, ${silent.length} silent\n`);
console.log('| Subline | Speakable | Silent |');
console.log('|---|---:|---:|');
for (const [name, stats] of bySl.entries()) {
  console.log(`| ${name} | ${stats.speakable} | ${stats.silent} |`);
}

if (silent.length > 0) {
  console.log(`\n=== Silent moves (${silent.length}) — would be skipped at runtime ===\n`);
  for (const f of silent) {
    console.log(`[${f.sublineName}] m${f.moveIndex + 1} ${f.san}: ${f.reason}`);
    console.log(`  narration field: ${f.narrationField}`);
    console.log(`  annotation field: "${f.annotationField}"`);
    console.log('');
  }
}

writeFileSync(
  join(outDir, `walkthrough-narration-${target}.json`),
  JSON.stringify({ target, sublineFilter, total, silent: silent.length, findings }, null, 2),
);
console.log(`Wrote audit-reports/walkthrough-narration-${target}.json`);
