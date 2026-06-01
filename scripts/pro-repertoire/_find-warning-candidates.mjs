#!/usr/bin/env node
// Find, per Aman opening, the most common SHORT student deviations that
// correlate with LOSSES — real "watch out for" candidates. Also surface the
// opponent's most common tries at the student's key decision points (trap
// candidates). Grounds warnings/traps in his actual 35k-game corpus.
import fs from 'node:fs';
import path from 'node:path';
import { Chess } from 'chess.js';

const PLAYER = 'chessbrah';
const DIR = path.join('data', 'sources', `${PLAYER}-chesscom`);
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.jsonl'));

// opening -> { color, prefix(SAN[]) } — the identifying trunk
const OPENINGS = {
  'sicilian-kan':  { color: 'black', prefix: ['e4', 'c5', 'Nf3', 'e6'] },
  'nimzo-indian':  { color: 'black', prefix: ['d4', 'Nf6', 'c4', 'e6'] },
  'caro-kann':     { color: 'black', prefix: ['e4', 'c6'] },
  'reti':          { color: 'white', prefix: ['Nf3'] },
  'ruy-lopez':     { color: 'white', prefix: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'] },
  'open-sicilian': { color: 'white', prefix: ['e4', 'c5', 'Nf3', 'd6', 'd4'] },
  'rossolimo':     { color: 'white', prefix: ['e4', 'c5', 'Nf3', 'Nc6', 'Bb5'] },
  'french-white':  { color: 'white', prefix: ['e4', 'e6', 'd4', 'd5', 'Nc3'] },
  'anti-caro':     { color: 'white', prefix: ['e4', 'c6', 'Nc3'] },
};

const TARGET = process.argv[2];
const want = TARGET ? { [TARGET]: OPENINGS[TARGET] } : OPENINGS;

function resultOf(r) {
  if (r === 'win') return 'win';
  if (['checkmated', 'resigned', 'timeout', 'abandoned', 'lose'].includes(r)) return 'loss';
  return 'draw';
}

// For each opening, after the prefix, look at the position where the STUDENT
// is to move at ply prefix.length, prefix.length+2, ... and record the student
// move played + game result. Loss-heavy student moves at a branch = warnings.
const data = {};
for (const k of Object.keys(want)) data[k] = { lossLines: new Map(), oppTries: new Map(), total: 0 };

for (const f of files) {
  const lines = fs.readFileSync(path.join(DIR, f), 'utf8').split('\n').filter(Boolean);
  for (const line of lines) {
    let g;
    try { g = JSON.parse(line); } catch { continue; }
    if (g.rules && g.rules !== 'chess') continue;
    const wU = (g.white?.username || '').toLowerCase();
    const bU = (g.black?.username || '').toLowerCase();
    const isW = wU === PLAYER, isB = bU === PLAYER;
    if (!isW && !isB) continue;
    if (!g.pgn) continue;
    let chess;
    try { chess = new Chess(); chess.loadPgn(g.pgn, { sloppy: true }); } catch { continue; }
    const hist = chess.history();
    const studentColor = isW ? 'white' : 'black';
    const res = resultOf(isW ? g.white.result : g.black.result);

    for (const [k, cfg] of Object.entries(want)) {
      if (cfg.color !== studentColor) continue;
      // match prefix
      if (hist.length < cfg.prefix.length + 4) continue;
      let ok = true;
      for (let i = 0; i < cfg.prefix.length; i++) if (hist[i] !== cfg.prefix[i]) { ok = false; break; }
      if (!ok) continue;
      data[k].total++;
      // student-to-move plies after prefix: capture the 12-ply window
      const window = hist.slice(0, cfg.prefix.length + 12).join(' ');
      if (res === 'loss') {
        // record the 8-ply continuation past prefix as a loss signature
        const sig = hist.slice(cfg.prefix.length, cfg.prefix.length + 8).join(' ');
        data[k].lossLines.set(sig, (data[k].lossLines.get(sig) || 0) + 1);
      }
      // opponent's first move past prefix (their try)
      const oppMove = hist[cfg.prefix.length];
      data[k].oppTries.set(oppMove, (data[k].oppTries.get(oppMove) || 0) + 1);
    }
  }
}

for (const [k, d] of Object.entries(data)) {
  console.log(`\n######## ${k}  (matched=${d.total}) ########`);
  console.log('TOP LOSS SIGNATURES (8-ply past prefix, ≥3 losses):');
  [...d.lossLines.entries()].sort((a, b) => b[1] - a[1]).filter(([, n]) => n >= 3).slice(0, 12)
    .forEach(([sig, n]) => console.log(`  ${String(n).padStart(3)}L  ${sig}`));
}
