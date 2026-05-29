// Generate src/data/variationMiddlegameDepth.baseline.json — the current
// set of pro-rep variations whose PGN does NOT yet reach the middlegame.
// Gate: variationMiddlegameDepth.test.ts. The list only SHRINKS; new
// variations must reach the middlegame (no baseline add).
import fs from 'node:fs';
import { reachesMiddlegame } from '../../src/data/variationMiddlegameDepth.shared.mjs';

const d = JSON.parse(fs.readFileSync('src/data/pro-repertoires.json', 'utf8'));
const keys = [];
for (const o of d.openings) {
  if (!reachesMiddlegame(o.pgn).pass) keys.push(`${o.id}::<main>`);
  for (const v of o.variations || []) {
    if (!reachesMiddlegame(v.pgn).pass) keys.push(`${o.id}::${v.name}`);
  }
}
keys.sort();
const out = {
  _doc: 'Pro-rep variations whose PGN does not yet walk into the middlegame (uncastled, under-developed, short). Gate: variationMiddlegameDepth.test.ts. David 2026-05-29: every opening AND variation must reach the middlegame. This is the shrinking backlog — the list only SHRINKS; a NEW variation MUST reach the middlegame (extend its PGN to his data-derived spine), never be added here. Lower the count as you deepen these. Regenerate ONLY to remove entries: node scripts/pro-repertoire/gen-mg-depth-baseline.mjs',
  count: keys.length,
  keys,
};
fs.writeFileSync('src/data/variationMiddlegameDepth.baseline.json', JSON.stringify(out, null, 2) + '\n');
console.log(`baseline written: ${keys.length} shallow variations`);
