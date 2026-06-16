// Generate grounded WHITE anti-opening course entries from the offline masters DB.
// student = White (plays the weapon); opponent = Black (the defender). The weapon
// MAIN line + the defender's top VARIATIONS are walked from real master games
// (G3 — never invented). Contradiction-guarded: skips any id that collides with an
// existing opening, and refuses to emit a line whose pgn equals an existing entry.
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { reachesMiddlegame } from '../src/data/variationMiddlegameDepth.shared.mjs';

const root = new URL('..', import.meta.url).pathname;
const db = JSON.parse(readFileSync(root + 'public/data/openings-masters-db.json', 'utf8')).positions;
const rep = JSON.parse(readFileSync(root + 'src/data/repertoire.json', 'utf8'));
const repArr = Array.isArray(rep) ? rep : rep.openings || Object.values(rep);
const existingIds = new Set(repArr.filter(o => o && o.id).map(o => o.id));
const existingPgns = new Set(repArr.filter(o => o && o.pgn).map(o => sans(o.pgn).join(' ')));
const eco = JSON.parse(readFileSync(root + 'src/data/openings-lichess.json', 'utf8'));
const ecoArr = (Array.isArray(eco) ? eco : eco.openings || Object.values(eco)).filter(e => e && e.pgn && e.name);
const ecoMap = new Map();
for (const e of ecoArr) { const p = sans(e.pgn).join(' '); if (p && !ecoMap.has(p)) ecoMap.set(p, e.name); }

function sans(pgn) { const toks = pgn.trim().split(/\s+/).map(t => t.replace(/^\d+\.(\.\.)?/, '')).filter(t => t && !/^\d+\.?$/.test(t)); const c = new Chess(); const o = []; for (const t of toks) { try { o.push(c.move(t).san); } catch { return []; } } return o; }
const key = f => f.split(' ').slice(0, 4).join(' ');
const movesAt = f => db[key(f)] || [];
function nameFor(s) { for (let l = s.length; l >= 2; l--) { const n = ecoMap.get(s.slice(0, l).join(' ')); if (n) return n; } return null; }
const subName = n => n.includes(':') ? n.split(':').slice(1).join(':').trim() : n;
function walk(start, maxPlies = 28) { const c = new Chess(); for (const s of start) c.move(s); const o = [...start]; while (o.length < maxPlies) { if (reachesMiddlegame(o.join(' ')).pass) break; const ms = movesAt(c.fen()); if (!ms.length) break; const top = ms.slice().sort((a, b) => b.games - a.games)[0]; try { c.move(top.san); o.push(top.san); } catch { break; } } return o; }
const toUci = s => { const c = new Chess(); const u = []; for (const m of s) { const r = c.move(m); u.push(r.from + r.to + (r.promotion || '')); } return { uci: u.join(' '), fen: c.fen() }; };

const SPECS = [
  { id: 'anti-caro-fantasy', name: 'Anti-Caro: Fantasy Variation', eco: 'B12', style: 'aggressive', weapon: 'e4 c6 d4 d5 f3' },
  { id: 'anti-french-advance', name: 'Anti-French: Advance Variation', eco: 'C02', style: 'positional', weapon: 'e4 e6 d4 d5 e5' },
  { id: 'anti-pirc-austrian', name: 'Anti-Pirc: Austrian Attack', eco: 'B09', style: 'aggressive', weapon: 'e4 d6 d4 Nf6 Nc3 g6 f4' },
  { id: 'anti-scandinavian', name: 'Anti-Scandinavian: Main Line', eco: 'B01', style: 'classical', weapon: 'e4 d5 exd5 Qxd5 Nc3' },
  { id: 'anti-alekhine-modern', name: 'Anti-Alekhine: Modern Variation', eco: 'B04', style: 'classical', weapon: 'e4 Nf6 e5 Nd5 d4 d6 Nf3' },
  { id: 'anti-modern-150', name: 'Anti-Modern: 150 Attack', eco: 'B06', style: 'aggressive', weapon: 'e4 g6 d4 Bg7 Nc3 d6 Be3' },
  { id: 'anti-sicilian-rossolimo', name: 'Anti-Sicilian: Rossolimo', eco: 'B30', style: 'positional', weapon: 'e4 c5 Nf3 Nc6 Bb5' },
  { id: 'anti-benoni-push', name: 'Anti-Benoni/Benko: The d5 Push', eco: 'A56', style: 'positional', weapon: 'd4 Nf6 c4 c5 d5' },
  { id: 'anti-englund', name: 'Anti-Englund Gambit', eco: 'A40', style: 'classical', weapon: 'd4 e5 dxe5 Nc6 Nf3' },
];

