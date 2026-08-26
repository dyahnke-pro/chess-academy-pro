// position-facts.mjs — PHASE 1 of the PositionFacts calculator, COMPLETE.
// (docs/plans/2026-08-26-position-facts-calculator.md)
//
// The unified Phase-1 board-truth packet per ply — supersedes fuse-engine.mjs's
// packet (carries everything it did + criticality + WDL). Pure computed facts,
// no prose (G0). Emits a durable JSON so nothing is lost, plus a readable
// criticality tape. Generalises to ANY video: the game is the align-bank spine.
//
// Per ply (all board-true, from ONE `go depth D` MultiPV 5 + WDL, + a cheap
// after-search only when the played move is a blunder outside the fan):
//   opening (DB longest-prefix) · mover · san · capture/check
//   evalAfter (mover POV) · cpLoss vs best · label (book..blunder)
//   best SAN · pv (full ~10 ply) · candidates[5] {san,cp}
//   wdl (win/draw/loss per-mille — the practical read) · seldepth
//   forcing/material (the tactic played out) · loose material (SEE-lite)
//   trap (shallow-vs-deep disagreement) · CRITICALITY {V,O,T,F,L,score,band}
//
// Usage: node scripts/voiced-authoring/position-facts.mjs <videoId> [--json] [--depth=18]
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawn, execSync } from 'node:child_process';
import { Chess } from 'chess.js';

const ID = process.argv[2];
const EMIT_JSON = process.argv.includes('--json');
const DEPTH = parseInt((process.argv.find((a) => a.startsWith('--depth=')) || '').split('=')[1] || process.env.SF_DEPTH || '18', 10);
const SHALLOW = 8;
const MPV = 5;
if (!ID) { console.error('usage: node position-facts.mjs <videoId> [--json] [--depth=18]'); process.exit(1); }

function resolveSF() {
  const c = [process.env.STOCKFISH_PATH, '/usr/games/stockfish', '/usr/bin/stockfish', '/usr/local/bin/stockfish'].filter(Boolean);
  for (const p of c) if (existsSync(p)) return p;
  try { return execSync('which stockfish', { encoding: 'utf8' }).trim() || null; } catch { return null; }
}
const BIN = resolveSF();
if (!BIN) { console.error('no stockfish'); process.exit(1); }

// Engine: one `go depth D` with MultiPV + WDL; return every (depth,multipv) info
// row so we read the deep fan AND the shallow (d8) line from one search.
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
        const w = / wdl (\d+) (\d+) (\d+)/.exec(l);
        const wdl = w ? [+w[1], +w[2], +w[3]] : null;
        const pv = (/ pv (.+)$/.exec(l)?.[1] ?? '').trim().split(/\s+/);
        rows.push({ depth, seldepth, mpv, cp, wdl, pv });
      }
      if (l.startsWith('bestmove') && resolver) { const r = resolver; resolver = null; r(rows); rows = []; }
    }
  });
  sf.stdin.write(`uci\nsetoption name Threads value 1\nsetoption name UCI_ShowWDL value true\nsetoption name MultiPV value ${MPV}\nisready\n`);
  return {
    go(fen, depth = DEPTH) { return new Promise((res) => { rows = []; resolver = res;
      sf.stdin.write(`position fen ${fen}\ngo depth ${depth}\n`);
      setTimeout(() => { if (resolver === res) { resolver = null; res(rows); } }, 30000); }); },
    quit() { try { sf.stdin.write('quit\n'); sf.kill(); } catch { /* */ } },
  };
}

