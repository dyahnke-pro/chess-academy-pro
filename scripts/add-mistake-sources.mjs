// Add the verified per-opening `sources` to every masterclass common-mistake
// Pitfall that lacks one, then regenerate the source baseline. node scripts/add-mistake-sources.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { OPENING_SOURCES } from './opening-source-map.mjs';

const MC = new Set(Object.keys(JSON.parse(readFileSync('src/data/opening-manifests.json', 'utf8'))).filter((k) => !k.startsWith('_')));
const cm = JSON.parse(readFileSync('src/data/common-mistakes.json', 'utf8'));
let n = 0; const noMap = new Set();
for (const [op, arr] of Object.entries(cm)) {
  if (!MC.has(op)) continue;
  const s = OPENING_SOURCES[op];
  if (!s) { noMap.add(op); continue; }
  for (const m of (arr || [])) if (!(Array.isArray(m.sources) && m.sources.length)) { m.sources = s; n++; }
}
writeFileSync('src/data/common-mistakes.json', JSON.stringify(cm, null, 2) + '\n');

console.log(`common mistakes sourced: ${n}${noMap.size ? ` | no-map: ${[...noMap].join(',')}` : ''}`);
