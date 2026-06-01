#!/usr/bin/env node
// Find the opening→endgame transition in a chessbrah model game and print the
// transition FEN + real endgame tail + student landing squares + material.
// Picks the deepest student-WIN game by default. Usage:
//   node _find-endgame.mjs <deepfile> [studentColor white|black]
import fs from 'node:fs';
import { Chess } from 'chess.js';

const [, , deepfile, colorArg] = process.argv;
const t = JSON.parse(fs.readFileSync(deepfile, 'utf8'));
// infer student color from first model game where chessbrah won
function meta(pgn) {
  return {
    w: (pgn.match(/\[White "([^"]+)"\]/) || [])[1] || '',
    b: (pgn.match(/\[Black "([^"]+)"\]/) || [])[1] || '',
    r: (pgn.match(/\[Result "([^"]+)"\]/) || [])[1] || '',
  };
}
function bare(pgn) {
  return pgn.replace(/\[[^\]]*\]\s*/g, '').replace(/\{[^}]*\}/g, '').replace(/\d+\.(\.\.)?/g, '').replace(/\s+/g, ' ').replace(/(1-0|0-1|1\/2-1\/2|\*)\s*$/, '').trim().split(' ').filter(Boolean);
}
// pick the deepest chessbrah WIN
let best = null;
for (const m of t.topModelGames) {
  const md = meta(m.pgn);
  const cb = md.w.toLowerCase() === 'chessbrah' ? 'white' : 'black';
  if (colorArg && cb !== colorArg) continue;
  const won = (md.r === '1-0' && cb === 'white') || (md.r === '0-1' && cb === 'black');
  if (!won) continue;
  const sans = bare(m.pgn);
  if (!best || sans.length > best.sans.length) best = { m, md, cb, sans };
}
if (!best) { console.log('NO student-win game'); process.exit(0); }

const { md, cb, sans } = best;
const studentChar = cb === 'white' ? 'w' : 'b';
const c = new Chess();
let tp = -1;
for (let i = 0; i < sans.length; i++) {
  c.move(sans[i]);
  const q = c.board().flat().filter((p) => p && p.type === 'q').length;
  if (q === 0 && i + 1 >= 24) { tp = i + 1; break; }
}
if (tp === -1) { console.log(`student=${cb} NO endgame transition (queens stay on)`); process.exit(0); }
const c2 = new Chess();
for (let i = 0; i < tp; i++) c2.move(sans[i]);
const fen = c2.fen();
const tail = sans.slice(tp, tp + 10);
const land = [];
for (let i = 0; i < tail.length; i++) { const mover = c2.turn(); const mv = c2.move(tail[i]); if (mover === studentChar) land.push(`${tail[i]}->${mv.to}`); }
const board = new Chess(fen).board().flat().filter(Boolean);
const cnt = {}; for (const p of board) cnt[p.color + p.type.toUpperCase()] = (cnt[p.color + p.type.toUpperCase()] || 0) + 1;
console.log(`student=${cb} vs ${cb === 'white' ? md.b : md.w}  result=${md.r}  transitionPly=${tp}`);
console.log(`TRANSITION_FEN: ${fen}`);
console.log(`TAIL: ${tail.join(' ')}`);
console.log(`STUDENT_LANDINGS: ${land.join('  ')}`);
console.log(`MATERIAL: ${JSON.stringify(cnt)}`);
