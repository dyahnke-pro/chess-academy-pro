// Regenerate the gem verification-source baseline: masterclass gems that are
// narrated but whose GEM_NARRATION entry has no `sources` field yet. Run after
// sourcing each opening; the baseline only shrinks. node scripts/regen-gem-sources-baseline.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync('src/data/lessons/punishGemNarration.ts', 'utf8');
const sourced = new Set();
const re = /^  ['"]([a-z0-9-]+:[^'"]+)['"]: \{\n([\s\S]*?)\n  \},$/gm;
let m;
while ((m = re.exec(src)) !== null) if (m[2].includes('sources:')) sourced.add(m[1]);

const gems = JSON.parse(readFileSync('src/data/punish-gems.json', 'utf8'));
const MC = new Set(Object.keys(JSON.parse(readFileSync('src/data/opening-manifests.json', 'utf8'))).filter((k) => !k.startsWith('_')));
const narrated = new Set([...src.matchAll(/^  .([a-z0-9-]+:[^'"`]+).:\s*\{/gm)].map((x) => x[1]));
const idOf = (g) => `${g.openingId}:${g.lineMoves.replace(/ /g, '_')}:${g.inaccuracy}`;

const unsourced = gems.filter((g) => MC.has(g.openingId) && narrated.has(idOf(g)) && !sourced.has(idOf(g))).map(idOf).sort();
const path = 'src/data/punishGemSources.baseline.json';
const o = JSON.parse(readFileSync(path, 'utf8'));
o.count = unsourced.length;
o.keys = unsourced;
writeFileSync(path, JSON.stringify(o, null, 2) + '\n');
const by = {};
for (const k of unsourced) { const op = k.split(':')[0]; by[op] = (by[op] || 0) + 1; }
console.log(`sourced entries: ${sourced.size} | verification baseline: ${unsourced.length}`, JSON.stringify(by));
