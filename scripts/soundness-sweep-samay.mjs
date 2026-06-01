#!/usr/bin/env node
// Soundness sweep for Samay Raina's pro-rep content (read-only — flags, never
// writes). Engine-evals from the STUDENT's perspective:
//   1. the FINAL position of every Samay lesson (main + variation), and
//   2. the terminal position of every Samay middlegame/endgame playable line.
// Flags any line that leaves the student clearly worse (< -1.0) — the hidden-
// dubious class (a line that narrates "fine" while it's actually losing). His
// lines are data-derived from his real games, so a few may be objectively
// dubious; this tells us which to relabel or rebuild. Needs Stockfish.
//   STOCKFISH_PATH=/usr/games/stockfish node scripts/soundness-sweep-samay.mjs
import { Chess } from 'chess.js';
import { spawn } from 'node:child_process';
import { build } from 'esbuild';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

const SF = process.env.STOCKFISH_PATH || '/usr/games/stockfish';
const DEPTH = Number(process.env.SWEEP_DEPTH) || 18;

function ev(fen) {
  return new Promise((res) => {
    const sf = spawn(SF);
    let cp = null;
    sf.stdout.on('data', (d) => {
      const s = d.toString();
      const m = s.match(/score cp (-?\d+)/g);
      if (m) cp = parseInt(m[m.length - 1].match(/-?\d+/)[0], 10);
      const mt = s.match(/score mate (-?\d+)/);
      if (mt) cp = parseInt(mt[1], 10) > 0 ? 10000 : -10000;
      if (/bestmove/.test(s)) { sf.kill(); res(cp); }
    });
    sf.on('error', () => res(null));
    sf.stdin.write(`position fen ${fen}\ngo depth ${DEPTH}\n`);
    setTimeout(() => { try { sf.kill(); } catch { /* */ } res(cp); }, 15000);
  });
}

// Bundle the lessons index (TS) and read the runtime maps.
const o = join(tmpdir(), `lb-samay-${Date.now()}.mjs`);
await build({ entryPoints: ['src/data/lessons/index.ts'], bundle: true, format: 'esm', platform: 'node', outfile: o, loader: { '.json': 'json' }, logLevel: 'error' });
const { getAllLessonScripts } = await import(o);

const samayLessons = getAllLessonScripts().filter(
  ({ key, lesson }) => key.includes('samay') || (lesson.openingId || '').includes('samay'),
);

const rows = [];
for (const { key, lesson } of samayLessons) {
  let bt = lesson.beats[0];
  for (const x of lesson.beats) if (x.moves.length > bt.moves.length) bt = x;
  const c = new Chess();
  let ok = true;
  for (const m of bt.moves) { try { c.move(m); } catch { ok = false; break; } }
  if (!ok) continue;
  const cp = await ev(c.fen());
  const student = lesson.orientation === 'black' ? 'b' : lesson.orientation === 'white' ? 'w' : (lesson.openingId || '').match(/sicilian-black|open-e5|scandi/) ? 'b' : 'w';
  const persp = c.turn() === student ? cp : (cp == null ? null : -cp);
  rows.push({ kind: 'lesson', key, student, cp: persp, plies: bt.moves.length });
}

// Plan terminal positions (middlegame + endgame) for Samay.
const plans = JSON.parse(readFileSync('src/data/middlegame-plans.json', 'utf8'))
  .filter((p) => (p.openingId || '').includes('samay'));
for (const p of plans) {
  const line = (p.playableLines || [])[0];
  if (!line) continue;
  const c = new Chess(line.fen);
  let ok = true;
  for (const m of line.moves) { try { c.move(m); } catch { ok = false; break; } }
  if (!ok) continue;
  const student = /sicilian-black|open-e5|scandi/.test(p.openingId) ? 'b' : 'w';
  const cp = await ev(c.fen());
  const persp = c.turn() === student ? cp : (cp == null ? null : -cp);
  rows.push({ kind: p.id.endsWith('-endgame') ? 'endgame' : 'plan', key: p.id, student, cp: persp, plies: line.moves.length });
}

rows.sort((a, b) => (a.cp ?? 0) - (b.cp ?? 0));
console.log('\n=== SAMAY SOUNDNESS SWEEP (student POV; cp from final position) ===');
for (const r of rows) {
  console.log(`  ${r.kind.padEnd(8)} ${r.student} ${String(r.cp).padStart(6)}cp  (${r.plies}p)  ${r.key}`);
}
const bad = rows.filter((r) => r.cp != null && r.cp < -100);
console.log(`\n${bad.length} of ${rows.length} lines leave the student worse than -1.0 (candidates to relabel/rebuild):`);
for (const r of bad) console.log(`  FLAG ${r.cp}cp  ${r.key}`);
