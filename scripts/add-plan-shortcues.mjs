// Apply hand-authored learnCues to masterclass plan playableLines. Patches in
// scripts/plan-shortcue-patches.mjs: { 'planId#idx': ['cue1','cue2',...] }.
// Validates cues.length === moves.length and each cue ≤8 words. node scripts/add-plan-shortcues.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { patches } from './plan-shortcue-patches.mjs';
const plans = JSON.parse(readFileSync('src/data/middlegame-plans.json', 'utf8'));
const byId = Object.fromEntries(plans.map((p) => [p.id, p]));
let applied = 0; const rejected = [];
for (const [key, cues] of Object.entries(patches)) {
  const [pid, idxS] = key.split('#'); const line = byId[pid]?.playableLines?.[+idxS];
  if (!line) { rejected.push(`${key}: line not found`); continue; }
  if (cues.length !== line.moves.length) { rejected.push(`${key}: ${cues.length} cues != ${line.moves.length} moves`); continue; }
  const over = cues.filter((c) => c.replace(/[—–-]/g, ' ').split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length > 8);
  if (over.length) { rejected.push(`${key}: cue(s) over 8 words: ${over.join(' | ')}`); continue; }
  line.learnCues = cues; applied++;
}
if (rejected.length) { console.log('REJECTED:'); rejected.forEach((r) => console.log('  ✗', r)); }
if (applied) writeFileSync('src/data/middlegame-plans.json', JSON.stringify(plans, null, 2) + '\n');
console.log(`applied ${applied} / ${Object.keys(patches).length}`);
process.exit(rejected.length ? 1 : 0);
