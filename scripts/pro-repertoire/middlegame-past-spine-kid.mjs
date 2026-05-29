#!/usr/bin/env node
// Find the actual middlegame continuations past the KID spine
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
  'classical-mainline': {
    spineSans: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','Nf3','O-O','Be2','e5','O-O','exd4','Nxd4','Re8','f3','Nc6','Be3','Nh5','Qd2','Nf4','Bxf4','Nxd4','Bd3','c5','Bh6','Be6','Bxg7','Kxg7'],
    color: 'black',
  },
  'fianchetto': {
    spineSans: ['d4','Nf6','c4','g6','g3','Bg7','Bg2','O-O','Nc3','d6','Nf3','Nbd7','O-O','e5','e4','c6','h3','Qa5','Be3','exd4','Nxd4','Re8'],
    color: 'black',
  },
  'anti-kid-nf3': {
    spineSans: ['d4','Nf6','c4','g6','Nf3','Bg7','g3','O-O','Bg2','d6','O-O','Nbd7','Nc3','e5','e4','c6','h3','Qa5','Re1','exd4','Nxd4','Re8'],
    color: 'black',
  },
  'makogonov': {
    spineSans: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','h3','O-O','Be3','c6','Nf3','Na6','Be2','e5','d5','Nh5','O-O','Nf4','Re1','Nxe2+','Rxe2','c5','Qd2','f5','exf5','gxf5','Bg5','Qd7'],
    color: 'black',
  },
  'saemisch': {
    spineSans: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','f3','O-O','Be3','a6','Qd2','c5','Nge2','Nc6','Rd1','cxd4','Nxd4','Nxd4','Bxd4','Be6','b3','Rc8','Be2','Qa5','O-O','Nd7','Bxg7','Kxg7'],
    color: 'black',
  },
  'petrosian-nge2': {
    spineSans: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','Nge2','O-O','f3','c6','Be3','a6','c5','b5','cxd6','exd6','Nf4','Re8','Be2','b4','Na4','Nd5','Bd2'],
    color: 'black',
  },
  'four-pawns': {
    spineSans: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','f4','O-O','Nf3','e5','fxe5','dxe5','d5','c5','Bd3','Ne8','O-O','Nd6','Be3','Nd7'],
    color: 'black',
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
