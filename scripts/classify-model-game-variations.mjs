#!/usr/bin/env node
// Tag each model game with the VARIATION it actually played, deterministically
// (David 2026-05-30, fix #1). The rule lives in ONE place,
// src/data/modelGameVariation.shared.mjs, which the gate test
// (src/data/modelGameVariation.test.ts) imports too: by POSITION as well as by
// move order, so a game that transposes into a tab's line files under that tab.
// A game that follows the main line deepest stays untagged (= main line).
//
// Run with no flags for a dry run: it prints every tag that would change and
// the distribution. Run with --write to persist. The write keeps the file's
// format and each game's key order, so the diff is only the tags that changed.
import fs from 'node:fs';
import { createVariationClassifier } from '../src/data/modelGameVariation.shared.mjs';

const WRITE = process.argv.includes('--write');
const rep = JSON.parse(fs.readFileSync('src/data/repertoire.json', 'utf8'));
const pro = JSON.parse(fs.readFileSync('src/data/pro-repertoires.json', 'utf8'));
const games = JSON.parse(fs.readFileSync('src/data/model-games.json', 'utf8'));
// pro-repertoires.json is { players, openings } — include its openings so pro
// model games file under their variation tab too (David 2026-06-23).
const proOpenings = Array.isArray(pro) ? pro : (pro.openings || []);
const openings = [...(Array.isArray(rep) ? rep : []), ...proOpenings];
const classify = createVariationClassifier(openings);

const tierCount = {};
const dist = {};
const changed = [];
let untagged = 0;
for (const g of games) {
  const verdict = classify(g);
  const next = verdict ? verdict.name : undefined;
  if (next !== g.variation) changed.push(`  ${g.id} [${g.openingId}]: ${JSON.stringify(g.variation)} -> ${JSON.stringify(next)}${verdict ? ` (${verdict.tier})` : ''}`);
  // Assigning an existing key keeps its place in the object, so a rewrite
  // touches only the tags that changed.
  if (verdict) g.variation = verdict.name;
  else delete g.variation;
  if (!verdict) { untagged++; continue; }
  tierCount[verdict.tier] = (tierCount[verdict.tier] || 0) + 1;
  const k = `${g.openingId} :: ${verdict.name} [${verdict.tier}]`;
  dist[k] = (dist[k] || 0) + 1;
}
console.log(`${Object.entries(tierCount).map(([t, n]) => `${t} ${n}`).join(', ')}, untagged(main) ${untagged}, total ${games.length}`);
console.log(`\nchanged: ${changed.length}`);
for (const line of changed) console.log(line);
console.log('\ndistribution:');
Object.entries(dist).sort().forEach(([k, n]) => console.log(`  ${n}  ${k}`));
if (WRITE) { fs.writeFileSync('src/data/model-games.json', JSON.stringify(games, null, 2) + '\n'); console.log('\n[written]'); }
