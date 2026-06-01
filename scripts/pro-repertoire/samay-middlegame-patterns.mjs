#!/usr/bin/env node
// Middlegame-pattern extractor for Samay (G9.1 STEP 5 + recipe). For an
// opening's variation prefix, walk every corpus game matching it to the
// opening terminus, then frequency-rank the STUDENT's next moves across the
// middlegame (the plies after the prefix). Distinct clusters ≥10% are
// candidate middlegame plans. Prints, for the top continuation, the real move
// sequence + the squares the student lands on — the raw material to author a
// plan grounded in his games (never from memory).
//   node scripts/pro-repertoire/samay-middlegame-patterns.mjs <prefix SAN...> [color=white]
//   e.g. ... "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7" black
import fs from 'node:fs';
import { Chess } from 'chess.js';

const SRC = 'data/sources/samayraina-chesscom';
const PLAYER = 'samayraina';
const args = process.argv.slice(2);
const color = (args[args.length - 1] === 'white' || args[args.length - 1] === 'black') ? args.pop() : 'white';
const prefix = args.join(' ').trim().split(/\s+/).filter(Boolean);
const studentChar = color === 'black' ? 'b' : 'w';

function pgnToSan(t) {
  const i = t.search(/\n\n/); if (i < 0) return null;
  let b = t.slice(i).replace(/\{[^}]*\}/g, '');
  let prev; do { prev = b; b = b.replace(/\([^()]*\)/g, ''); } while (b !== prev);
  b = b.replace(/\b\d+\.+\s*/g, '').replace(/\s*(?:1-0|0-1|1\/2-1\/2|\*)\s*$/, '').trim();
  return b ? b.split(/\s+/).filter(Boolean) : null;
}
function matches(m, p) { if (m.length < p.length) return false; for (let i = 0; i < p.length; i++) if (m[i] !== p[i]) return false; return true; }

const games = [];
for (const f of fs.readdirSync(SRC).filter((x) => x.endsWith('.jsonl'))) {
  for (const line of fs.readFileSync(`${SRC}/${f}`, 'utf8').split('\n').filter(Boolean)) {
    let g; try { g = JSON.parse(line); } catch { continue; }
    if (!g.pgn || (g.rules && g.rules !== 'chess')) continue;
    const meW = (g.white?.username || '').toLowerCase() === PLAYER;
    if (!meW && (g.black?.username || '').toLowerCase() !== PLAYER) continue;
    if ((meW ? 'white' : 'black') !== color) continue;
    const sans = pgnToSan(g.pgn);
    if (!sans || !matches(sans, prefix)) continue;
    const me = meW ? g.white : g.black;
    games.push({ sans, won: me.result === 'win', oppRating: (meW ? g.black : g.white).rating || 0 });
  }
}

console.log(`\nPREFIX: ${prefix.join(' ')}  (${color})  — ${games.length} matching games`);
if (!games.length) process.exit(0);

// Frequency-rank the STUDENT's move at each ply from prefix.length onward.
const startPly = prefix.length;
for (let ply = startPly; ply < startPly + 8; ply++) {
  if (ply % 2 !== (studentChar === 'w' ? 0 : 1)) continue; // student-to-move plies only
  const tally = {}; let n = 0;
  for (const g of games) {
    if (g.sans.length <= ply) continue;
    const mv = g.sans[ply]; tally[mv] = tally[mv] || { c: 0, w: 0 }; tally[mv].c++; if (g.won) tally[mv].w++; n++;
  }
  const top = Object.entries(tally).sort((a, b) => b[1].c - a[1].c).slice(0, 5);
  console.log(`\n  student move ${Math.floor(ply / 2) + 1} (ply ${ply}, n=${n}):`);
  for (const [m, s] of top) {
    const pct = ((100 * s.c) / n).toFixed(0);
    console.log(`    ${m.padEnd(6)} ${String(s.c).padStart(4)}  ${pct.padStart(3)}%   win ${((100 * s.w) / s.c).toFixed(0)}%`);
  }
}

// Print the single most-played full continuation (modal line) + landing squares.
let cur = games.filter((g) => g.sans.length > startPly);
const modal = [];
for (let ply = startPly; ply < startPly + 10 && cur.length >= 3; ply++) {
  const tally = {};
  for (const g of cur) { const mv = g.sans[ply]; if (mv) tally[mv] = (tally[mv] || 0) + 1; }
  const best = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
  if (!best) break;
  modal.push(best[0]);
  cur = cur.filter((g) => g.sans[ply] === best[0]);
}
const c = new Chess(); for (const m of prefix) c.move(m);
const termFen = c.fen();
console.log(`\n  OPENING-TERMINUS FEN: ${termFen}`);
console.log(`  MODAL MIDDLEGAME CONTINUATION (${cur.length} games still on it): ${modal.join(' ')}`);
const landings = [];
const c2 = new Chess(termFen);
for (const m of modal) { const mv = c2.move(m); if (!mv) break; landings.push(`${mv.san}:${mv.to}${mv.color === studentChar ? '*' : ''}`); }
console.log(`  landings (student*): ${landings.join(' ')}`);
