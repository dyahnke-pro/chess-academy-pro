#!/usr/bin/env node
// Pick Samay's best decisive WIN that reaches a target endgame type for an
// opening, and print the transition FEN (first ply the target structure is
// reached) + the real endgame move tail to author the plan from (G9.1 endgame
// rule: ground the plan in a REAL game walked into its ending).
//   node pick-samay-endgame-game.mjs <treeStem> <type> [minOpp=1700] [maxTail=14]
// type ∈ R+minor+P | Q+P | R+P | minor+P | K+P
import fs from 'node:fs';
import { Chess } from 'chess.js';

const SRC_DIR = 'data/sources/samayraina-chesscom';
const TREES = 'data/sources/samayraina-trees';
const PLAYER = 'samayraina';
const stem = process.argv[2];
const TARGET = process.argv[3];
const MIN_OPP = Number(process.argv[4]) || 1700;
const MAX_TAIL = Number(process.argv[5]) || 14;

function pgnToSan(t) {
  const i = t.search(/\n\n/); if (i < 0) return null;
  let b = t.slice(i).replace(/\{[^}]*\}/g, '');
  let prev; do { prev = b; b = b.replace(/\([^()]*\)/g, ''); } while (b !== prev);
  b = b.replace(/\b\d+\.+\s*/g, '').replace(/\s*(?:1-0|0-1|1\/2-1\/2|\*)\s*$/, '').trim();
  return b ? b.split(/\s+/).filter(Boolean) : null;
}
function matches(m, p) { if (m.length < p.length) return false; for (let i = 0; i < p.length; i++) if (m[i] !== p[i]) return false; return true; }
function classify(ch) {
  const board = ch.board().flat().filter(Boolean);
  const c = { w:{p:0,n:0,b:0,r:0,q:0}, b:{p:0,n:0,b:0,r:0,q:0} };
  for (const p of board) if (p.type !== 'k') c[p.color][p.type]++;
  const wMin = c.w.n+c.w.b, bMin = c.b.n+c.b.b;
  const wTot = wMin+c.w.r+c.w.q, bTot = bMin+c.b.r+c.b.q;
  if (c.w.q+c.b.q>0){ if (wTot<=2&&bTot<=2) return 'Q+P'; return 'mid'; }
  const tot = wTot+bTot; if (tot>6) return 'mid';
  const rooks=c.w.r+c.b.r, minors=wMin+bMin;
  if (rooks&&minors) return 'R+minor+P';
  if (rooks) return rooks>=3?'double-rook+P':'R+P';
  if (minors) return 'minor+P';
  return 'K+P';
}

const tree = JSON.parse(fs.readFileSync(`${TREES}/${stem}.json`, 'utf8'));
const prefix = tree.minPrefix, color = tree.color;
const files = fs.readdirSync(SRC_DIR).filter((f) => f.endsWith('.jsonl'));
const hits = [];
for (const f of files) {
  for (const line of fs.readFileSync(`${SRC_DIR}/${f}`, 'utf8').split('\n').filter(Boolean)) {
    let g; try { g = JSON.parse(line); } catch { continue; }
    if (!g.pgn || (g.rules && g.rules !== 'chess')) continue;
    const meW = (g.white?.username||'').toLowerCase() === PLAYER;
    if (!meW && (g.black?.username||'').toLowerCase() !== PLAYER) continue;
    if ((meW?'white':'black') !== color) continue;
    const me = meW ? g.white : g.black, them = meW ? g.black : g.white;
    if (me.result !== 'win') continue;                 // WIN only (conversion)
    if ((them.rating||0) < MIN_OPP) continue;
    const sans = pgnToSan(g.pgn);
    if (!sans || !matches(sans, prefix)) continue;
    const ch = new Chess(); const fens = [ch.fen()];
    let ok = true; for (const m of sans) { try { ch.move(m); } catch { ok = false; break; } fens.push(ch.fen()); }
    if (!ok) continue;
    if (classify(ch) !== TARGET) continue;             // FINAL position is the target type
    // transition ply: first index where classify == TARGET and stays
    let trans = -1;
    for (let i = 0; i < sans.length; i++) {
      const c2 = new Chess(fens[i + 1]);
      if (classify(c2) === TARGET) { trans = i + 1; break; }
    }
    if (trans < 0) continue;
    hits.push({ url: g.url, opp: them.rating, oppName: them.username, plies: sans.length,
      transPly: trans, transFen: fens[trans], tail: sans.slice(trans, trans + MAX_TAIL),
      tailFromMove: Math.floor(trans/2)+1, date: g.end_time, sans });
  }
}
hits.sort((a, b) => (b.opp - a.opp) || (b.plies - a.plies));
console.log(`\n${stem} / ${TARGET} — ${hits.length} decisive wins (opp>=${MIN_OPP})`);
for (const h of hits.slice(0, 4)) {
  console.log(`\n  vs ${h.oppName} (${h.opp}) | ${h.plies} plies | ${h.url}`);
  console.log(`  transition at ply ${h.transPly} (move ${h.tailFromMove}) FEN: ${h.transFen}`);
  console.log(`  endgame tail (${h.tail.length}): ${h.tail.join(' ')}`);
}
