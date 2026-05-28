#!/usr/bin/env node
// For each Caro variation, take games matching the variation prefix
// (hundreds of games) and frequency-cluster their middlegame moves
// (plies 12-20) by what Black does NEXT after the opening. Distinct
// clusters with ≥10% frequency become candidate middlegame plans.
// This gives a HONEST count of plans the data actually supports —
// not just what fits at the deep terminus (3-4 games).

import fs from 'node:fs';
import path from 'node:path';

const SRC_DIR = 'data/sources/danielnaroditsky-chesscom';

const VARIATIONS = {
  'advance-c5':       { prefix: ['e4','c6','d4','d5','e5','c5'], color: 'black' },
  'two-knights':      { prefix: ['e4','c6','Nc3'], color: 'black' },
  'kia-reti':         { prefix: ['e4','c6','Nf3'], color: 'black' },
  'exchange':         { prefix: ['e4','c6','d4','d5','exd5','cxd5'], color: 'black' },
  'classical':        { prefix: ['e4','c6','d4','d5','Nc3','dxe4','Nxe4'], color: 'black' },
  'fantasy':          { prefix: ['e4','c6','d4','d5','f3'], color: 'black' },
  'modern-transposition': { prefix: ['e4','c6','d4','g6'], color: 'black' },
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

  // Cluster middlegame by Black's distinctive 12th move (or 11th if Black moved late)
  // Strategy: identify the "first distinct Black plan move" — the move at the END of the opening
  // phase that signals which plan Black is taking. Look at Black moves at plies 11, 13, 15.
  for (const ply of [11, 13, 15, 17]) {
    if (ply >= cfg.prefix.length) {
      const counts = {};
      for (const moves of all) {
        if (moves[ply]) counts[moves[ply]] = (counts[moves[ply]] || 0) + 1;
      }
      const total = Object.values(counts).reduce((a, n) => a + n, 0);
      if (total === 0) continue;
      const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 5);
      const sideName = (ply % 2 === 0) ? 'White' : 'Black';
      console.log('  ply ' + (ply+1) + ' (' + sideName + ', ' + total + ' games): ' + sorted.map(([m,n]) => m+'('+n+'='+((n/total*100).toFixed(0))+'%)').join(' '));
    }
  }
}
