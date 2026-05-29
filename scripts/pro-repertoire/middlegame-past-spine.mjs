#!/usr/bin/env node
// GENERAL middlegame-plan-line extractor (player + opening parameterized).
//
// For each deep-build variation file, walk the player's WIDE game pool
// (games matching the variation's identifying prefix — hundreds of games)
// down the dominant opening line to where it branches (the opening
// terminus). At that branch point, enumerate the top continuation
// clusters (his real middlegame plans, ≥ minGames each) and for EACH,
// walk its own dominant sub-line a few plies into the middlegame.
//
// The clusters ARE his candidate middlegame plans (STEP 9); each printed
// sub-line is a data-grounded playable line to paste (§1b show-your-work).
// Moves are copied from this stdout — never composed.
//
// Usage: node scripts/pro-repertoire/middlegame-past-spine.mjs <player> <openingId> [minBranch] [planPlies]

import fs from 'node:fs';
import path from 'node:path';

const PLAYER = process.argv[2] || 'gothamchess';
const OPENING = process.argv[3] || 'caro-kann';
const MIN_BRANCH = Number(process.argv[4] || 5);   // pool floor to keep walking the single spine
const PLAN_PLIES = Number(process.argv[5] || 8);   // how far to walk each plan branch

const SRC_DIR = `data/sources/${PLAYER}-chesscom`;
const DEEP_DIR = `data/sources/${PLAYER}-deep`;
const meLc = PLAYER.toLowerCase();

function sans(pgn) {
  const i = pgn.search(/\n\n/);
  let b = i < 0 ? pgn : pgn.slice(i);
  b = b.replace(/\{[^}]*\}/g, ' ');
  let prev;
  do { prev = b; b = b.replace(/\([^()]*\)/g, ' '); } while (b !== prev);
  b = b.replace(/\b\d+\.+/g, ' ').replace(/\$\d+/g, ' ')
       .replace(/\b(1-0|0-1|1\/2-1\/2|\*)\b/g, ' ');
  return b.trim().split(/\s+/).filter((t) => t && !/^\.+$/.test(t));
}
function startsWith(moves, prefix) {
  if (moves.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) if (moves[i] !== prefix[i]) return false;
  return true;
}
// dominant move at `ply` across pool, plus the surviving sub-pool
function dominant(pool, ply) {
  const counts = {};
  for (const m of pool) if (m.length > ply) counts[m[ply]] = (counts[m[ply]] || 0) + 1;
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return ranked;
}

const games = [];
for (const f of fs.readdirSync(SRC_DIR).filter((x) => x.endsWith('.jsonl'))) {
  for (const line of fs.readFileSync(path.join(SRC_DIR, f), 'utf8').split('\n')) {
    if (!line) continue;
    let g; try { g = JSON.parse(line); } catch { continue; }
    if (g.rules !== 'chess') continue;
    const w = (g.white?.username || '').toLowerCase();
    const b = (g.black?.username || '').toLowerCase();
    if (w !== meLc && b !== meLc) continue;
    const m = sans(g.pgn || '');
    if (m.length >= 6) games.push(m);
  }
}

const deepFiles = fs.readdirSync(DEEP_DIR)
  .filter((f) => f.startsWith(`${OPENING}-`) && f.endsWith('.json') && !f.includes('NOTES'));

console.log(`player=${PLAYER} opening=${OPENING} | ${games.length} of his games parsed\n`);

for (const file of deepFiles) {
  let d; try { d = JSON.parse(fs.readFileSync(path.join(DEEP_DIR, file), 'utf8')); } catch { continue; }
  const prefix = d.variation?.prefix || [];
  const label = d.variation?.label || d.variationKey || file;
  if (prefix.length === 0) continue;

  let pool = games.filter((m) => startsWith(m, prefix));
  if (pool.length < MIN_BRANCH) continue;
  const wideN = pool.length;

  // Walk dominant spine until the pool thins below MIN_BRANCH.
  const spine = [...prefix];
  let ply = prefix.length;
  while (true) {
    const ranked = dominant(pool, ply);
    if (ranked.length === 0 || ranked[0][1] < MIN_BRANCH) break;
    spine.push(ranked[0][0]);
    pool = pool.filter((m) => m[ply] === ranked[0][0]);
    ply++;
  }

  console.log(`### ${label}  [${wideN} games matched prefix]`);
  console.log(`  spine to branch (move ${Math.ceil(spine.length / 2)}): ${spine.join(' ')}`);

  // At the branch point, enumerate the top middlegame-plan clusters.
  const branchRanked = dominant(pool, spine.length).slice(0, 4);
  if (branchRanked.length === 0) { console.log('  (no further branches)\n'); continue; }

  for (const [clusterMove, clusterCount] of branchRanked) {
    if (clusterCount < 2) continue;
    const pct = ((clusterCount / pool.length) * 100).toFixed(0);
    // Walk this cluster's dominant sub-line into the middlegame.
    let sub = pool.filter((m) => m[spine.length] === clusterMove);
    const line = [...spine, clusterMove];
    let p = spine.length + 1;
    const tail = [`${clusterMove}(${clusterCount})`];
    for (let k = 0; k < PLAN_PLIES - 1; k++) {
      const r = dominant(sub, p);
      if (r.length === 0 || r[0][1] < 2) break;
      line.push(r[0][0]);
      tail.push(`${r[0][0]}(${r[0][1]})`);
      sub = sub.filter((m) => m[p] === r[0][0]);
      p++;
    }
    console.log(`    • plan [${clusterMove} ${pct}% of branch]: ${line.join(' ')}`);
    console.log(`        per-ply: ${tail.join(' ')}`);
  }
  console.log('');
}
