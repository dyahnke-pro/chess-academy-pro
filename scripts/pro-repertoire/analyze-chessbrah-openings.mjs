#!/usr/bin/env node
// Throwaway: rank chessbrah's most-played openings per colour from the
// chess.com corpus, with win-rates, so the build authors from real frequency.
import fs from 'node:fs';
import path from 'node:path';
import { Chess } from 'chess.js';

const PLAYER = 'chessbrah';
const DIR = path.join('data', 'sources', `${PLAYER}-chesscom`);
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.jsonl'));

// opening key = first N SAN of the side the player is on (their repertoire choice)
const WHITE_PLIES = 6; // 3 full moves
const BLACK_PLIES = 6;

const white = new Map(); // key -> {games, w, d, l}
const black = new Map();
const ecoWhite = new Map();
const ecoBlack = new Map();

function bump(map, key, res) {
  let e = map.get(key);
  if (!e) { e = { games: 0, w: 0, d: 0, l: 0 }; map.set(key, e); }
  e.games++;
  if (res === 'win') e.w++; else if (res === 'loss') e.l++; else e.d++;
}

function resultOf(r) {
  if (r === 'win') return 'win';
  if (['checkmated', 'resigned', 'timeout', 'abandoned', 'lose', 'bughousepartnerlose'].includes(r)) return 'loss';
  return 'draw'; // agreed, repetition, stalemate, insufficient, 50move, timevsinsufficient
}

let total = 0, played = 0, skipped = 0;
for (const f of files) {
  const lines = fs.readFileSync(path.join(DIR, f), 'utf8').split('\n').filter(Boolean);
  for (const line of lines) {
    total++;
    let g;
    try { g = JSON.parse(line); } catch { skipped++; continue; }
    if (g.rules && g.rules !== 'chess') { skipped++; continue; }
    const wU = (g.white?.username || '').toLowerCase();
    const bU = (g.black?.username || '').toLowerCase();
    const isW = wU === PLAYER;
    const isB = bU === PLAYER;
    if (!isW && !isB) { skipped++; continue; }
    if (!g.pgn) { skipped++; continue; }
    // parse moves from pgn
    let chess;
    try {
      chess = new Chess();
      chess.loadPgn(g.pgn, { sloppy: true });
    } catch { skipped++; continue; }
    const hist = chess.history();
    if (hist.length < 4) { skipped++; continue; }
    played++;
    const ecoUrl = g.eco || '';
    const ecoName = ecoUrl.replace(/.*\/openings\//, '').replace(/-/g, ' ');
    if (isW) {
      const key = hist.slice(0, WHITE_PLIES).join(' ');
      bump(white, key, resultOf(g.white.result));
      if (ecoName) bump(ecoWhite, ecoName, resultOf(g.white.result));
    } else {
      const key = hist.slice(0, BLACK_PLIES).join(' ');
      bump(black, key, resultOf(g.black.result));
      if (ecoName) bump(ecoBlack, ecoName, resultOf(g.black.result));
    }
  }
}

function top(map, n) {
  return [...map.entries()].sort((a, b) => b[1].games - a[1].games).slice(0, n);
}
function fmt(rows) {
  return rows.map(([k, e]) => {
    const score = ((e.w + e.d * 0.5) / e.games * 100).toFixed(1);
    return `  ${String(e.games).padStart(5)}  ${score}%  W${e.w}/D${e.d}/L${e.l}  ${k}`;
  }).join('\n');
}

console.log(`total=${total} played=${played} skipped=${skipped}`);
console.log(`mapsizes ecoW=${ecoWhite.size} ecoB=${ecoBlack.size} mvW=${white.size} mvB=${black.size}`);
console.log(`\n===== WHITE — top ECO families =====`);
console.log(fmt(top(ecoWhite, 25)));
console.log(`\n===== BLACK — top ECO families =====`);
console.log(fmt(top(ecoBlack, 25)));
console.log(`\n===== WHITE — top ${WHITE_PLIES}-ply move-prefixes =====`);
console.log(fmt(top(white, 25)));
console.log(`\n===== BLACK — top ${BLACK_PLIES}-ply move-prefixes =====`);
console.log(fmt(top(black, 25)));
