#!/usr/bin/env node
// Explorer + Stockfish SUBLINE fallback for ANY pro opening whose own game tree
// is too thin to yield sublines (David 2026-07-02: "use stockfish for sublines if
// you can't find pro games. I don't want to leave any sublines out. This app will
// be as complete as we can possibly make it").
//
// The tree builder (build-pro-sublines.mjs) is the PRIMARY path — real pro moves.
// When the pro barely played an opening (e.g. GothamChess Stafford-refute = 1 game,
// Milner-Barry = 14), we derive its sublines from the masters/club EXPLORER (real
// human games — a DB query, NOT invention, G3-safe) and, where the explorer runs
// dry before a middlegame, extend along Stockfish best-play. Same teach-both model:
// engine-eval the terminus from the STUDENT's side, flag `dubious` + compute the
// `engineBest` fix when the practical line is losing. Every move chess.js-legal.
// No player names (depersonalized). Merges pro-* keys into course-sublines.json.
//
// Usage: node scripts/pro-repertoire/build-explorer-sublines.mjs <pro-opening-id> [--write]
// Generalises build-dragodorf-sublines.mjs (color-aware; divergence-floor est).
import { readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { Chess } from 'chess.js';
import { reachesMiddlegame } from '../../src/data/variationMiddlegameDepth.shared.mjs';

const root = new URL('../../', import.meta.url).pathname;
const PROXY = 'https://chess-academy-pro.vercel.app/api/lichess-explorer';
const arg = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : process.env.PRO_OPENING;
const write = process.argv.includes('--write');
if (!arg) { console.error('need a pro-opening-id (arg or PRO_OPENING env)'); process.exit(1); }

// --- engine (persistent, serialised — same pattern as build-pro-sublines.mjs) ---
const engine = spawn('/usr/games/stockfish');
let dead = false; engine.on('error', () => { dead = true; });
let q = Promise.resolve();
function analyse(fen, depth = 14) {
  const run = () => new Promise((res) => {
    if (dead) return res(null);
    let cp = null, uci = null, done = false;
    const on = (d) => {
      const s = d.toString();
      const sc = s.match(/score (cp|mate) (-?\d+)/g);
      if (sc) { const l = sc[sc.length - 1]; const mt = /mate (-?\d+)/.exec(l); cp = mt ? (Number(mt[1]) > 0 ? 100000 : -100000) : Number(/cp (-?\d+)/.exec(l)[1]); }
      const bm = /bestmove (\S+)/.exec(s);
      if (bm && !done) { done = true; uci = bm[1] === '(none)' ? null : bm[1]; engine.stdout.off('data', on); clearTimeout(t); res(uci ? { uci, cp: cp ?? 0 } : null); }
    };
    const t = setTimeout(() => { if (!done) { done = true; engine.stdout.off('data', on); res(uci ? { uci, cp: cp ?? 0 } : null); } }, 15000);
    engine.stdout.on('data', on);
    engine.stdin.write(`position fen ${fen}\ngo depth ${depth}\n`);
  });
  q = q.then(run, run); return q;
}
function uciToSan(fen, uci) { try { const c = new Chess(fen); const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); return m ? m.san : null; } catch { return null; } }

// --- eco names ---
const eco = JSON.parse(readFileSync(root + 'src/data/openings-lichess.json', 'utf8'));
const ecoEntries = (Array.isArray(eco) ? eco : eco.openings || Object.values(eco)).filter((e) => e && e.pgn && e.name);
function sans(pgn) { const t = pgn.trim().split(/\s+/).map((x) => x.replace(/^\d+\.(\.\.)?/, '')).filter((x) => x && !/^\d+\.?$/.test(x)); const c = new Chess(); const o = []; for (const m of t) { try { o.push(c.move(m).san); } catch { return []; } } return o; }
const ecoMap = new Map(); for (const e of ecoEntries) { const p = sans(e.pgn).join(' '); if (p && !ecoMap.has(p)) ecoMap.set(p, e.name); }
function nameFor(a) { for (let l = a.length; l >= 2; l--) { const n = ecoMap.get(a.slice(0, l).join(' ')); if (n) return n; } return null; }

// --- explorer ---
function uciList(a) { const c = new Chess(); return a.map((m) => { const r = c.move(m); return r.from + r.to + (r.promotion || ''); }).join(','); }
async function movesAt(a, src) {
  const rate = src === 'lichess' ? '&ratings=2000,2200,2500&speeds=blitz,rapid' : '';
  try { const r = await fetch(`${PROXY}?source=${src}&play=${uciList(a)}${rate}`); const d = await r.json(); await new Promise((z) => setTimeout(z, 100)); return (d.moves || []).map((m) => ({ san: m.san, games: (m.white || 0) + (m.draws || 0) + (m.black || 0) })); }
  catch { return []; }
}
async function forkAt(prefix) { let m = await movesAt(prefix, 'masters'); if (m.reduce((s, x) => s + x.games, 0) < 15) { const c = await movesAt(prefix, 'lichess'); if (c.length) m = c; } return m; }
async function walkToMiddlegame(start, maxPlies) {
  const c = new Chess(); for (const m of start) c.move(m); const out = [...start];
  while (out.length < maxPlies) {
    if (reachesMiddlegame(out.join(' ')).pass) break;
    let ms = await movesAt(out, 'masters'); if (ms.reduce((s, x) => s + x.games, 0) < 12) ms = await movesAt(out, 'lichess');
    if (ms.length) { const top = ms.sort((a, b) => b.games - a.games)[0]; try { c.move(top.san); out.push(top.san); continue; } catch { /* fall through */ } }
    const a = await analyse(c.fen(), 12); if (!a) break; const san = uciToSan(c.fen(), a.uci); if (!san) break; c.move(san); out.push(san);
  }
  return out;
}
function fenAfter(a) { const c = new Chess(); for (const m of a) { try { c.move(m); } catch { return null; } } return c.fen(); }
async function engineBest(fen) { const a = await analyse(fen, 14); return a ? uciToSan(fen, a.uci) : null; }

