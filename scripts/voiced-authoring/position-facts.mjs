// position-facts.mjs — PHASE 1 of the PositionFacts calculator
// (docs/plans/2026-08-26-position-facts-calculator.md): the CRITICALITY SCORE.
//
// The keystone. Off the cheap continuous read it answers "how much does choosing
// wrong cost here, and how forcing is the position" — which gates the deep search,
// speaks "key moment — don't rush," and (when low) says "stay quiet." Everything
// else in the calculator hangs off this.
//
// Signals, all board-true, from ONE `go depth D` with MultiPV 5:
//   volatility  — spread across the candidate fan (cp1 - cp5): a wide fan means
//                 many ways to go wrong.
//   onlyMove    — gap #1 vs #2: one move far ahead = must-find.
//   trap        — depth disagreement: the shallow (d8) best/eval vs the deep (dD)
//                 best/eval, harvested free mid-search. Shallow rosy + deep sober,
//                 or shallow's move != deep's move = a hidden point a human misses.
//   forcing     — the best line is checks/captures winning material (+ seldepth spike).
//   loose       — material en prise on the board now (SEE-lite via chess.js).
//
// Usage: node scripts/voiced-authoring/position-facts.mjs <videoId> [--depth 18]
import { readFileSync, existsSync } from 'node:fs';
import { spawn, execSync } from 'node:child_process';
import { Chess } from 'chess.js';

const ID = process.argv[2];
const DEPTH = parseInt((process.argv.find((a) => a.startsWith('--depth=')) || '').split('=')[1] || process.env.SF_DEPTH || '18', 10);
const SHALLOW = 8;
const MPV = 5;
if (!ID) { console.error('usage: node position-facts.mjs <videoId> [--depth=18]'); process.exit(1); }

function resolveSF() {
  const c = [process.env.STOCKFISH_PATH, '/usr/games/stockfish', '/usr/bin/stockfish', '/usr/local/bin/stockfish'].filter(Boolean);
  for (const p of c) if (existsSync(p)) return p;
  try { return execSync('which stockfish', { encoding: 'utf8' }).trim() || null; } catch { return null; }
}
const BIN = resolveSF();
if (!BIN) { console.error('no stockfish'); process.exit(1); }

// Engine: one `go depth D` with MultiPV; return every (depth,multipv) info row so
// we can read BOTH the deep fan and the shallow (d8) line from one search.
function engine(bin) {
  const sf = spawn(bin);
  let buf = '', rows = [], resolver = null;
  sf.stdout.on('data', (d) => {
    buf += d.toString(); const lines = buf.split('\n'); buf = lines.pop() ?? '';
    for (const l of lines) {
      if (l.startsWith('info') && / multipv /.test(l) && / pv /.test(l)) {
        const depth = +(/ depth (\d+)/.exec(l)?.[1] ?? 0);
        const seldepth = +(/ seldepth (\d+)/.exec(l)?.[1] ?? 0);
        const mpv = +(/ multipv (\d+)/.exec(l)?.[1] ?? 0);
        const mc = / score cp (-?\d+)/.exec(l), mm = / score mate (-?\d+)/.exec(l);
        const cp = mm ? (parseInt(mm[1], 10) > 0 ? 100000 : -100000) : (mc ? parseInt(mc[1], 10) : null);
        const pv = (/ pv (.+)$/.exec(l)?.[1] ?? '').trim().split(/\s+/);
        rows.push({ depth, seldepth, mpv, cp, pv });
      }
      if (l.startsWith('bestmove') && resolver) { const r = resolver; resolver = null; r(rows); rows = []; }
    }
  });
  sf.stdin.write(`uci\nsetoption name Threads value 1\nsetoption name MultiPV value ${MPV}\nisready\n`);
  return {
    go(fen) { return new Promise((res) => { rows = []; resolver = res;
      sf.stdin.write(`position fen ${fen}\ngo depth ${DEPTH}\n`);
      setTimeout(() => { if (resolver === res) { resolver = null; res(rows); } }, 30000); }); },
    quit() { try { sf.stdin.write('quit\n'); sf.kill(); } catch { /* */ } },
  };
}

const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
function uciSan(fen, u) { const c = new Chess(fen); const m = c.move({ from: u.slice(0,2), to: u.slice(2,4), promotion: u[4] }); return m ? m.san : u; }
function pvSans(fen, pv, n) { const c = new Chess(fen); const out = []; for (const u of pv.slice(0, n)) { const m = c.move({ from: u.slice(0,2), to: u.slice(2,4), promotion: u[4] }); if (!m) break; out.push(m.san); } return out; }
function forcingWinsMaterial(fen, pv, mover, n = 6) {
  const c = new Chess(fen); let net = 0, forcing = true, saw = false, i = 0;
  for (const u of pv.slice(0, n)) { const m = c.move({ from: u.slice(0,2), to: u.slice(2,4), promotion: u[4] }); if (!m) break; i++;
    if (m.captured) { saw = true; net += (m.color === mover ? 1 : -1) * (VAL[m.captured] || 0); }
    const f = m.san.includes('+') || m.san.includes('#') || !!m.captured; if (!f && i <= 4) forcing = false; }
  return forcing && saw ? net : 0;
}
// SEE-lite: is there loose material on the board right now? Scan captures the side
// to move could make that win material, and enemy captures that would win ours.
function looseMaterial(fen) {
  const c = new Chess(fen);
  let best = 0;
  for (const m of c.moves({ verbose: true })) {
    if (!m.captured) continue;
    const gain = (VAL[m.captured] || 0) - seeCost(c, m);
    if (gain > best) best = gain;
  }
  return best; // >0 means a winning capture is available to the side to move
}
// crude SEE on one capture: value we lose if recaptured by the cheapest defender
function seeCost(chess, m) {
  const c = new Chess(chess.fen()); c.move(m);
  const defenders = c.attackers ? c.attackers(m.to, c.turn()) : [];
  if (!defenders || defenders.length === 0) return 0; // undefended → we keep the piece
  // cheapest recapture value = the value of OUR piece that landed (it can be taken)
  return VAL[m.piece] || 0;
}
function clamp01(x) { return Math.max(0, Math.min(1, x)); }

