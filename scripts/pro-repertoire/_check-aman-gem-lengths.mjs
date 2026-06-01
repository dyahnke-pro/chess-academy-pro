import fs from 'node:fs';
import { GEM_NARRATION } from '../../src/data/lessons/punishGemNarration.ts';
const g = JSON.parse(fs.readFileSync('src/data/punish-gems.json', 'utf8'));
const arr = Array.isArray(g) ? g : (g.gems || Object.values(g).flat());
const am = arr.filter((x) => (x.openingId || '').includes('aman'));
let bad = 0;
for (const gem of am) {
  const id = `${gem.openingId}:${gem.lineMoves.replace(/\s+/g, '_')}:${gem.inaccuracy}`;
  const p = gem.playLine.trim().split(/\s+/).length;
  const n = GEM_NARRATION[id];
  if (!n) { console.log('MISSING', id, 'plies=' + p); bad++; continue; }
  if (n.watch.length !== p || n.learn.length !== p) {
    console.log(`MISMATCH plies=${p} watch=${n.watch.length} learn=${n.learn.length}\n   ${id}`);
    bad++;
  }
}
console.log(bad === 0 ? `ALL ${am.length} ALIGNED` : `${bad} ISSUES of ${am.length}`);