// ── opening naming (DB longest prefix) ──────────────────────────────────────
const OPENINGS = (() => {
  const raw = JSON.parse(readFileSync('src/data/openings-lichess.json', 'utf8'));
  const arr = Array.isArray(raw) ? raw : Object.values(raw);
  const map = new Map(); for (const e of arr) if (e.pgn && e.name) map.set(e.pgn.trim(), e.name); return map;
})();
function openingAt(sans) { for (let n = sans.length; n >= 1; n--) { const k = sans.slice(0, n).join(' '); if (OPENINGS.has(k)) return OPENINGS.get(k); } return null; }

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
function looseMaterial(fen) {
  const c = new Chess(fen); let best = 0;
  for (const m of c.moves({ verbose: true })) { if (!m.captured) continue;
    const cc = new Chess(fen); cc.move(m);
    const defended = cc.attackers ? (cc.attackers(m.to, cc.turn())?.length ?? 0) > 0 : true;
    const gain = (VAL[m.captured] || 0) - (defended ? (VAL[m.piece] || 0) : 0);
    if (gain > best) best = gain; }
  return best;
}
function clamp01(x) { return Math.max(0, Math.min(1, x)); }
function label(cpLoss, isBest, mate) {
  if (isBest) return 'best'; if (mate) return 'forcing'; if (cpLoss == null) return '?';
  if (cpLoss <= 15) return 'best'; if (cpLoss <= 50) return 'good'; if (cpLoss <= 100) return 'inaccuracy';
  if (cpLoss <= 250) return 'mistake'; return 'blunder';
}

// ── reconstruct the forward line ────────────────────────────────────────────
const bank = JSON.parse(readFileSync(`data/video-narration/${ID}.json`, 'utf8'));
let voiced = { openingName: bank.title || '', studentSide: '?' };
try { voiced = JSON.parse(readFileSync(`data/video-narration-voiced/${ID}.json`, 'utf8')); } catch { /* */ }
const beats = []; let maxPly = 0;
for (const m of bank.moves) { if (!m.line?.length || m.ply <= maxPly) continue; maxPly = m.ply; beats.push(m); }
function beatLegal(fen, line) { const c = new Chess(fen); for (const s of line) { try { if (!c.move(s)) return false; } catch { return false; } } return true; }