// ── reconstruct the forward line (shared with fuse-engine) ─────────────────
const bank = JSON.parse(readFileSync(`data/video-narration/${ID}.json`, 'utf8'));
let voiced = { openingName: bank.title || '', studentSide: '?' };
try { voiced = JSON.parse(readFileSync(`data/video-narration-voiced/${ID}.json`, 'utf8')); } catch { /* */ }
const beats = []; let maxPly = 0;
for (const m of bank.moves) { if (!m.line?.length || m.ply <= maxPly) continue; maxPly = m.ply; beats.push(m); }
function beatLegal(fen, line) { const c = new Chess(fen); for (const s of line) { try { if (!c.move(s)) return false; } catch { return false; } } return true; }

const sf = engine(BIN);
const chess = new Chess();
const tape = [];
for (const beat of beats) {
  if (!beatLegal(chess.fen(), beat.line)) continue;
  for (const san of beat.line) {
    const fen = chess.fen();
    const mover = chess.turn(); // 'w'|'b'
    const rows = await sf.go(fen);
    // deepest depth reached
    const dmax = Math.max(...rows.map((r) => r.depth));
    const deep = [1,2,3,4,5].map((k) => rows.filter((r) => r.mpv === k && r.depth === dmax).pop()).filter(Boolean);
    const seldepth = Math.max(0, ...rows.filter((r) => r.depth === dmax).map((r) => r.seldepth));
    // shallow (nearest depth <= SHALLOW), multipv 1
    const sd = Math.max(0, ...rows.filter((r) => r.depth <= SHALLOW && r.mpv === 1).map((r) => r.depth));
    const shallow = rows.filter((r) => r.mpv === 1 && r.depth === sd).pop();
    // to mover POV (SF cp is already side-to-move POV at the searched position)
    const cps = deep.map((r) => r.cp);
    const cp1 = cps[0] ?? 0, cp2 = cps[1] ?? cp1, cpN = cps[cps.length - 1] ?? cp1;
    const gap12 = cp1 - cp2;                    // only-move
    const spread = cp1 - cpN;                   // volatility across the fan
    const bestUci = deep[0]?.pv?.[0];
    const bestSan = bestUci ? uciSan(fen, bestUci) : '?';
    const shBestUci = shallow?.pv?.[0];
    const trapMoveDisagree = shBestUci && bestUci && shBestUci !== bestUci;
    const trapEvalDrop = shallow?.cp != null && cp1 != null ? (shallow.cp - cp1) : 0; // shallow rosy vs deep sober
    const forceNet = deep[0] ? forcingWinsMaterial(fen, deep[0].pv, mover) : 0;
    const seldepthSpike = Math.max(0, seldepth - dmax);
    const loose = looseMaterial(fen);

    // ── criticality score 0..100 ──
    const V = clamp01(spread / 300);            // 3 pawns across the fan = max sharp
    const O = clamp01(gap12 / 150);             // best 1.5 ahead of 2nd = clear only-move
    const T = clamp01(Math.max(trapEvalDrop / 150, trapMoveDisagree ? 0.5 : 0)); // hidden point
    const F = forceNet > 0 ? clamp01(forceNet / 5) : clamp01(seldepthSpike / 8);
    const L = clamp01(loose / 3);               // a minor piece hanging = strong
    let score = Math.round(100 * (0.42 * V + 0.20 * O + 0.16 * T + 0.12 * F + 0.10 * L));
    if (loose >= 3) score = Math.max(score, 55); // something real is en prise → at least "key"
    if (Math.abs(cp1) >= 100000) score = Math.max(score, 80); // forced mate in the air
    const band = score >= 70 ? 'CRITICAL' : score >= 45 ? 'key' : score >= 20 ? 'think' : 'quiet';

    const mv = chess.move(san); if (!mv) break;
    tape.push({ ply: beat.ply, mover: mover === 'w' ? 'W' : 'B', san: mv.san, cp1,
      gap12, spread, trap: trapMoveDisagree ? 'move' : (trapEvalDrop >= 60 ? 'eval' : ''),
      forceNet, loose, score, band, bestSan,
      cand: deep.map((r) => `${uciSan(fen, r.pv[0])}${(r.cp/100).toFixed(1)}`).join(' ') });
  }
}
sf.quit();

console.log(`# ${ID} — ${voiced.openingName} — criticality tape (SF d${DEPTH}, MultiPV ${MPV})\n`);
for (const t of tape) {
  const bar = { quiet: '·', think: '▂', key: '▆', CRITICAL: '█' }[t.band];
  console.log(`${bar} ${String(t.ply).padStart(3)} ${t.mover} ${t.san.padEnd(6)} score ${String(t.score).padStart(3)} [${t.band.padEnd(8)}] spread ${String(t.spread).padStart(5)} gap12 ${String(t.gap12).padStart(4)} ${t.trap?('trap:'+t.trap):''.padEnd(9)} ${t.forceNet?('force+'+t.forceNet):''} ${t.loose?('loose+'+t.loose):''}`);
}
