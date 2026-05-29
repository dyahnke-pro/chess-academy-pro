#!/usr/bin/env node
// Per §1b show-your-work: find the most-played middlegame continuation
// past each variation spine terminus for the 3 Caro variations missing
// plans (Advance Bf5, Panov, d3 Sideline). Aggregates Naroditsky's
// actual game continuations and ranks moves by frequency at each ply.

import fs from 'node:fs';
import path from 'node:path';
import { Chess } from 'chess.js';

const SRC_DIR = 'data/sources/danielnaroditsky-chesscom';

// Each variation: the spine prefix (from deep-build), the WHITE/BLACK
// student side. We walk past the prefix and aggregate the next 6 plies.
const VARIATIONS = {
  'advance-bf5': {
    spine: ['e4','c6','d4','d5','e5','Bf5','Nf3','e6','Be2','c5','Be3'],
    color: 'black',
  },
  'panov': {
    spine: ['e4','c6','d4','d5','exd5','cxd5','c4','Nf6','Nc3','Nc6','Bg5','Be6','Be2','Qa5','c5','Ne4','Bd2','Nxd2','Qxd2','g6','Nf3','Bg7'],
    color: 'black',
  },
  'd3-sideline': {
    spine: ['e4','c6','d3','d5','Nd2','e5','g3','Bd6','Bg2','Nf6','Ngf3','O-O','O-O','Re8','b3','a5','a4','Na6','Bb2','Nb4','Re1','dxe4','Nxe4','Nxe4','dxe4'],
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
  const continuations = []; // array of move arrays past the spine
  const games = [];

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
      if (!m || !matches(m, cfg.spine)) continue;

      const chess = new Chess();
      let ok = true;
      for (const san of m.slice(0, cfg.spine.length)) {
        try { chess.move(san); } catch { ok = false; break; }
      }
      if (!ok) continue;

      const past = m.slice(cfg.spine.length, cfg.spine.length + 8);
      if (past.length < 6) continue;

      const result = g.pgn.match(/\[Result "([^"]+)"\]/)?.[1] || '*';
      const win = (cfg.color === 'white' && result === '1-0') || (cfg.color === 'black' && result === '0-1');
      const oppRating = cfg.color === 'white' ? (g.black?.rating || 0) : (g.white?.rating || 0);

      continuations.push(past);
      games.push({ url: g.url, oppRating, win, result, opp: cfg.color === 'white' ? g.black?.username : g.white?.username, past });
    }
  }

  console.log(`\n=== ${vKey} ===  (${continuations.length} games past spine)`);

  // Aggregate the most-played first move past spine
  const ply0Count = {};
  for (const c of continuations) ply0Count[c[0]] = (ply0Count[c[0]] || 0) + 1;
  const sortedPly0 = Object.entries(ply0Count).sort((a,b) => b[1] - a[1]).slice(0, 5);
  console.log(`  most-played NEXT move (White's reply at ply ${cfg.spine.length}):`);
  for (const [m, n] of sortedPly0) console.log(`    ${m.padEnd(8)} ${n} games (${(n/continuations.length*100).toFixed(0)}%)`);

  // For the top move, drill down into ply 1 (Black's reply)
  if (sortedPly0.length > 0) {
    const topMove = sortedPly0[0][0];
    const filtered = continuations.filter(c => c[0] === topMove);
    const ply1Count = {};
    for (const c of filtered) ply1Count[c[1]] = (ply1Count[c[1]] || 0) + 1;
    const sortedPly1 = Object.entries(ply1Count).sort((a,b) => b[1] - a[1]).slice(0, 3);
    console.log(`  after ${topMove}, top responses:`);
    for (const [m, n] of sortedPly1) console.log(`    ${m.padEnd(8)} ${n} games (${(n/filtered.length*100).toFixed(0)}%)`);

    // For the top ply1 move, drill into top ply2
    if (sortedPly1.length > 0) {
      const topReply = sortedPly1[0][0];
      const f2 = filtered.filter(c => c[1] === topReply);
      const ply2Count = {};
      for (const c of f2) ply2Count[c[2]] = (ply2Count[c[2]] || 0) + 1;
      const sortedPly2 = Object.entries(ply2Count).sort((a,b) => b[1] - a[1]).slice(0, 3);
      console.log(`  after ${topMove} ${topReply}, top White moves:`);
      for (const [m, n] of sortedPly2) console.log(`    ${m.padEnd(8)} ${n} games (${(n/f2.length*100).toFixed(0)}%)`);

      if (sortedPly2.length > 0) {
        const topMove2 = sortedPly2[0][0];
        const f3 = f2.filter(c => c[2] === topMove2);
        const ply3Count = {};
        for (const c of f3) ply3Count[c[3]] = (ply3Count[c[3]] || 0) + 1;
        const sortedPly3 = Object.entries(ply3Count).sort((a,b) => b[1] - a[1]).slice(0, 3);
        console.log(`  after ${topMove} ${topReply} ${topMove2}, top Black moves:`);
        for (const [m, n] of sortedPly3) console.log(`    ${m.padEnd(8)} ${n} games (${(n/f3.length*100).toFixed(0)}%)`);
      }
    }
  }

  // Pick best representative WIN game
  const wins = games.filter(g => g.win && g.oppRating >= 2200);
  wins.sort((a,b) => b.oppRating - a.oppRating);
  if (wins.length > 0) {
    const top = wins[0];
    console.log(`  representative WIN: ${top.opp} (${top.oppRating}) — past-spine first 8: ${top.past.join(' ')}`);
    console.log(`    url: ${top.url}`);
  }
}
