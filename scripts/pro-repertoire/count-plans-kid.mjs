#!/usr/bin/env node
// Count distinct middlegame plans across the KID corpus per variation.
// Per G9.2: each cluster with ≥10% frequency at a key middlegame ply is
// ONE candidate plan. Build that many.

import fs from 'node:fs';
import path from 'node:path';

const SRC_DIR = 'data/sources/danielnaroditsky-chesscom';

const VARIATIONS = {
  'classical-mainline': { prefix: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','Nf3','O-O','Be2'], color: 'black' },
  'fianchetto':         { prefix: ['d4','Nf6','c4','g6','g3'], color: 'black' },
  'anti-kid-nf3':       { prefix: ['d4','Nf6','c4','g6','Nf3'], color: 'black' },
  'makogonov':          { prefix: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','h3'], color: 'black' },
  'saemisch':           { prefix: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','f3'], color: 'black' },
  'petrosian-nge2':     { prefix: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','Nge2'], color: 'black' },
  'four-pawns':         { prefix: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','f4'], color: 'black' },
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

for (const [vKey, cfg] of Object.entries(VARIATIONS)) {
  const all = [];
  const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.jsonl'));
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
      if (!m || !matches(m, cfg.prefix)) continue;
      all.push(m);
    }
  }
  console.log('\n=== ' + vKey + ' (' + all.length + ' games matching prefix) ===');

  // Cluster Black's moves at key middlegame plies (KID — student is Black).
  // Black moves live at odd 0-indexed plies: 13, 15, 17, 19, 21.
  for (const ply of [13, 15, 17, 19, 21]) {
    if (ply >= cfg.prefix.length) {
      const counts = {};
      for (const moves of all) {
        if (moves[ply]) counts[moves[ply]] = (counts[moves[ply]] || 0) + 1;
      }
      const total = Object.values(counts).reduce((a, n) => a + n, 0);
      if (total === 0) continue;
      const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 6);
      const sideName = (ply % 2 === 0) ? 'White' : 'Black';
      console.log('  ply ' + (ply+1) + ' (' + sideName + ', ' + total + ' games): ' + sorted.map(([m,n]) => m+'('+n+'='+((n/total*100).toFixed(0))+'%)').join(' '));
    }
  }
}
