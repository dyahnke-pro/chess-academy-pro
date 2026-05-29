#!/usr/bin/env node
// Pull a specific game by URL from his archive, replay it, and print
// the positions at the spine end, middlegame point, and endgame
// point. Used to anchor both middlegame and endgame plans to REAL
// game positions (per the no-fabrication rule).

import fs from 'node:fs';
import path from 'node:path';
import { Chess } from 'chess.js';

const TARGET_URLS = [
  // nf6-main: FaustinoOro 2971 (already used)
  'https://www.chess.com/game/live/116409573563',
  // d5-open: Shankland 2934 (already used)
  'https://www.chess.com/game/live/121145425383',
  // e6-french: NikoTheodorou 3131 (need endgame position)
  'https://www.chess.com/game/live/122544854489',
  // d6-mainline: Riley 2984 (need endgame position)
  'https://www.chess.com/game/live/125110107435',
  // nc6-line: Zanyglobal 2899 (need endgame position)
  'https://www.chess.com/game/live/99920640193',
  // g6-dragon: Botez 2279 (full plan needed)
  'https://www.chess.com/game/live/52091475569',
  // nf6-d6-sub: Salem-AR 3141 (full plan needed)
  'https://www.chess.com/game/live/144069607063',
  // nf6-e6-sub: chessawp 3009 (full plan needed)
  'https://www.chess.com/game/live/122964252115',
];

const SRC_DIR = 'data/sources/danielnaroditsky-chesscom';

function pgnToSan(pgnText) {
  const i = pgnText.search(/\n\n/);
  if (i < 0) return null;
  let b = pgnText.slice(i).replace(/\{[^}]*\}/g, '');
  let prev; do { prev = b; b = b.replace(/\([^()]*\)/g, ''); } while (b !== prev);
  b = b.replace(/\b\d+\.+\s*/g, '').replace(/\s*(?:1-0|0-1|1\/2-1\/2|\*)\s*$/, '').trim();
  return b ? b.split(/\s+/).filter(Boolean) : null;
}

const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.jsonl'));

for (const url of TARGET_URLS) {
  let found = null;
  for (const f of files) {
    const lines = fs.readFileSync(path.join(SRC_DIR, f), 'utf8').split('\n').filter(Boolean);
    for (const line of lines) {
      let g; try { g = JSON.parse(line); } catch { continue; }
      if (g.url === url) { found = g; break; }
    }
    if (found) break;
  }
  if (!found) {
    console.log(`\n=== NOT FOUND: ${url} ===`);
    continue;
  }

  const moves = pgnToSan(found.pgn);
  console.log(`\n=== ${url} ===`);
  console.log(`  vs ${found.white?.username === 'DanielNaroditsky' ? found.black?.username : found.white?.username}`);
  console.log(`  result:`, found.pgn.match(/\[Result "([^"]+)"\]/)?.[1]);
  console.log(`  totalPlies:`, moves.length);

  const chess = new Chess();
  for (let i = 0; i < moves.length; i++) {
    try { chess.move(moves[i]); } catch { console.log(`  STOPPED at ply ${i + 1}: illegal ${moves[i]}`); break; }
  }
  console.log(`  full game (${moves.length} plies):`, moves.join(' '));

  // Print position at key plies
  for (const ply of [20, 24, 28, 32, 36, 40, 50, 60]) {
    if (ply > moves.length) break;
    const c2 = new Chess();
    for (let i = 0; i < ply; i++) c2.move(moves[i]);
    const piecesLeft = c2.board().flat().filter(Boolean).length;
    console.log(`  ply ${ply} (move ${Math.ceil(ply / 2)}, ${piecesLeft} pieces): ${c2.fen()}`);
  }
}
