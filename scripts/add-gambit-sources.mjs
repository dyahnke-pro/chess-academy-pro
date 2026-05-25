// Source the masterclass-mapped gambits (gambitOpeningMap.json): add the verified
// `sources` to each mapped gambit + every variation's explanation. Non-masterclass
// gambits left alone. node scripts/add-gambit-sources.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { OPENING_SOURCES } from './opening-source-map.mjs';
const map = JSON.parse(readFileSync('src/data/gambitOpeningMap.json', 'utf8')).map;
const gb = JSON.parse(readFileSync('src/data/gambits.json', 'utf8'));
let o = 0, v = 0;
for (const g of gb) {
  const mc = map[g.id]; if (!mc) continue;
  const s = OPENING_SOURCES[mc]; if (!s) continue;
  if (!(Array.isArray(g.sources) && g.sources.length)) { g.sources = s; o++; }
  for (const x of (g.variations || [])) if (!(Array.isArray(x.sources) && x.sources.length)) { x.sources = s; v++; }
}
writeFileSync('src/data/gambits.json', JSON.stringify(gb, null, 2) + '\n');
console.log(`gambits sourced: ${o} openings, ${v} variations`);
