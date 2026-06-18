// Re-walk soundness-flagged sublines with Stockfish BEST moves (David 2026-06-18:
// "fix the bad lines, use stockfish for best moves" + "gambits must show the BEST
// moves — user needs to know them"). For each flagged key we keep the spine
// through the deviation (moves[0..atPly]) and re-walk the continuation along
// Stockfish's best move for BOTH sides to a sound/middlegame terminus, so the
// student is never taught a blundered continuation. Updates course-sublines.json
// in place and prints old→new terminus eval. Narration is realigned separately.
import fs from 'node:fs';
import { Chess } from 'chess.js';
import { spawn } from 'node:child_process';
import { reachesMiddlegame } from '../src/data/variationMiddlegameDepth.shared.mjs';

const SF = '/usr/games/stockfish';
const DEPTH = Number(process.env.FIX_DEPTH || 16);
const COLOR = {};
for (const f of ['repertoire.json', 'anti-openings.json', 'gambits.json']) {
  try { const raw = JSON.parse(fs.readFileSync('src/data/' + f, 'utf8')); const arr = Array.isArray(raw) ? raw : raw.openings || Object.values(raw); for (const o of arr) if (o && o.id && o.color) COLOR[o.id] = o.color; } catch { /* */ }
}
function sf(fen, want /* 'best' | 'eval' */) {
  return new Promise((res) => {
    const p = spawn(SF); let cp = null, best = null;
    p.stdout.on('data', (d) => { const s = d.toString();
      const mc = s.match(/score cp (-?\d+)/g); if (mc) cp = parseInt(mc[mc.length - 1].match(/-?\d+/)[0]);
      const mm = s.match(/score mate (-?\d+)/); if (mm) cp = parseInt(mm[1]) > 0 ? 10000 : -10000;
      const bm = s.match(/bestmove (\S+)/); if (bm) { best = bm[1]; p.kill(); res(want === 'best' ? best : cp); } });
    p.stdin.write(`position fen ${fen}\ngo depth ${DEPTH}\n`);
    setTimeout(() => { try { p.kill(); } catch { /* */ } res(want === 'best' ? best : cp); }, 8000);
  });
}
const studentEval = (cp, fen, color) => cp == null ? null : ((fen.split(' ')[1] === 'w' ? 'white' : 'black') === color ? cp : -cp) / 100;

const KEYS = JSON.parse(fs.readFileSync('audit-reports/subline-soundness.json', 'utf8')).worst.map((w) => w.key);
const data = JSON.parse(fs.readFileSync('src/data/course-sublines.json', 'utf8'));
const report = [];

for (const key of KEYS) {
  const m = /^(.+)::(\d+)::(.+)@(\d+)$/.exec(key); if (!m) continue;
  const [, openingId, vi, trigger, atPlyS] = m; const atPly = +atPlyS;
  const list = data[openingId]?.[vi] ?? [];
  const sl = list.find((s) => s.triggerMove === trigger && s.atPly === atPly); if (!sl) continue;
  const color = COLOR[openingId] || 'white';
  const targetLen = Math.max(sl.moves.length, 22);
  const c = new Chess(); let ok = true;
  for (let i = 0; i <= atPly && i < sl.moves.length; i++) { try { c.move(sl.moves[i]); } catch { ok = false; break; } }
  if (!ok) continue;
  const newMoves = sl.moves.slice(0, atPly + 1);
  let guard = 0;
  while (newMoves.length < targetLen && guard++ < 40) {
    if (reachesMiddlegame(newMoves.join(' ')).pass && newMoves.length >= sl.moves.length) break;
    const uci = await sf(c.fen(), 'best'); if (!uci || uci === '(none)') break;
    let mv; try { mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); } catch { break; }
    if (!mv) break; newMoves.push(mv.san);
  }
  const newEval = studentEval(await sf(c.fen(), 'eval'), c.fen(), color);
  sl.moves = newMoves; sl.reachesMiddlegame = reachesMiddlegame(newMoves.join(' ')).pass;
  report.push({ key, newEval, newLen: newMoves.length });
  console.error(`fixed ${key.padEnd(40)} new studentEval=${newEval}`);
}
fs.writeFileSync('src/data/course-sublines.json', JSON.stringify(data));
report.sort((a, b) => (a.newEval ?? 0) - (b.newEval ?? 0));
console.log('\n=== re-walked ' + report.length + ' lines (Stockfish best, depth ' + DEPTH + ') ===');
for (const r of report) console.log('  ' + String(r.newEval).padStart(7) + '  ' + r.key);
const stillBad = report.filter((r) => r.newEval != null && r.newEval < -2.5);
console.log('\nstill < -2.5 after best play (genuinely dubious — narration must say so):', stillBad.length);
stillBad.forEach((r) => console.log('  ' + r.newEval + '  ' + r.key));
