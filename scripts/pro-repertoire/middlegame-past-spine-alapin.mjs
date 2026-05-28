#!/usr/bin/env node
// Find the actual middlegame continuations past the Alapin spine
// terminus. For each variation, walk every game that matches the
// opening terminus position and bucket the next 10 plies (the
// middlegame). Output: most-played continuation per variation past
// the opening, so the middlegame plans can show actual middlegame
// moves rather than restating opening play.

import fs from 'node:fs';
import path from 'node:path';
import { Chess } from 'chess.js';

const SRC_DIR = 'data/sources/danielnaroditsky-chesscom';

// Each entry: the terminus position to filter on + a label
const VARIATIONS = {
  'nf6-main': {
    // Opening terminus from deep-build: spine ends at ply 32 with Qg4 g6
    // Walk middlegame from there
    spineSans: ['e4','c5','c3','Nf6','e5','Nd5','Nf3','Nc6','Bc4','Nb6','Bb3','d5','exd6','Qxd6','O-O','Be6','Bxe6','Qxe6','a4','Qd7','a5','Nd5','a6','b6','d4','e6','Ne5','Nxe5','dxe5','Be7','Qg4'],
    color: 'white',
  },
  'd5-open': {
    spineSans: ['e4','c5','c3','d5','exd5','Qxd5','d4','Nf6','Nf3','e6','Na3','Nc6','Be3'],
    color: 'white',
  },
  'e6-french': {
    spineSans: ['e4','c5','c3','e6','d4','d5','e5','Nc6','Nf3','Bd7','Bd3','cxd4','O-O'],
    color: 'white',
  },
  'd6-mainline': {
    spineSans: ['e4','c5','c3','d6','d4','cxd4','cxd4','Nf6','Nc3','g6','h3','Bg7','Nf3','O-O','Bd3','Nc6','O-O'],
    color: 'white',
  },
  'nc6-line': {
    spineSans: ['e4','c5','c3','Nc6','d4','cxd4','cxd4','d5','exd5','Qxd5','Nf3','e6','Nc3','Qd8','Bd3','Nf6','O-O','Be7','a3'],
    color: 'white',
  },
};

function pgnToSan(pgnText) {
  const i = pgnText.search(/\n\n/);
  if (i < 0) return null;
  let b = pgnText.slice(i).replace(/\{[^}]*\}/g, '');
  let prev; do { prev = b; b = b.replace(/\([^()]*\)/g, ''); } while (b !== prev);
  b = b.replace(/\b\d+\.+\s*/g, '').replace(/\s*(?:1-0|0-1|1\/2-1\/2|\*)\s*$/, '').trim();
  return b ? b.split(/\s+/).filter(Boolean) : null;
}
function matches(m, p) { if (m.length < p.length) return false; for (let i=0;i<p.length;i++) if (m[i] !== p[i]) return false; return true; }

const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.jsonl'));

for (const [vKey, cfg] of Object.entries(VARIATIONS)) {
  const allMatchingGames = [];
  for (const f of files) {
    const lines = fs.readFileSync(path.join(SRC_DIR, f), 'utf8').split('\n').filter(Boolean);
    for (const line of lines) {
      let g; try { g = JSON.parse(line); } catch { continue; }
      if (!g.pgn) continue;
      const isWhite = (g.white?.username || '').toLowerCase() === 'danielnaroditsky';
      const isBlack = (g.black?.username || '').toLowerCase() === 'danielnaroditsky';
      if (cfg.color === 'black' && !isBlack) continue;
      if (cfg.color === 'white' && !isWhite) continue;
      const m = pgnToSan(g.pgn);
      if (!m || !matches(m, cfg.spineSans)) continue;
      allMatchingGames.push(m);
    }
  }

  console.log(`\n=== ${vKey} ===`);
  console.log(`  ${allMatchingGames.length} games reach the spine (${cfg.spineSans.length} plies)`);

  // Show middlegame patterns at successively deeper plies
  const startPly = cfg.spineSans.length;
  for (let offset = 0; offset <= 14; offset += 2) {
    const ply = startPly + offset;
    if (ply > 60) break;
    const counts = {};
    for (const moves of allMatchingGames) {
      if (moves[ply]) counts[moves[ply]] = (counts[moves[ply]] || 0) + 1;
    }
    const total = Object.values(counts).reduce((a, n) => a + n, 0);
    if (total === 0) continue;
    const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 6);
    const sideName = (ply % 2 === 0) ? 'White' : 'Black';
    console.log(`  ply ${ply+1} (${sideName} move ${Math.ceil((ply+1)/2)}, ${total}g): ` +
      sorted.map(([m,n]) => `${m}(${n}=${((n/total*100).toFixed(0))}%)`).join(' '));
  }
}
