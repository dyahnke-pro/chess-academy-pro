// Source the masterclass-mapped pro-repertoire openings: add the verified
// `sources` (from the shared opening map) to each mapped opening AND every one
// of its variations' `explanation` prose. Non-masterclass pro openings (not in
// proRepertoireOpeningMap.json) are left alone. node scripts/add-prorep-sources.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { OPENING_SOURCES } from './opening-source-map.mjs';

const proMap = JSON.parse(readFileSync('src/data/proRepertoireOpeningMap.json', 'utf8')).map;
const data = JSON.parse(readFileSync('src/data/pro-repertoires.json', 'utf8'));
let openings = 0, vars = 0;
for (const o of data.openings) {
  const mcId = proMap[o.id];
  if (!mcId) continue;
  const src = OPENING_SOURCES[mcId];
  if (!src) continue;
  if (!(Array.isArray(o.sources) && o.sources.length)) { o.sources = src; openings++; }
  for (const v of (o.variations || [])) {
    if (!(Array.isArray(v.sources) && v.sources.length)) { v.sources = src; vars++; }
  }
}
writeFileSync('src/data/pro-repertoires.json', JSON.stringify(data, null, 2) + '\n');
console.log(`pro-repertoires sourced: ${openings} openings, ${vars} variations`);
