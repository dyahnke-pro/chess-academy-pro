// Classify the engine-confirmed "declined free material" sublines: for each, walk
// the line and find the FIRST ply where the side to move's authored choice throws
// the game (eval swings from >= -0.8 to a loss, from that side's POV). That ply is
// where the authored line stops being best-play. Distinguishes:
//   FABRICATION  — the mover was equal/better and the authored move loses (the
//                  line teaches nonsense: a real opponent punishes it).
//   GAMBIT/DUBIOUS — the mover was already lost/worse before the flagged move
//                  (an inherently dubious gambit accurately shown; not a build bug).
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { makeEval } from './_engine-eval.mjs';

const ROOT = new URL('..', import.meta.url).pathname + '/';
const hits = JSON.parse(readFileSync(process.env.HITS, 'utf8'));
const data = JSON.parse(readFileSync(ROOT + 'src/data/course-sublines.json', 'utf8'));
const E = makeEval(Number(process.env.MS || 900));
const toPawns = (e, whiteToMove) => {
  let w; if (e.mate != null) w = e.mate > 0 ? 100 : -100; else if (e.cp != null) w = e.cp / 100; else return null;
  return whiteToMove ? w : -w; // white POV
};

const out = [];
for (const h of hits) {
  const grp = data[h.opening]?.[h.key];
  const arr = Array.isArray(grp) ? grp : [grp];
  const sl = arr.find((s) => s && s.moves && s.moves.join(' ') === h.line);
  if (!sl) { out.push({ ...h, verdict: 'NOT-FOUND' }); continue; }
  const c = new Chess();
  let firstBlunder = null;
  for (let i = 0; i < sl.moves.length; i++) {
    const whiteToMove = c.turn() === 'w';
    const before = toPawns(await E.eval(c.fen()), whiteToMove); // mover POV via white-normalize below
    const moverPovBefore = whiteToMove ? before : -before;      // + = good for the mover
    let mv; try { mv = c.move(sl.moves[i]); } catch { break; }
    const after = toPawns(await E.eval(c.fen()), c.turn() === 'w'); // white POV, opponent to move
    const moverPovAfter = whiteToMove ? after : -after;         // + = good for the (previous) mover
    if (moverPovBefore != null && moverPovAfter != null && moverPovBefore >= -0.8 && moverPovAfter <= -1.5 && (moverPovBefore - moverPovAfter) >= 1.5) {
      firstBlunder = { ply: i + 1, san: sl.moves[i], side: whiteToMove ? 'White' : 'Black', before: +moverPovBefore.toFixed(2), after: +moverPovAfter.toFixed(2) };
      break;
    }
  }
  out.push({ opening: h.opening, key: h.key, name: h.name, line: h.line, firstBlunder,
    verdict: firstBlunder ? 'FABRICATION' : 'DUBIOUS/GAMBIT' });
}
E.quit();

const fab = out.filter((o) => o.verdict === 'FABRICATION');
const dub = out.filter((o) => o.verdict === 'DUBIOUS/GAMBIT');
console.log(`\n=== ${fab.length} FABRICATION (mover was OK, authored move loses — real build bug) ===`);
for (const o of fab) {
  console.log(`[${o.opening}::${o.key}] ${o.name}`);
  console.log(`   BLUNDER ply ${o.firstBlunder.ply}: ${o.firstBlunder.side} ${o.firstBlunder.san}  (${o.firstBlunder.before} → ${o.firstBlunder.after} mover POV)`);
  console.log(`   ${o.line}`);
}
console.log(`\n=== ${dub.length} DUBIOUS/GAMBIT (mover already worse — accurate, not a build bug) ===`);
for (const o of dub) console.log(`[${o.opening}::${o.key}] ${o.name}\n   ${o.line}`);
import { writeFileSync } from 'node:fs';
writeFileSync(process.env.OUT || '/tmp/classify.json', JSON.stringify(out, null, 2));
