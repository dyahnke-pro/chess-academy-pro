// fuse-engine.mjs — the deterministic "board computer facts" half of the
// engine-fused narration standard (docs/engine-fused-narration.md).
//
// For a video's REAL forward main line it emits, per ply, a board-true packet the
// narrator phrases in the house voice — NEVER prose, only computed facts:
//   opening name (DB longest-prefix), mover, played SAN, capture/check flags,
//   eval(mover POV) after the move, engine best SAN + short PV, cpLoss vs best,
//   a label (book/best/good/inaccuracy/mistake/blunder), a critical-swing flag,
//   and whether the engine's line is forcing / wins material (the tactic, played
//   out). Every claim a narration makes must trace to a field here or to the
//   video note — nothing from memory (G0/G3).
//
// Generalizes to ANY video (Naroditsky or not): the game is the move spine from
// the video-align bank; this supplies the why. Usage:
//   node scripts/voiced-authoring/fuse-engine.mjs <videoId> [--json]
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawn, execSync } from 'node:child_process';
import { Chess } from 'chess.js';

const ID = process.argv[2];
const EMIT_JSON = process.argv.includes('--json');
const DEPTH = parseInt(process.env.SF_DEPTH || '18', 10);
if (!ID) { console.error('usage: node fuse-engine.mjs <videoId> [--json]'); process.exit(1); }

// ── Stockfish (native, resolved like the other scripts) ────────────────────
function resolveSF() {
  const c = [process.env.STOCKFISH_PATH, '/usr/games/stockfish', '/usr/bin/stockfish', '/usr/local/bin/stockfish'].filter(Boolean);
  for (const p of c) if (existsSync(p)) return p;
  try { return execSync('which stockfish', { encoding: 'utf8' }).trim() || null; } catch { return null; }
}
const BIN = resolveSF();
if (!BIN) { console.error('no stockfish binary'); process.exit(1); }

function engine(bin) {
  const sf = spawn(bin);
  let buf = '', cp = null, pv = [], resolver = null;
  sf.stdout.on('data', (d) => {
    buf += d.toString(); const lines = buf.split('\n'); buf = lines.pop() ?? '';
    for (const l of lines) {
      const mcp = l.match(/score cp (-?\d+)/), mmate = l.match(/score mate (-?\d+)/);
      if (mmate) cp = parseInt(mmate[1], 10) > 0 ? 100000 : -100000;
      else if (mcp) cp = parseInt(mcp[1], 10);
      const mpv = l.match(/ pv (.+)$/); if (mpv) pv = mpv[1].trim().split(/\s+/);
      const bm = l.match(/^bestmove (\S+)/);
      if (bm && resolver) { const r = resolver; resolver = null; r({ cp, best: bm[1] === '(none)' ? null : bm[1], pv: pv.slice() }); }
    }
  });
  sf.stdin.write('uci\nisready\nsetoption name Threads value 1\n');
  return {
    go(fen) {
      return new Promise((res) => { cp = null; pv = []; resolver = res;
        sf.stdin.write(`position fen ${fen}\ngo depth ${DEPTH}\n`);
        setTimeout(() => { if (resolver === res) { resolver = null; res({ cp, best: null, pv: [] }); } }, 30000); });
    },
    quit() { try { sf.stdin.write('quit\n'); sf.kill(); } catch { /* */ } },
  };
}

// ── Opening naming (longest DB prefix over the cumulative SAN) ──────────────
const OPENINGS = (() => {
  const raw = JSON.parse(readFileSync('src/data/openings-lichess.json', 'utf8'));
  const arr = Array.isArray(raw) ? raw : Object.values(raw);
  const map = new Map();
  for (const e of arr) if (e.pgn && e.name) map.set(e.pgn.trim(), e.name);
  return map;
})();
function openingAt(sans) {
  for (let n = sans.length; n >= 1; n--) {
    const key = sans.slice(0, n).join(' ');
    if (OPENINGS.has(key)) return OPENINGS.get(key);
  }
  return null;
}

const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
function uciToSanMove(fen, uci) { const c = new Chess(fen); const m = c.move({ from: uci.slice(0,2), to: uci.slice(2,4), promotion: uci[4] }); return m; }
function pvSans(fen, pv, n = 4) { const c = new Chess(fen); const out = []; for (const u of pv.slice(0, n)) { const m = c.move({ from: u.slice(0,2), to: u.slice(2,4), promotion: u[4] }); if (!m) break; out.push(m.san); } return out; }
// The engine's line, played out: is it forcing (all checks/captures), and what
// net material does the side-to-move win over the PV? (deterministic tactic read)
function pvTactics(fen, pv, moverColor, n = 6) {
  const c = new Chess(fen); let net = 0, allForcing = true, sawCapture = false, sawCheck = false, moves = 0;
  for (const u of pv.slice(0, n)) {
    const m = c.move({ from: u.slice(0,2), to: u.slice(2,4), promotion: u[4] }); if (!m) break; moves++;
    if (m.captured) { sawCapture = true; net += (m.color === moverColor ? 1 : -1) * (VAL[m.captured] || 0); }
    if (m.san.includes('+') || m.san.includes('#')) sawCheck = true;
    const forcing = m.san.includes('+') || m.san.includes('#') || !!m.captured;
    if (!forcing && moves <= 4) allForcing = false;
  }
  return { forcingLine: allForcing && (sawCheck || sawCapture), winsMaterial: net, sawCheck, sawCapture };
}
function label(cpLoss, isBest, mate) {
  if (isBest) return 'best';
  if (mate) return 'forcing';
  if (cpLoss == null) return '?';
  if (cpLoss <= 15) return 'best';
  if (cpLoss <= 50) return 'good';
  if (cpLoss <= 100) return 'inaccuracy';
  if (cpLoss <= 250) return 'mistake';
  return 'blunder';
}

