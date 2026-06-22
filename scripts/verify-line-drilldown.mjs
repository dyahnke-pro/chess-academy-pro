#!/usr/bin/env node
// Drill-down for a flagged lesson line: eval the position after EACH ply at a
// DEEP depth, from the STUDENT's perspective, to separate a genuine taught-move
// blunder (sharp one-ply drop) from a normal space disadvantage / deep-line eval
// artifact (gentle drift). Per CLAUDE.md soundness doctrine: "verify the LINE is
// genuinely the fault vs a deep-line eval artifact before rebuilding; re-eval a
// few plies earlier / check the data's most-played alternative."
// Run: node scripts/verify-line-drilldown.mjs "<lesson key>" [depth=22]
import { Chess } from 'chess.js';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { build } from 'esbuild';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const KEY = process.argv[2];
const DEPTH = Number(process.argv[3] || 22);
if (!KEY) { console.error('usage: verify-line-drilldown.mjs "<key>" [depth]'); process.exit(2); }
const SF = ['/usr/games/stockfish', '/usr/bin/stockfish'].find((p) => existsSync(p));

function analyze(fen) { // returns {cp, best}
  return new Promise((res) => {
    const sf = spawn(SF); let cp = null, best = null;
    sf.stdout.on('data', (d) => {
      const s = d.toString();
      const m = s.match(/score cp (-?\d+)/g); if (m) cp = parseInt(m[m.length - 1].match(/-?\d+/)[0], 10);
      const mt = s.match(/score mate (-?\d+)/); if (mt) cp = parseInt(mt[1], 10) > 0 ? 10000 : -10000;
      const bm = s.match(/bestmove (\S+)/); if (bm) { best = bm[1]; sf.kill(); res({ cp, best }); }
    });
    sf.stdin.write(`position fen ${fen}\ngo depth ${DEPTH}\n`);
    setTimeout(() => { try { sf.kill(); } catch { /* */ } res({ cp, best }); }, 20000);
  });
}

const out = join(tmpdir(), `dd-${Date.now()}.mjs`);
await build({ entryPoints: ['src/data/lessons/index.ts'], bundle: true, format: 'esm', platform: 'node', outfile: out, loader: { '.json': 'json' }, logLevel: 'error' });
const { getAllLessonScripts } = await import(out);
const entry = getAllLessonScripts().find((x) => x.key === KEY);
if (!entry) { console.error(`no lesson "${KEY}"`); process.exit(2); }
let bt = entry.lesson.beats[0];
for (const x of entry.lesson.beats) if (x.moves.length > bt.moves.length) bt = x;
const student = entry.lesson.orientation === 'black' ? 'b' : 'w';
console.log(`\n${KEY}  (student=${student}, ${bt.moves.length} plies, depth ${DEPTH})`);
console.log(`spine: ${bt.moves.join(' ')}\n`);

const c = new Chess();
let prev = 0;
for (let i = 0; i < bt.moves.length; i++) {
  const mv = c.move(bt.moves[i]);
  const { cp, best } = await analyze(c.fen());
  const persp = cp === null ? null : (c.turn() === student ? cp : -cp);
  const who = (i % 2 === 0) === (student === 'w') ? 'S' : 'o'; // who just moved
  const drop = persp === null ? '' : (persp - prev <= -60 && who === 'S' ? `  <<< STUDENT move drops ${(persp - prev)}cp` : '');
  // best move at the position BEFORE this move would need pre-eval; we show the
  // engine's best reply at the resulting position to spot a missed defense.
  console.log(`  ${String(i).padStart(2)} ${who} ${mv.san.padEnd(7)} ${String(persp ?? '—').padStart(6)}cp   (engine best next: ${best})${drop}`);
  if (persp !== null) prev = persp;
}
