#!/usr/bin/env node
// GENERAL middlegame-past-spine walker (player + opening parameterized).
//
// For each deep-build variation file (data/sources/<player>-deep/
// <opening>-<variation>.json), read its opening spine (spineMoves, which
// ends at the opening terminus), find every one of the player's games
// that followed that spine, then frequency-walk the DOMINANT continuation
// for the next N plies. That continuation is the REAL middlegame play his
// games reach past the opening — the data source for:
//   • STEP 3.5: extending a variation lesson INTO the middlegame
//   • STEP 9:   the playable line of a hand-authored middlegame plan
//
// Moves are copied from this stdout (§1b show-your-work) — never composed.
//
// Usage: node scripts/pro-repertoire/middlegame-past-spine.mjs <player> <openingId> [extraPlies] [minGames]

import fs from 'node:fs';
import path from 'node:path';

const PLAYER = process.argv[2] || 'gothamchess';
const OPENING = process.argv[3] || 'caro-kann';
const EXTRA_PLIES = Number(process.argv[4] || 12);
const MIN_GAMES = Number(process.argv[5] || 3);

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

// Pre-parse every game once (player's games only), keep SAN arrays.
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
  const spine = d.spineMoves || [];
  if (spine.length === 0) continue;

  // Games that followed this spine to the terminus.
  let pool = games.filter((m) => startsWith(m, spine));
  const startN = pool.length;
  const path0 = [...spine];
  const perPly = [];

  // Walk the dominant continuation ply-by-ply.
  for (let depth = 0; depth < EXTRA_PLIES; depth++) {
    const ply = spine.length + depth;
    const counts = {};
    for (const m of pool) if (m.length > ply) counts[m[ply]] = (counts[m[ply]] || 0) + 1;
    const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (ranked.length === 0) break;
    const [bestMove, bestCount] = ranked[0];
    if (bestCount < MIN_GAMES) break;
    path0.push(bestMove);
    perPly.push(`${bestMove}(${bestCount})`);
    pool = pool.filter((m) => m[ply] === bestMove);
  }

  const variation = d.variation || file.replace(`${OPENING}-`, '').replace('.json', '');
  console.log(`### ${variation}  [${startN} games on spine, terminus ply ${spine.length}]`);
  console.log(`  full line:  ${path0.join(' ')}`);
  console.log(`  middlegame extension (move|games): ${perPly.join(' ') || '(branches below threshold immediately)'}\n`);
}
