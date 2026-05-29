#!/usr/bin/env node
// Wider-corpus endgame classification for the 7 newly-added Naroditsky
// variation tabs (4 KIA + 3 Rossolimo). Per G9.2 wider-corpus rule:
// classify the endgame structure at the final position of EVERY game
// matching each variation's identifying prefix — hundreds of games per
// variation, NOT the 3-4 at the deep terminus. ≥10% clusters are
// candidate endgame plans (STEP 10).

import fs from 'node:fs';
import path from 'node:path';
import { Chess } from 'chess.js';

const SRC_DIR = 'data/sources/danielnaroditsky-chesscom';

const VARIATIONS = {
  'kia-vs-e5':    { prefix: ['Nf3','e5'], color: 'white' },
  'kia-vs-c6':    { prefix: ['Nf3','c6'], color: 'white' },
  'kia-vs-b6':    { prefix: ['Nf3','b6'], color: 'white' },
  'kia-vs-e6':    { prefix: ['Nf3','e6'], color: 'white' },
  'ross-c3':      { prefix: ['e4','c5','Nf3','d6','c3'], color: 'white' },
  'ross-bc4-d6':  { prefix: ['e4','c5','Nf3','d6','Bc4'], color: 'white' },
  'ross-g6':      { prefix: ['e4','c5','Nf3','g6','c3'], color: 'white' },
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

function classifyEndgame(chess) {
  const board = chess.board().flat().filter(Boolean);
  const counts = { w: { p:0, n:0, b:0, r:0, q:0, k:0 }, b: { p:0, n:0, b:0, r:0, q:0, k:0 } };
  for (const p of board) counts[p.color][p.type]++;
  const wMinor = counts.w.n + counts.w.b;
  const bMinor = counts.b.n + counts.b.b;
  const wTotalPieces = wMinor + counts.w.r + counts.w.q;
  const bTotalPieces = bMinor + counts.b.r + counts.b.q;

  if (counts.w.q + counts.b.q > 0) {
    if (wTotalPieces <= 2 && bTotalPieces <= 2) {
      if (counts.w.q + counts.b.q === 2) return 'Q+Q';
      return 'Q+P';
    }
    return 'middlegame (Q + pieces)';
  }
  const totalRooks = counts.w.r + counts.b.r;
  const totalMinors = wMinor + bMinor;
  if (totalRooks === 0 && totalMinors === 0) return 'K+P';
  if (totalRooks === 0 && totalMinors > 0) return 'minor pieces + P';
  if (totalRooks > 0 && totalMinors === 0) return 'R+P';
  if (totalRooks > 0 && totalMinors > 0) return 'R + minor + P';
  return 'other';
}

const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.jsonl'));
console.log(`scanning ${files.length} jsonl files...\n`);

for (const [vKey, cfg] of Object.entries(VARIATIONS)) {
  let total = 0, classified = 0;
  const bucket = {};
  const decisiveBucket = {};
  let decisive = 0;
  let wins = 0;

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

      total++;
      const chess = new Chess();
      let ok = true;
      for (const san of m) {
        try { chess.move(san); } catch { ok = false; break; }
      }
      if (!ok) continue;
      classified++;

      const board = chess.board().flat().filter(Boolean);
      const nonKings = board.filter(p => p.type !== 'k').length;
      if (nonKings > 22) continue;

      const kind = classifyEndgame(chess);
      bucket[kind] = (bucket[kind] || 0) + 1;

      const result = g.pgn.match(/\[Result "([^"]+)"\]/)?.[1] || '*';
      if (result === '1-0' || result === '0-1') {
        decisive++;
        decisiveBucket[kind] = (decisiveBucket[kind] || 0) + 1;
        if ((cfg.color === 'white' && result === '1-0') || (cfg.color === 'black' && result === '0-1')) wins++;
      }
    }
  }

  console.log(`\n=== ${vKey} ===`);
  console.log(`  ${total} games match prefix, ${classified} replayed cleanly, ${wins} wins`);
  console.log(`  endgame distribution (games reaching <=22 non-king pieces):`);
  const sorted = Object.entries(bucket).sort((a,b) => b[1] - a[1]);
  const subtotal = sorted.reduce((s, [,n]) => s + n, 0);
  for (const [k, n] of sorted) {
    console.log(`    ${k.padEnd(28)} ${String(n).padStart(4)}  (${(n/subtotal*100).toFixed(1)}% of endgames, ${(n/total*100).toFixed(1)}% of all games)`);
  }
  console.log(`  decisive-only (${decisive} games):`);
  const dsorted = Object.entries(decisiveBucket).sort((a,b) => b[1] - a[1]);
  const dtotal = dsorted.reduce((s, [,n]) => s + n, 0);
  for (const [k, n] of dsorted) {
    console.log(`    ${k.padEnd(28)} ${String(n).padStart(4)}  (${(n/dtotal*100).toFixed(1)}% of decisive endgames)`);
  }
}
