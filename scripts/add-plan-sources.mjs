// Add the verified per-opening `sources` to every masterclass middlegame-plan
// playableLine that lacks one. The source sets are the SAME verified opening
// grounding used for the gems and beat-lessons this session (book corpus where
// the pre-1930s books cover it, else the verified Wikipedia/Chess.com reference,
// plus the concept matching the opening's character). node scripts/add-plan-sources.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { OPENING_SOURCES as MAP } from './opening-source-map.mjs';

const MC = new Set(Object.keys(JSON.parse(readFileSync('src/data/opening-manifests.json', 'utf8'))).filter((k) => !k.startsWith('_')));
const plans = JSON.parse(readFileSync('src/data/middlegame-plans.json', 'utf8'));
let n = 0; const skipped = new Set();
for (const p of plans) {
  if (!MC.has(p.openingId)) continue;
  const src = MAP[p.openingId];
  if (!src) { skipped.add(p.openingId); continue; }
  for (const l of (p.playableLines || [])) {
    if (!(Array.isArray(l.sources) && l.sources.length)) { l.sources = src; n++; }
  }
}
writeFileSync('src/data/middlegame-plans.json', JSON.stringify(plans, null, 2) + '\n');
console.log(`plan lines sourced: ${n}`);
if (skipped.size) console.log('masterclass openings with NO source map (add them):', [...skipped].join(', '));
