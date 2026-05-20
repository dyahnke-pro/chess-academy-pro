#!/usr/bin/env node
/**
 * Applies cached Haiku replacements from haiku-enrichments.json to
 * the annotation files. For each cached entry:
 *  - Replaces generic plans with the concrete plans
 *  - Replaces generic alternatives with the concrete alternative
 *
 * Non-generic existing entries are preserved.
 *
 * Idempotent: only modifies entries whose plans/alternatives still
 * contain stubs (so re-running after a partial apply doesn't
 * double-replace).
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const DIR = 'src/data/annotations';
const CACHE_PATH = 'docs/audit-runs/2026-05-19-content-scan/haiku-enrichments.json';

const STUB_PLANS = new Set([
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

const STUB_ALT_RX = [
  /^Other (?:pawn|knight|bishop|rook|queen|king|piece) moves? (?:were|was) available/i,
  /^A different (?:pawn|knight|bishop|rook|queen) move was possible/i,
  /^The (?:pawn|knight|bishop|rook|queen|king) could go to other/i,
  /^(?:White|Black) had other options here/i,
  /^Other (?:moves|options) (?:were|are) available here/i,
  /^The (?:pawn|knight|bishop|rook|queen) had other (?:moves|options|squares)/i,
  /^Other (?:legal|reasonable) moves (?:were|are) possible/i,
];
const isStubAlt = (s) => typeof s === 'string' && STUB_ALT_RX.some((r) => r.test(s.trim()));

const cache = JSON.parse(await readFile(CACHE_PATH, 'utf-8'));
console.log(`cached entries: ${Object.keys(cache.entries).length}`);

const files = await readdir(DIR);
let totalPlanReplacements = 0;
let totalAltReplacements = 0;
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
      if (!cached) continue;
      const a = arr[i];
      // Replace stub plans with concrete ones
      if (Array.isArray(a.plans)) {
        const nonStub = a.plans.filter((p) => !STUB_PLANS.has((p || '').trim()));
        const newPlans = [...nonStub, ...(cached.plans || [])];
        if (newPlans.length > 0) {
          a.plans = newPlans;
        } else {
          delete a.plans;
        }
        totalPlanReplacements += (cached.plans || []).length;
      } else if (cached.plans && cached.plans.length > 0) {
        a.plans = [...cached.plans];
        totalPlanReplacements += cached.plans.length;
      }
      // Replace stub alternatives
      if (Array.isArray(a.alternatives)) {
        const nonStub = a.alternatives.filter((alt) => !isStubAlt(alt));
        if (cached.alternative) {
          const newAlts = [...nonStub, cached.alternative];
          a.alternatives = newAlts;
          totalAltReplacements++;
        } else if (nonStub.length > 0) {
          a.alternatives = nonStub;
        } else {
          delete a.alternatives;
        }
      } else if (cached.alternative) {
        a.alternatives = [cached.alternative];
        totalAltReplacements++;
      }
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

console.log(`files edited: ${filesEdited}`);
console.log(`plan replacements: ${totalPlanReplacements}`);
console.log(`alternative replacements: ${totalAltReplacements}`);
