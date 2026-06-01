#!/usr/bin/env node
// Print an authoring sheet for every Aman gem: gemId, tier, playLine with
// per-ply mover + SAN, and the punish idea. Feeds hand-authored GEM_NARRATION.
import fs from 'node:fs';
import { Chess } from 'chess.js';
const g = JSON.parse(fs.readFileSync('src/data/punish-gems.json', 'utf8'));
const arr = Array.isArray(g) ? g : (g.gems || Object.values(g).flat());
const am = arr.filter((x) => (x.openingId || '').includes('aman'));
const only = process.argv[2]; // optional openingId filter
for (const gem of am) {
  if (only && gem.openingId !== only) continue;
  const id = `${gem.openingId}:${gem.lineMoves.replace(/\s+/g, '_')}:${gem.inaccuracy}`;
  const sans = gem.playLine.trim().split(/\s+/);
  console.log(`\n=== ${gem.openingId} [${gem.tier} ${gem.engineCp}cp] ===`);
  console.log(`KEY: ${id}`);
  console.log(`inaccuracy: ${gem.inaccuracy} (${gem.freqPct}%)  punish: ${gem.punish}  mainMove: ${gem.mainMove}`);
  console.log(`why: ${gem.why}`);
  const chess = new Chess();
  const studentChar = /reti|ruy|open-sicilian|rossolimo|french|anti-caro/.test(gem.openingId) ? 'w' : 'b';
  console.log(`student=${studentChar}  plies=${sans.length}`);
  sans.forEach((s, i) => {
    const mover = chess.turn();
    chess.move(s);
    const tag = mover === studentChar ? 'STU' : 'opp';
    console.log(`  [${String(i).padStart(2)}] ${tag} ${s}`);
  });
}
