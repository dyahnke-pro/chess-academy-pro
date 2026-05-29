#!/usr/bin/env node
// Per §1b show-your-work: extract REAL endgame positions + next-6-plies
// for each new variation. Picks the highest-opponent decisive game that
// reaches the dominant endgame type (R+min+P) and outputs the FEN at
// entry-to-endgame + the actual continuation. Endgame plan authoring
// uses THIS output as the literal source — no fabricated FENs, no
// composed continuations.

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
  if (counts.w.q + counts.b.q > 0) return null; // need queens off
  const totalRooks = counts.w.r + counts.b.r;
  const totalMinors = wMinor + bMinor;
  if (totalRooks > 0 && totalMinors > 0) return 'R+min+P';
  return null;
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

      // Replay; classify final position
      const chess = new Chess();
      let ok = true;
      for (const san of m) { try { chess.move(san); } catch { ok = false; break; } }
      if (!ok) continue;
      if (classifyEndgame(chess) !== 'R+min+P') continue;

      // Find the first ply where the board went R+min+P (endgame entry)
      const replay = new Chess();
      let entryPly = -1, entryFen = null;
      for (let i = 0; i < m.length; i++) {
        try { replay.move(m[i]); } catch { break; }
        if (i < 30) continue; // wait until past opening
        if (classifyEndgame(replay) === 'R+min+P') { entryPly = i; entryFen = replay.fen(); break; }
      }
      if (entryPly < 0 || m.length - entryPly < 7) continue;

      candidates.push({
        url: g.url, oppRating, result,
        opp: cfg.color === 'white' ? g.black?.username : g.white?.username,
        totalPlies: m.length,
        entryPly,
        entryFen,
        nextPlies: m.slice(entryPly + 1, entryPly + 9),
      });
    }
  }
  candidates.sort((a,b) => b.oppRating - a.oppRating);
  const pick = candidates[0];
  console.log(`\n=== ${vKey} ===  (${candidates.length} R+min+P-converting wins ≥2200)`);
  if (!pick) {
    console.log('  no candidates — fall back to lower rating bar or skip endgame plan');
    continue;
  }
  console.log(`  opp: ${pick.opp} (${pick.oppRating}), ${pick.result}, ${pick.totalPlies} plies`);
  console.log(`  url: ${pick.url}`);
  console.log(`  entry-to-endgame at ply ${pick.entryPly} (move ${Math.floor(pick.entryPly/2)+1})`);
  console.log(`  entry FEN: ${pick.entryFen}`);
  console.log(`  next 8 plies: ${pick.nextPlies.join(' ')}`);
}
