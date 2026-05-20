#!/usr/bin/env node
/**
 * Merges Wikipedia-fetched opening intros into
 * src/data/chess-concepts.json's openingDefinitions slot.
 *
 * Replaces the hand-written modern-definition fallback for each
 * opening with the Wikipedia intro (CC BY-SA 4.0, attributed).
 * Preserves the keyIdeas + character fields I wrote — Wikipedia
 * provides the intro paragraph, our static prose provides the
 * teaching summary.
 *
 * Usage:
 *   node scripts/merge-wikipedia-openings.mjs <fetched-dir>
 *
 * Example:
 *   node scripts/merge-wikipedia-openings.mjs docs/audit-runs/wikipedia-openings-2026-05-19T20-00-00-000Z
 */

import { readFileSync, writeFileSync } from 'node:fs';

const dir = process.argv[2];
if (!dir) {
  console.error('usage: node merge-wikipedia-openings.mjs <fetched-dir>');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(`${dir}/manifest.json`, 'utf-8'));
const concepts = JSON.parse(readFileSync('src/data/chess-concepts.json', 'utf-8'));

if (!concepts.openingDefinitions) concepts.openingDefinitions = {};

let merged = 0;
let skipped = 0;

for (const entry of manifest.entries) {
  if (entry.status !== 'fetched' || !entry.extract) {
    skipped++;
    continue;
  }
  const existing = concepts.openingDefinitions[entry.id] ?? {};
  concepts.openingDefinitions[entry.id] = {
    ...existing,
    // Wikipedia intro replaces our hand-written description.
    description: entry.extract,
    // Attribution required by CC BY-SA 4.0
    sourceUrl: entry.canonicalUrl,
    sourceAttribution: entry.attribution,
    // Preserve our hand-written character + keyIdeas if present
    character: existing.character ?? null,
    keyIdeas: existing.keyIdeas ?? [],
  };
  merged++;
}

writeFileSync('src/data/chess-concepts.json', JSON.stringify(concepts, null, 2) + '\n');

console.log(`Merged: ${merged} openings with Wikipedia descriptions`);
console.log(`Skipped (failed fetches): ${skipped}`);
console.log(`Total openingDefinitions: ${Object.keys(concepts.openingDefinitions).length}`);
console.log('Wrote src/data/chess-concepts.json');