// ── Reconstruct the forward main line (drop ply-decreasing rewinds) ─────────
// The voiced file is OPTIONAL: sparse/other-source videos have only the bank.
// The bank `said` is verbatim (comprehension only, NEVER shipped) — shown so the
// narrator knows what was taught; original prose is authored from it, not copied.
const bank = JSON.parse(readFileSync(`data/video-narration/${ID}.json`, 'utf8'));
let voiced = { openingName: bank.title || '', studentSide: '?' };
try { voiced = JSON.parse(readFileSync(`data/video-narration-voiced/${ID}.json`, 'utf8')); } catch { /* no voiced file yet */ }
const noteByPly = new Map();
for (const m of (voiced.moves || [])) if (m.line && m.line.length && m.spoken) noteByPly.set(m.ply, m.spoken);
const saidByPly = new Map();
for (const m of bank.moves) if (m.line && m.line.length && m.said && m.said.trim()) saidByPly.set(m.ply, m.said.replace(/\s+/g, ' ').trim());
const beats = [];
let maxPly = 0;
for (const m of bank.moves) {
  if (!m.line || !m.line.length) continue;
  if (m.ply <= maxPly) continue;
  maxPly = m.ply; beats.push(m);
}

// A beat's moves must ALL be legal from the running position, else it's an
// OCR/rewind artifact — skip the whole beat and stay in sync (never crash).
function beatLegal(fen, line) {
  const c = new Chess(fen);
  for (const san of line) { try { if (!c.move(san)) return false; } catch { return false; } }
  return true;
}

const sf = engine(BIN);
const chess = new Chess();
const packet = [];
const sanSoFar = [];
let skipped = 0;
for (const beat of beats) {
  if (!beatLegal(chess.fen(), beat.line)) { skipped++; continue; }
  for (const san of beat.line) {
    const fenBefore = chess.fen();
    const moverColor = chess.turn();
    const mover = moverColor === 'w' ? 'White' : 'Black';
    const before = await sf.go(fenBefore);
    const bestMove = before.best ? uciToSanMove(fenBefore, before.best) : null;
    const bestSan = bestMove ? bestMove.san : '?';
    const pv = pvSans(fenBefore, before.pv);
    const tac = pvTactics(fenBefore, before.pv, moverColor);
    const mv = chess.move(san);
    sanSoFar.push(mv.san);
    const after = await sf.go(chess.fen());
    const playedCp = after.cp == null ? null : -after.cp;
    const bestCp = before.cp;
    const cpLoss = (bestCp != null && playedCp != null) ? bestCp - playedCp : null;
    const isBest = !!before.best && (mv.from + mv.to + (mv.promotion || '')) === before.best;
    const mate = Math.abs(bestCp || 0) >= 100000 || Math.abs(playedCp || 0) >= 100000;
    const critical = cpLoss != null && cpLoss >= 100;
    packet.push({
      ply: beat.ply, t: beat.t, mover, san: mv.san,
      capture: !!mv.captured, check: mv.san.includes('+') || mv.san.includes('#'),
      opening: openingAt(sanSoFar),
      evalAfter: playedCp == null ? null : +(playedCp / 100).toFixed(2),
      best: bestSan, pv, cpLoss, label: label(cpLoss, isBest, mate),
      critical, forcingLine: tac.forcingLine, pvWinsMaterial: tac.winsMaterial,
      note: noteByPly.get(beat.ply) || null,
      said: saidByPly.get(beat.ply) || null,
      fenAfter: chess.fen(),
    });
  }
}
sf.quit();

if (EMIT_JSON) {
  mkdirSync('audit-reports/engine-packets', { recursive: true });
  const out = `audit-reports/engine-packets/${ID}.json`;
  writeFileSync(out, JSON.stringify({ id: ID, opening: voiced.openingName, studentSide: voiced.studentSide, depth: DEPTH, packet }, null, 2));
  console.log(`wrote ${out} (${packet.length} plies)`);
} else {
  console.log(`# ${ID} — ${voiced.openingName} (student=${voiced.studentSide}) — SF depth ${DEPTH}  [beats skipped: ${skipped}]\n`);
  let lastOpening = null;
  for (const p of packet) {
    if (p.illegal) { console.log(`!! illegal ${p.illegal}`); continue; }
    const flags = [p.capture && 'x', p.check && '+', p.critical && 'CRIT', p.forcingLine && `forcing(+${p.pvWinsMaterial})`].filter(Boolean).join(' ');
    const op = p.opening && p.opening !== lastOpening ? `  «${p.opening}»` : ''; lastOpening = p.opening || lastOpening;
    console.log(`${String(p.ply).padStart(3)} ${p.mover.padEnd(5)} ${p.san.padEnd(7)} eval ${String(p.evalAfter).padStart(6)}  best ${p.best.padEnd(7)} pv ${p.pv.join(' ').padEnd(24)} cpLoss ${String(p.cpLoss).padStart(5)} [${p.label}] ${flags}${op}`);
    if (p.note) console.log(`      note: ${p.note}`);
    if (p.said) console.log(`      said(raw,comprehension-only): ${p.said.slice(0, 160)}`);
  }
}