const out = [];
for (const spec of SPECS) {
  const weapon = sans(spec.weapon);
  if (weapon.length < 3) { console.log(`SKIP ${spec.id}: illegal weapon pgn`); continue; }
  if (existingIds.has(spec.id)) { console.log(`SKIP ${spec.id}: id already exists`); continue; }
  // Find the first DEFENDER fork with REAL choice: walk the most-played line
  // (defender move + White reply) until the defender has >=2 responses above
  // threshold and no single move is >85% dominant. Dominated early moves (the
  // forced ...c5 / ...Bg7) are walked past so chapters are real choices.
  const cc = new Chess(); for (const m of weapon) cc.move(m);
  let forkBase = [...weapon];
  if (cc.turn() !== 'b') { const ms = movesAt(cc.fen()).slice().sort((a,b)=>b.games-a.games); if (ms[0]) { cc.move(ms[0].san); forkBase.push(ms[0].san); } }
  let forkMoves = movesAt(cc.fen()).slice().sort((a,b)=>b.games-a.games);
  for (let d = 0; d < 12; d++) {
    const tot = forkMoves.reduce((s,m)=>s+m.games,0) || 1;
    const real = forkMoves.filter(m=>m.games>=Math.max(4, tot*0.06));
    const topShare = forkMoves.length ? forkMoves[0].games/tot : 1;
    if (real.length >= 2 && topShare < 0.85) break;
    if (!forkMoves.length) break;
    cc.move(forkMoves[0].san); forkBase.push(forkMoves[0].san);
    const wm = movesAt(cc.fen()).slice().sort((a,b)=>b.games-a.games)[0]; if (!wm) { forkMoves=[]; break; } cc.move(wm.san); forkBase.push(wm.san);
    forkMoves = movesAt(cc.fen()).slice().sort((a,b)=>b.games-a.games);
  }
  const total = forkMoves.reduce((s,m)=>s+m.games,0) || 1;
  const mainPgn = walk(forkBase);
  if (existingPgns.has(mainPgn.join(' '))) { console.log(`SKIP ${spec.id}: main line duplicates existing opening`); continue; }
  const rawVars = [];
  for (const m of forkMoves.slice(0, 7)) {
    if (m.games < Math.max(4, total * 0.06)) continue;
    const vMoves = walk([...forkBase, m.san]);
    rawVars.push({ trigger: m.san, ecoName: nameFor(vMoves) || `${m.san} line`, pgn: vMoves.join(' '), pct: Math.round(m.games/total*100), games: m.games });
  }
  const nameCounts = {};
  for (const v of rawVars) nameCounts[v.ecoName] = (nameCounts[v.ecoName]||0)+1;
  const variations = rawVars.map(v => ({ name: nameCounts[v.ecoName] > 1 ? `${subName(v.ecoName)} (${v.trigger})` : subName(v.ecoName), pgn: v.pgn, explanation: '', pct: v.pct, games: v.games }));
  const { uci, fen } = toUci(mainPgn);
  out.push({ id: spec.id, eco: spec.eco, name: spec.name, pgn: mainPgn.join(' '), uci, fen, color: 'white', style: spec.style, isRepertoire: true, overview: null, keyIdeas: null, traps: null, warnings: null, variations: variations.map(({name,pgn,explanation})=>({name,pgn,explanation})), drillAccuracy: 0, drillAttempts: 0, lastStudied: null, woodpeckerReps: 0, woodpeckerSpeed: null, woodpeckerLastDate: null, isFavorite: false });
  console.log(`\n${spec.name}  [${spec.id}]`);
  console.log(`  main: ${mainPgn.join(' ')}  (${mainPgn.length}plies mg=${reachesMiddlegame(mainPgn.join(' ')).pass})`);
  for (const v of variations) console.log(`   - ${String(v.pct+'%').padEnd(4)} ${v.name}  | ${v.pgn.split(' ').slice(0,10).join(' ')}…`);
}
console.log(`\n[dry-run] ${out.length} anti-openings generated (not written — set WRITE=1 to emit)`);
if (process.env.WRITE) { writeFileSync(root + 'src/data/anti-openings.json', JSON.stringify(out, null, 0)); console.log('wrote src/data/anti-openings.json'); }
