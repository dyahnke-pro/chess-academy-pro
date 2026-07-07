// Fix the engine-confirmed FABRICATION sublines (David 2026-07-07 accuracy
// sweep). Each has a game-backed prefix through its trigger deviation, then a
// FABRICATED tail from the old pre-engine DB-noise build path (the tell-tale
// "a3 a6 b3 a5 … Qxf7#" slow-pawn shuffle both sides blunder through). Fix:
// truncate to the trigger deviation (the lesson's premise — keep it) and
// re-walk STOCKFISH BEST-MOVE for both sides to a real middlegame (G3: engine
// is a verification tool, not invention — the same extender the sound tails
// already used). Verify the new terminus is sound from the STUDENT's side.
// Writes course-sublines.json in place; prints a per-line before/after report.
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { makeEval } from './_engine-eval.mjs';
import { reachesMiddlegame } from '../src/data/variationMiddlegameDepth.shared.mjs';

const ROOT = new URL('..', import.meta.url).pathname + '/';
const PATH = ROOT + 'src/data/course-sublines.json';
const data = JSON.parse(readFileSync(PATH, 'utf8'));
const fab = JSON.parse(readFileSync(process.env.FAB, 'utf8'));
const E = makeEval(Number(process.env.MS || 700));
const TARGET = 24, HARD = 30;

const whitePov = (e, whiteToMove) => {
  let w; if (e.mate != null) w = e.mate > 0 ? 100 : -100; else if (e.cp != null) w = e.cp / 100; else return null;
  return whiteToMove ? w : -w;
};

const report = [];
for (const f of fab) {
  const grp = data[f.opening][f.key];
  const arr = Array.isArray(grp) ? grp : [grp];
  const sl = arr.find((s) => s && s.moves && s.moves.join(' ') === f.line);
  if (!sl) { report.push({ ...f, status: 'NOT-FOUND' }); continue; }

  // student = the side that did NOT make the trigger deviation. atPly is the
  // 0-indexed position of the trigger move; the trigger's mover is the OPPONENT.
  const triggerWhite = f.atPly % 2 === 0; // even index = White's move
  const studentWhite = !triggerWhite;

  // keep through the trigger deviation, drop the fabricated tail
  const prefix = sl.moves.slice(0, f.atPly + 1);
  const c = new Chess();
  for (const m of prefix) c.move(m);

  // re-walk engine best-move to a middlegame
  const walked = prefix.slice();
  for (let ply = walked.length; ply < HARD; ply++) {
    if (ply >= TARGET && reachesMiddlegame(walked.join(' '))) break;
    const { best } = await E.eval(c.fen());
    if (!best) break;
    const from = best.slice(0, 2), to = best.slice(2, 4), promo = best.slice(4) || undefined;
    let mv; try { mv = c.move({ from, to, promotion: promo }); } catch { mv = null; }
    if (!mv) break;
    walked.push(mv.san);
  }

  // soundness at terminus, from the student's POV
  const term = whitePov(await E.eval(c.fen()), c.turn() === 'w');
  const studentCp = term == null ? null : (studentWhite ? term : -term);

  const old = sl.moves.join(' ');
  sl.moves = walked;
  sl.reachesMiddlegame = reachesMiddlegame(walked.join(' '));
  report.push({
    opening: f.opening, key: f.key, trigger: `${f.triggerMove}@${f.atPly}`,
    student: studentWhite ? 'White' : 'Black',
    studentCp: studentCp == null ? null : +studentCp.toFixed(2),
    oldTail: old.split(' ').slice(f.atPly + 1).join(' '),
    newTail: walked.slice(f.atPly + 1).join(' '),
    status: studentCp == null ? 'NO-EVAL' : (studentCp < -1.2 ? 'STILL-BAD' : 'FIXED'),
  });
}
E.quit();

if (!process.env.DRY) writeFileSync(PATH, JSON.stringify(data, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
const fixed = report.filter((r) => r.status === 'FIXED').length;
const bad = report.filter((r) => r.status === 'STILL-BAD');
console.error(`\n${fixed}/${report.length} FIXED (student not worse than -1.2)${process.env.DRY ? ' [DRY-RUN, not written]' : ' — written'}`);
if (bad.length) { console.error(`STILL-BAD (${bad.length}):`); for (const b of bad) console.error(`  ${b.opening}::${b.key} ${b.trigger} studentCp=${b.studentCp}`); }
