#!/usr/bin/env node
/**
 * verify-soundness-lines — second pass over the lines `soundness-sweep.mjs`
 * flagged, before ANY content is touched.
 *
 * WHY THIS EXISTS. The sweep evals the lesson terminus at `go depth 18` with a
 * 12s cap, and on a timeout it keeps whatever score it last saw — so a flagged
 * number can be an incomplete search, not a verdict. Closed strategic positions
 * (Czech Benoni, KID Fianchetto) are exactly where a shallow read misleads. The
 * doctrine says verify the LINE is genuinely at fault — re-eval deeper and a few
 * plies earlier — before rebuilding a spine.
 *
 * So for each target: eval the terminus DEEP (waiting for the real bestmove, and
 * reporting the depth actually reached), then walk backwards in 2-ply steps. The
 * curve is the diagnosis:
 *   - flat and mildly negative       → the line is just slightly worse; not a defect
 *   - deep eval much milder than -18 → the sweep number was a shallow artifact
 *   - a cliff at one ply             → THAT move is the culprit, and it's real
 */
import { Chess } from 'chess.js';
import { spawn } from 'child_process';
import { build } from 'esbuild';
import { tmpdir } from 'os';
import { join } from 'path';

const SF = '/usr/games/stockfish';
const DEPTH = Number(process.env.DEPTH ?? 26);
const CAP_MS = Number(process.env.CAP_MS ?? 90_000);

/** Eval a FEN, returning {cp, depth} from the SIDE TO MOVE's perspective.
 *  Waits for a real `bestmove` and reports the depth reached, so an incomplete
 *  search is visible instead of silently passing as a verdict. */
function ev(fen) {
  return new Promise((res) => {
    const sf = spawn(SF);
    let cp = null, depth = 0, done = false;
    const finish = () => { if (done) return; done = true; try { sf.kill(); } catch { /* already gone */ } res({ cp, depth }); };
    sf.stdout.on('data', (d) => {
      for (const line of d.toString().split('\n')) {
        const dm = line.match(/ depth (\d+)/);
        const cm = line.match(/score cp (-?\d+)/);
        const mm = line.match(/score mate (-?\d+)/);
        if (cm) { cp = parseInt(cm[1], 10); if (dm) depth = parseInt(dm[1], 10); }
        if (mm) { cp = parseInt(mm[1], 10) > 0 ? 10000 : -10000; if (dm) depth = parseInt(dm[1], 10); }
        if (/^bestmove/.test(line)) finish();
      }
    });
    sf.stdin.write(`position fen ${fen}\ngo depth ${DEPTH}\n`);
    setTimeout(finish, CAP_MS);
  });
}

const TARGETS = (process.env.TARGETS ?? [
  'benoni-defence::Taimanov Variation (f4/Bb5+)',
  'sicilian-dragon::Yugoslav Attack: Chinese Dragon',
  'vienna-game::Vienna vs 2...Nc6',
  'kings-indian-defence::Fianchetto Variation',
  'pirc-defence::Czech Defence',
  'philidor-defence',
  'nimzo-indian',
  'benko-gambit::Benko Declined: Nf3 System',
  'old-indian-defence::Old Indian: Tartakower Variation',
  'sicilian-alapin::Alapin: Stoltz Attack (4.Nf3 before d4)',
  'benoni-defence::Czech Benoni (...e5 Closed Center)',
].join('|')).split('|');

const out = join(tmpdir(), `lb-verify-${Date.now()}.mjs`);
await build({ entryPoints: ['src/data/lessons/index.ts'], bundle: true, format: 'esm', platform: 'node', outfile: out, loader: { '.json': 'json' }, logLevel: 'error' });
const { getAllLessonScripts } = await import(out);
const byKey = new Map(getAllLessonScripts().map((x) => [x.key, x.lesson]));

console.log(`\n=== DEEP VERIFY (depth ${DEPTH}, cap ${CAP_MS / 1000}s) — student's perspective ===`);
console.log('    key                                              d18   deep(depth)   walk back (-2, -4, -6, -8)\n');

for (const key of TARGETS) {
  const lesson = byKey.get(key);
  if (!lesson) { console.log(`  ?? ${key} — NOT FOUND in the lesson registry`); continue; }
  let bt = lesson.beats[0];
  for (const b of lesson.beats) if (b.moves.length > bt.moves.length) bt = b;

  const student = lesson.orientation === 'black' ? 'b' : 'w';
  const curve = [];
  for (const back of [0, 2, 4, 6, 8]) {
    const moves = bt.moves.slice(0, bt.moves.length - back);
    if (moves.length < 6) { curve.push(null); continue; }
    const c = new Chess();
    let ok = true;
    for (const m of moves) { try { c.move(m); } catch { ok = false; break; } }
    if (!ok) { curve.push(null); continue; }
    const { cp, depth } = await ev(c.fen());
    const persp = cp === null ? null : (c.turn() === student ? cp : -cp);
    curve.push(persp === null ? null : { cp: persp, depth });
  }
  const t = curve[0];
  const back = curve.slice(1).map((x) => (x ? String(x.cp).padStart(5) : '    -')).join(' ');
  console.log(`  ${student}  ${key.slice(0, 48).padEnd(48)}  ${t ? `${String(t.cp).padStart(5)}cp @d${t.depth}` : '  n/a'}   ${back}`);
}
console.log('\nRead: a deep number far milder than the d18 sweep = shallow artifact, not a defect.');
console.log('      A sharp drop between two walk-back columns names the culprit ply.\n');