const sf = engine(BIN);
const chess = new Chess();
const facts = [];
const sanSoFar = [];
for (const beat of beats) {
  if (!beatLegal(chess.fen(), beat.line)) continue;
  for (const san of beat.line) {
    const fen = chess.fen();
    const mover = chess.turn();
    const rows = await sf.go(fen);
    const dmax = Math.max(0, ...rows.map((r) => r.depth));
    const deep = [1,2,3,4,5].map((k) => rows.filter((r) => r.mpv === k && r.depth === dmax).pop()).filter(Boolean);
    const seldepth = Math.max(0, ...rows.filter((r) => r.depth === dmax).map((r) => r.seldepth));
    const sd = Math.max(0, ...rows.filter((r) => r.depth <= SHALLOW && r.mpv === 1).map((r) => r.depth));
    const shallow = rows.filter((r) => r.mpv === 1 && r.depth === sd).pop();

    const cps = deep.map((r) => r.cp);
    const cp1 = cps[0] ?? 0, cp2 = cps[1] ?? cp1, cpN = cps[cps.length - 1] ?? cp1;
    const gap12 = cp1 - cp2, spread = cp1 - cpN;
    const bestUci = deep[0]?.pv?.[0];
    const bestSan = bestUci ? uciSan(fen, bestUci) : '?';
    const bestPv = deep[0] ? pvSans(fen, deep[0].pv, 10) : [];
    const wdl = deep[0]?.wdl ?? null;
    const shBestUci = shallow?.pv?.[0];
    const trapMove = !!(shBestUci && bestUci && shBestUci !== bestUci);
    const trapEval = (shallow?.cp != null && cp1 != null) ? (shallow.cp - cp1) : 0;
    const forceNet = deep[0] ? forcingWinsMaterial(fen, deep[0].pv, mover) : 0;
    const seldepthSpike = Math.max(0, seldepth - dmax);
    const loose = looseMaterial(fen);

    // played-move eval → cpLoss. Use the candidate's cp if the move is in the fan,
    // else a cheap after-search (only blunders fall here).
    const playedUci = (() => { const c = new Chess(fen); const m = c.move(san); return m ? m.from + m.to + (m.promotion || '') : null; })();
    let playedCp = null;
    const inFan = deep.find((r) => r.pv?.[0] === playedUci);
    if (inFan) playedCp = inFan.cp;
    const mv = chess.move(san); if (!mv) break;
    sanSoFar.push(mv.san);
    if (playedCp == null) { const after = await sf.go(chess.fen(), DEPTH); const a1 = after.filter((r) => r.mpv === 1 && r.depth === Math.max(0, ...after.map((x) => x.depth))).pop(); playedCp = a1?.cp != null ? -a1.cp : null; }
    const cpLoss = (cp1 != null && playedCp != null) ? cp1 - playedCp : null;
    const isBest = playedUci === bestUci;
    const mate = Math.abs(cp1) >= 100000 || Math.abs(playedCp || 0) >= 100000;

    // criticality
    const V = clamp01(spread / 300), O = clamp01(gap12 / 150);
    const T = clamp01(Math.max(trapEval / 150, trapMove ? 0.5 : 0));
    const F = forceNet > 0 ? clamp01(forceNet / 5) : clamp01(seldepthSpike / 8);
    const L = clamp01(loose / 3);
    let score = Math.round(100 * (0.42 * V + 0.20 * O + 0.16 * T + 0.12 * F + 0.10 * L));
    if (loose >= 3) score = Math.max(score, 55);
    if (Math.abs(cp1) >= 100000) score = Math.max(score, 80);
    const band = score >= 70 ? 'CRITICAL' : score >= 45 ? 'key' : score >= 20 ? 'think' : 'quiet';

    facts.push({
      ply: beat.ply, t: beat.t, mover: mover === 'w' ? 'W' : 'B', san: mv.san,
      capture: !!mv.captured, check: mv.san.includes('+') || mv.san.includes('#'),
      opening: openingAt(sanSoFar),
      evalAfter: playedCp == null ? null : +(playedCp / 100).toFixed(2), cpLoss, label: label(cpLoss, isBest, mate),
      best: bestSan, bestPv, candidates: deep.map((r) => ({ san: uciSan(fen, r.pv[0]), cp: r.cp })),
      wdl, seldepth, forceNet, loose, trap: trapMove ? 'move' : (trapEval >= 60 ? 'eval' : ''),
      crit: { V: +V.toFixed(2), O: +O.toFixed(2), T: +T.toFixed(2), F: +F.toFixed(2), L: +L.toFixed(2), score, band },
      fenAfter: chess.fen(),
    });
  }
}
sf.quit();

if (EMIT_JSON) {
  mkdirSync('audit-reports/position-facts', { recursive: true });
  const out = `audit-reports/position-facts/${ID}.json`;
  writeFileSync(out, JSON.stringify({ id: ID, opening: voiced.openingName, studentSide: voiced.studentSide, depth: DEPTH, facts }, null, 2));
  console.log(`wrote ${out} (${facts.length} plies)`);
}
console.log(`# ${ID} — ${voiced.openingName} — criticality tape (SF d${DEPTH}, MultiPV ${MPV}, WDL on)\n`);
for (const t of facts) {
  const bar = { quiet: '·', think: '▂', key: '▆', CRITICAL: '█' }[t.crit.band];
  const w = t.wdl ? `wdl ${t.wdl.map((x) => String(x).padStart(3)).join('/')}` : '';
  console.log(`${bar} ${String(t.ply).padStart(3)} ${t.mover} ${t.san.padEnd(6)} sc ${String(t.crit.score).padStart(3)} [${t.crit.band.padEnd(8)}] spread ${String(t.candidates[0]?.cp - (t.candidates[t.candidates.length-1]?.cp)).padStart(5)} loss ${String(t.cpLoss).padStart(5)} ${(t.label||'').padEnd(10)} ${w} ${t.trap?('trap:'+t.trap):''} ${t.forceNet?('force+'+t.forceNet):''} ${t.loose?('loose+'+t.loose):''}`);
}
