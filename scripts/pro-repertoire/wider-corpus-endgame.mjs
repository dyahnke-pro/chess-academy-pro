#!/usr/bin/env node
// Per G9.2 wider-corpus rule: classify endgame types across the FULL
// game corpus matching each Caro variation prefix (not just the 3-4
// games at the deep terminus). The terminus sample is too small to
// claim "no endgame data exists for X" — instead we walk every game
// matching the variation's spine, look at the FINAL position, and
// bucket the endgame structure.

import fs from 'node:fs';
import path from 'node:path';
import { Chess } from 'chess.js';

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

// Classify endgame by the final position. Inputs: chess.js after the
// final move was made. Look at piece counts.
function classifyEndgame(chess) {
  const board = chess.board().flat().filter(Boolean);
  const counts = { w: { p:0, n:0, b:0, r:0, q:0, k:0 }, b: { p:0, n:0, b:0, r:0, q:0, k:0 } };
  for (const p of board) counts[p.color][p.type]++;
  const wMinor = counts.w.n + counts.w.b;
  const bMinor = counts.b.n + counts.b.b;
  const wMajor = counts.w.r + counts.w.q;
  const bMajor = counts.b.r + counts.b.q;
  const wTotalPieces = wMinor + counts.w.r + counts.w.q;
  const bTotalPieces = bMinor + counts.b.r + counts.b.q;

  // Has queens still on the board → middlegame-ish unless almost no other pieces
  if (counts.w.q + counts.b.q > 0) {
    if (wTotalPieces <= 2 && bTotalPieces <= 2) {
      if (counts.w.q + counts.b.q === 2) return 'Q+Q';
      return 'Q+P';
    }
    return 'middlegame (Q + pieces)';
  }
  // Queens off
  const totalRooks = counts.w.r + counts.b.r;
  const totalMinors = wMinor + bMinor;
  if (totalRooks === 0 && totalMinors === 0) return 'K+P';
  if (totalRooks === 0 && totalMinors > 0) return 'minor pieces + P';
  if (totalRooks > 0 && totalMinors === 0) return 'R+P';
  if (totalRooks > 0 && totalMinors > 0) return 'R + minor + P';
  return 'other';
}

const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.jsonl'));

for (const [vKey, cfg] of Object.entries(VARIATIONS)) {
  let total = 0, classified = 0;
  const bucket = {};
  const decisiveBucket = {};
  let decisive = 0;

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
      // Replay the game to its final position
      const chess = new Chess();
      let ok = true;
      for (const san of m) {
        try { chess.move(san); }
        catch { ok = false; break; }
      }
      if (!ok) continue;
      classified++;

      // Only consider games that actually entered endgame depth (>= move 40 == 80 plies, OR fewer pieces)
      // Use piece count: if total non-king pieces ≤ 12 each, count it as endgame
      const board = chess.board().flat().filter(Boolean);
      const nonKings = board.filter(p => p.type !== 'k').length;
      if (nonKings > 22) continue; // both sides still developed

      const kind = classifyEndgame(chess);
      bucket[kind] = (bucket[kind] || 0) + 1;

      // Decisive subset
      const result = g.pgn.match(/\[Result "([^"]+)"\]/)?.[1] || '*';
      if (result === '1-0' || result === '0-1') {
        decisive++;
        decisiveBucket[kind] = (decisiveBucket[kind] || 0) + 1;
      }
    }
  }

  console.log(`\n=== ${vKey} ===`);
  console.log(`  ${total} games match prefix, ${classified} replayed cleanly`);
  console.log(`  endgame distribution (games reaching <=22 pieces):`);
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
