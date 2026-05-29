#!/usr/bin/env node
// Extract real R+min+P endgame entry positions + next 8 plies for each
// of the 10 Caro variations. Picks the highest-rated decisive Black
// win that reached R+min+P. Output drives caro endgame plan authoring.

import fs from 'node:fs';
import path from 'node:path';
import { Chess } from 'chess.js';

const SRC_DIR = 'data/sources/danielnaroditsky-chesscom';

const VARIATIONS = {
  'two-knights':  { prefix: ['e4','c6','Nc3','d5','Nf3'], color: 'black' },
  'classical':    { prefix: ['e4','c6','Nc3','d5','Nf3','Bg4'], color: 'black' },
  'exchange':     { prefix: ['e4','c6','d4','d5','exd5','cxd5'], color: 'black' },
  'advance-c5':   { prefix: ['e4','c6','d4','d5','e5','c5'], color: 'black' },
  'advance-bf5':  { prefix: ['e4','c6','d4','d5','e5','Bf5'], color: 'black' },
  'fantasy':      { prefix: ['e4','c6','d4','d5','f3'], color: 'black' },
  'kia-reti':     { prefix: ['Nf3','c6'], color: 'black' },
  'modern-trans': { prefix: ['e4','c6','d4','g6'], color: 'black' },
  'panov':        { prefix: ['e4','c6','d4','d5','exd5','cxd5','c4'], color: 'black' },
  'd3-sideline':  { prefix: ['e4','c6','d3'], color: 'black' },
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

function isRMinP(chess) {
  const board = chess.board().flat().filter(Boolean);
  const counts = { w: { p:0, n:0, b:0, r:0, q:0, k:0 }, b: { p:0, n:0, b:0, r:0, q:0, k:0 } };
  for (const p of board) counts[p.color][p.type]++;
  if (counts.w.q + counts.b.q > 0) return false;
  const totalRooks = counts.w.r + counts.b.r;
  const totalMinors = counts.w.n + counts.w.b + counts.b.n + counts.b.b;
  return totalRooks > 0 && totalMinors > 0;
}

const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.jsonl'));

for (const [vKey, cfg] of Object.entries(VARIATIONS)) {
  const candidates = [];
  for (const f of files) {
    const lines = fs.readFileSync(path.join(SRC_DIR, f), 'utf8').split('\n').filter(Boolean);
    for (const line of lines) {
      let g; try { g = JSON.parse(line); } catch { continue; }
      if (!g.pgn) continue;
      const isWhite = (g.white?.username || '').toLowerCase() === 'danielnaroditsky';
      const isBlack = (g.black?.username || '').toLowerCase() === 'danielnaroditsky';
      if (cfg.color === 'white' && !isWhite) continue;
      if (cfg.color === 'black' && !isBlack) continue;
      const m = pgnToSan(g.pgn);
      if (!m || !matches(m, cfg.prefix)) continue;

      const result = g.pgn.match(/\[Result "([^"]+)"\]/)?.[1] || '*';
      const win = (cfg.color === 'white' && result === '1-0') || (cfg.color === 'black' && result === '0-1');
      if (!win) continue;
      const oppRating = cfg.color === 'white' ? (g.black?.rating || 0) : (g.white?.rating || 0);
      if (oppRating < 2200) continue;
      if (m.length < 50) continue;

      const chess = new Chess();
      let ok = true;
      for (const san of m) { try { chess.move(san); } catch { ok = false; break; } }
      if (!ok) continue;
      if (!isRMinP(chess)) continue;

      const replay = new Chess();
      let entryPly = -1, entryFen = null;
      for (let i = 0; i < m.length; i++) {
        try { replay.move(m[i]); } catch { break; }
        if (i < 30) continue;
        if (isRMinP(replay)) { entryPly = i; entryFen = replay.fen(); break; }
      }
      if (entryPly < 0 || m.length - entryPly < 7) continue;

      candidates.push({
        url: g.url, oppRating, result,
        opp: cfg.color === 'white' ? g.black?.username : g.white?.username,
        totalPlies: m.length, entryPly, entryFen,
        nextPlies: m.slice(entryPly + 1, entryPly + 9),
      });
    }
  }
  candidates.sort((a,b) => b.oppRating - a.oppRating);
  const pick = candidates[0];
  console.log(`\n=== ${vKey} ===  (${candidates.length} R+min+P-winning games ≥2200)`);
  if (!pick) { console.log('  no candidates'); continue; }
  console.log(`  opp: ${pick.opp} (${pick.oppRating}), result ${pick.result}, ${pick.totalPlies} plies`);
  console.log(`  url: ${pick.url}`);
  console.log(`  entry-ply ${pick.entryPly} (move ${Math.floor(pick.entryPly/2)+1})`);
  console.log(`  fen: ${pick.entryFen}`);
  console.log(`  next 8: ${pick.nextPlies.join(' ')}`);
}
