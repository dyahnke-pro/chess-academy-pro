#!/usr/bin/env node
/**
 * diagnose-lesson-ply — walk ONE lesson ply by ply, eval after every move from
 * the STUDENT's perspective, and name the move that costs the most.
 *
 * The deep verifier says WHETHER a line is genuinely bad; this says WHICH MOVE
 * makes it bad, and what the engine would play instead. That distinction decides
 * the fix: a single ply that drops 45cp is a patch, a tail that sits at -1.0 the
 * whole way is a spine that has to be re-derived from the data (per the
 * masterclass data-rebuild doctrine — the LLM never picks a move).
 *
 * Usage: KEY='vienna-game::Vienna vs 2...Nc6' node scripts/diagnose-lesson-ply.mjs
 */
import { Chess } from 'chess.js';
import { spawn } from 'child_process';
import { build } from 'esbuild';
import { tmpdir } from 'os';
import { join } from 'path';

const SF = '/usr/games/stockfish';
const DEPTH = Number(process.env.DEPTH ?? 22);
const CAP_MS = Number(process.env.CAP_MS ?? 30_000);

/** {cp, best} from the side-to-move's perspective, waiting for a real bestmove. */
function ev(fen) {
  return new Promise((res) => {
    const sf = spawn(SF);
    let cp = null, best = null, done = false;
    const finish = () => { if (done) return; done = true; try { sf.kill(); } catch { /* gone */ } res({ cp, best }); };
    sf.stdout.on('data', (d) => {
      for (const line of d.toString().split('\n')) {
        const cm = line.match(/score cp (-?\d+)/);
        const mm = line.match(/score mate (-?\d+)/);
        if (cm) cp = parseInt(cm[1], 10);
        if (mm) cp = parseInt(mm[1], 10) > 0 ? 10000 : -10000;
        const bm = line.match(/^bestmove (\S+)/);
        if (bm) { best = bm[1]; finish(); }
      }
    });
    sf.stdin.write(`position fen ${fen}\ngo depth ${DEPTH}\n`);
    setTimeout(finish, CAP_MS);
  });
}

const KEY = process.env.KEY;
if (!KEY) { console.error('set KEY='); process.exit(1); }

const out = join(tmpdir(), `lb-ply-${Date.now()}.mjs`);
await build({ entryPoints: ['src/data/lessons/index.ts'], bundle: true, format: 'esm', platform: 'node', outfile: out, loader: { '.json': 'json' }, logLevel: 'error' });
const { getAllLessonScripts } = await import(out);
const lesson = new Map(getAllLessonScripts().map((x) => [x.key, x.lesson])).get(KEY);
if (!lesson) { console.error(`no lesson for ${KEY}`); process.exit(1); }

let bt = lesson.beats[0];
for (const b of lesson.beats) if (b.moves.length > bt.moves.length) bt = b;
const student = lesson.orientation === 'black' ? 'b' : 'w';

console.log(`\n=== ${KEY} ===`);
console.log(`student=${student}  plies=${bt.moves.length}  depth=${DEPTH}`);
console.log(`line: ${bt.moves.join(' ')}\n`);
console.log('  ply  move      eval(student)   delta   engine prefers');

const c = new Chess();
let prev = null;
for (let i = 0; i < bt.moves.length; i++) {
  const san = bt.moves[i];
  const moverIsStudent = c.turn() === student;
  // What the engine wanted in THIS position, before the move is played.
  const before = moverIsStudent ? await ev(c.fen()) : null;
  let alt = '';
  if (before?.best) {
    try {
      const probe = new Chess(c.fen());
      const mv = probe.move({ from: before.best.slice(0, 2), to: before.best.slice(2, 4), promotion: before.best[4] });
      if (mv && mv.san !== san) alt = mv.san;
    } catch { /* unparseable bestmove */ }
  }
  try { c.move(san); } catch { console.log(`  ${String(i + 1).padStart(3)}  ILLEGAL ${san}`); break; }
  const { cp } = await ev(c.fen());
  const persp = cp === null ? null : (c.turn() === student ? cp : -cp);
  const delta = prev !== null && persp !== null ? persp - prev : null;
  const flag = moverIsStudent && delta !== null && delta <= -40 ? '  <== COSTS' : '';
  console.log(
    `  ${String(i + 1).padStart(3)}  ${san.padEnd(8)}  ${persp === null ? '  n/a' : String(persp).padStart(6)}cp` +
    `      ${delta === null ? '    ' : String(delta).padStart(5)}   ${alt ? `${alt}` : ''}${flag}`,
  );
  prev = persp;
}
console.log('');