async function sublinesFor(variationPgn, studentIsWhite, mainSpine) {
  const spine = sans(variationPgn); if (spine.length < 4) return [];
  const oppIsWhite = !studentIsWhite;
  // Establishment: after the variation's ECO identity specialises (name gains a
  // ':'), floored at 4. Then the divergence floor: push PAST a real fork from the
  // main line (so we branch WITHIN this variation, not re-derive sibling tabs);
  // but NOT for a trunk-equal variation (div === length).
  let est = 4;
  for (let k = 2; k <= spine.length; k++) { const nm = nameFor(spine.slice(0, k)); if (nm && nm.includes(':')) { est = Math.max(4, k); break; } }
  if (mainSpine.length) { let div = 0; while (div < spine.length && div < mainSpine.length && spine[div] === mainSpine[div]) div++; if (div < spine.length) est = Math.max(est, div + 1); }

  const c = new Chess(); const subs = [];
  for (let i = 0; i < spine.length; i++) {
    const opponentToMove = (c.turn() === 'w') === oppIsWhite;
    if (opponentToMove && i >= est) {
      const ms = await forkAt(spine.slice(0, i));
      const total = ms.reduce((s, m) => s + m.games, 0) || 1;
      const thresh = Math.max(3, total * 0.03);
      for (const m of ms) {
        if (m.san === spine[i] || m.games < thresh) continue;
        if (!(() => { try { const t = new Chess(c.fen()); t.move(m.san); return true; } catch { return false; } })()) continue;
        const line = await walkToMiddlegame([...spine.slice(0, i), m.san], i + 1 + 20);
        if (line.length <= i) continue;
        const term = fenAfter(line); if (!term) continue;
        const a = await analyse(term, 14);
        const whitePov = a ? (new Chess(term).turn() === 'w' ? a.cp : -a.cp) : null;
        const ev = a ? (studentIsWhite ? whitePov : -whitePov) : null;
        const dubious = ev !== null && ev < -100;
        let best = null; if (dubious) { const dev = fenAfter([...spine.slice(0, i), m.san]); best = dev ? await engineBest(dev) : null; }
        subs.push({ triggerMove: m.san, atPly: i, games: m.games, pct: Math.round((m.games / total) * 100), name: nameFor(line) || `${m.san} line`, moves: line, reachesMiddlegame: reachesMiddlegame(line.join(' ')).pass, evalCp: ev, dubious, ...(best ? { engineBest: best } : {}) });
      }
    }
    try { c.move(spine[i]); } catch { break; }
  }
  return subs.sort((a, b) => b.games - a.games).slice(0, 10);
}

const pro = JSON.parse(readFileSync(root + 'src/data/pro-repertoires.json', 'utf8'));
const o = pro.openings.find((x) => x.id === arg);
if (!o) { console.error(`no such pro opening: ${arg}`); process.exit(1); }
const studentIsWhite = o.color === 'white';
const mainSpine = sans(o.pgn || '');
console.log(`opening ${o.id} | color ${o.color} | explorer+SF fallback | vars ${o.variations.length}`);

const perVar = {}; let total = 0;
for (let idx = 0; idx < o.variations.length; idx++) {
  const subs = await sublinesFor(o.variations[idx].pgn, studentIsWhite, mainSpine);
  if (subs.length) { perVar[idx] = subs; total += subs.length; }
  console.log(`  [${idx}] ${o.variations[idx].name.padEnd(30)} sublines=${subs.length} (dubious=${subs.filter((s) => s.dubious).length})`);
  for (const s of subs.slice(0, 4)) console.log(`      ${s.triggerMove.padEnd(6)} ${String(s.pct + '%').padEnd(4)} ${s.games}g eval=${s.evalCp}cp ${s.dubious ? 'DUBIOUS→' + s.engineBest : 'sound'} "${s.name}" ${s.moves.length}plies`);
}
try { engine.stdin.write('quit\n'); engine.kill(); } catch { /* */ }
console.log(`\n${o.id}: ${total} explorer sublines across ${Object.keys(perVar).length} variations`);
if (write) {
  const path = root + 'src/data/course-sublines.json'; const all = JSON.parse(readFileSync(path, 'utf8'));
  // Merge — don't clobber tree-derived sublines already present for this opening;
  // only ADD explorer sublines for variation indices that came back empty.
  const existing = all[o.id] || {};
  for (const [idx, subs] of Object.entries(perVar)) { if (!existing[idx] || existing[idx].length === 0) existing[idx] = subs; }
  all[o.id] = existing;
  writeFileSync(path, JSON.stringify(all));
  console.log(`merged ${o.id} into course-sublines.json (${Object.keys(all).length} openings)`);
} else console.log('[dry-run] pass --write to persist');
