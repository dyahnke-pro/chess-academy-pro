#!/usr/bin/env node
// Wider-corpus endgame classifier for Samay Raina (G9.1 STEP 5 / WIDER-CORPUS
// rule). For each opening, walk EVERY game in his corpus matching the opening's
// identifying minPrefix, classify the FINAL-position endgame structure, and
// frequency-rank. Types reached by >=~12% are candidate endgame plans; if his
// games mostly end mid-board (blitz/bullet), the endgame section self-hides.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const SRC_DIR = 'data/sources/samayraina-chesscom';
const TREES = 'data/sources/samayraina-trees';

// opening tree file stem -> { proId }
const OPENINGS = {
  'samay-open-sicilian': 'pro-samayraina-open-sicilian',
  'samay-ruy': 'pro-samayraina-ruy',
  'samay-italian': 'pro-samayraina-italian',
  'samay-french-white': 'pro-samayraina-french-white',
  'samay-caro-white': 'pro-samayraina-caro-white',
  'samay-open-e5': 'pro-samayraina-open-e5',
  'samay-sicilian-black': 'pro-samayraina-sicilian-black',
  'samay-scandi-black': 'pro-samayraina-scandi',
};

function pgnToSan(pgnText) {
  const i = pgnText.search(/\n\n/);
  if (i < 0) return null;
  let b = pgnText.slice(i).replace(/\{[^}]*\}/g, '');
  let prev; do { prev = b; b = b.replace(/\([^()]*\)/g, ''); } while (b !== prev);
  b = b.replace(/\b\d+\.+\s*/g, '').replace(/\s*(?:1-0|0-1|1\/2-1\/2|\*)\s*$/, '').trim();
  return b ? b.split(/\s+/).filter(Boolean) : null;
}
function matches(m, p) { if (m.length < p.length) return false; for (let i = 0; i < p.length; i++) if (m[i] !== p[i]) return false; return true; }

function classify(chess) {
  const board = chess.board().flat().filter(Boolean);
  const c = { w: { p:0,n:0,b:0,r:0,q:0 }, b: { p:0,n:0,b:0,r:0,q:0 } };
  for (const p of board) if (p.type !== 'k') c[p.color][p.type]++;
  const wMin = c.w.n + c.w.b, bMin = c.b.n + c.b.b;
  const wTot = wMin + c.w.r + c.w.q, bTot = bMin + c.b.r + c.b.q;
  if (c.w.q + c.b.q > 0) {
    if (wTot <= 2 && bTot <= 2) return 'Q+P';
    return 'middlegame (Q on board)';
  }
  const tot = wTot + bTot;
  if (tot > 6) return 'middlegame (heavy)';
  const rooks = c.w.r + c.b.r, minors = wMin + bMin;
  if (rooks && minors) return 'R+minor+P';
  if (rooks) return rooks >= 3 ? 'double-rook+P' : 'R+P';
  if (minors) {
    if (c.w.b === 1 && c.b.b === 1 && !c.w.n && !c.b.n) return 'bishop endgame';
    return 'minor+P';
  }
  return 'K+P';
}

const PLAYER = 'samayraina';
const files = fs.readdirSync(SRC_DIR).filter((f) => f.endsWith('.jsonl'));

for (const [stem, proId] of Object.entries(OPENINGS)) {
  const tree = JSON.parse(fs.readFileSync(`${TREES}/${stem}.json`, 'utf8'));
  const prefix = tree.minPrefix;
  const color = tree.color;
  const tally = {}; const decisiveTally = {};
  let matched = 0, reachedEndgame = 0, decisive = 0;
  for (const f of files) {
    for (const line of fs.readFileSync(`${SRC_DIR}/${f}`, 'utf8').split('\n').filter(Boolean)) {
      let g; try { g = JSON.parse(line); } catch { continue; }
      if (!g.pgn || (g.rules && g.rules !== 'chess')) continue;
      const meW = (g.white?.username || '').toLowerCase() === PLAYER;
      if (!meW && (g.black?.username || '').toLowerCase() !== PLAYER) continue;
      if ((meW ? 'white' : 'black') !== color) continue;
      const sans = pgnToSan(g.pgn);
      if (!sans || !matches(sans, prefix)) continue;
      matched++;
      const ch = new Chess();
      let ok = true; for (const m of sans) { try { ch.move(m); } catch { ok = false; break; } }
      if (!ok) continue;
      const type = classify(ch);
      tally[type] = (tally[type] || 0) + 1;
      const me = meW ? g.white : g.black;
      const won = me.result === 'win';
      const lost = ['checkmated','resigned','timeout','abandoned'].includes(me.result);
      const isDecisive = won || lost;
      if (!type.startsWith('middlegame')) {
        reachedEndgame++;
        if (isDecisive) { decisive++; decisiveTally[type] = (decisiveTally[type] || 0) + 1; }
      }
    }
  }
  console.log(`\n=== ${proId}  (prefix: ${prefix.join(' ')}, color: ${color}) ===`);
  console.log(`matched games: ${matched} | reached endgame: ${reachedEndgame} (${matched ? (100*reachedEndgame/matched).toFixed(0) : 0}%) | decisive endgames: ${decisive}`);
  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  for (const [t, n] of sorted) {
    const pct = matched ? (100 * n / matched).toFixed(0) : 0;
    const dec = decisiveTally[t] || 0;
    const flag = (!t.startsWith('middlegame') && pct >= 12) ? '  <-- CANDIDATE' : '';
    console.log(`   ${t.padEnd(24)} ${String(n).padStart(5)}  ${String(pct).padStart(3)}%   decisive:${dec}${flag}`);
  }
}
