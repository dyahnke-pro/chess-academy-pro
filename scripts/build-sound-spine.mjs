// Build a BOTH-SIDES-SOUND opening spine to the middlegame (David 2026-07-07:
// "100% accurate, no garbage" + "that goes under the gems if black blunders how
// white wins from it"). At each ply: take the masters-DB most-played move; if it
// has >= MINGAMES AND the engine says it does NOT blunder (eval swing < BLUNDER
// against the mover), play it (real theory). Otherwise play the Stockfish best
// move (sound by construction — the "Stockfish advances to the middlegame" rule).
// Any DB-most-played move that WOULD blunder is recorded as a GEM CANDIDATE (the
// common slip + the refutation = the punish-gem, per David). Walk to a middlegame
// (>= MIDPLY) and verify the terminus is sound for the student.
//
// Usage: node scripts/build-sound-spine.mjs "<seed SAN>" [studentColor=white]
//   env: MINGAMES(30) BLUNDER(1.0) MIDPLY(22) MS(900)
import { Chess } from 'chess.js';
import { readFileSync } from 'node:fs';
import { makeEval } from './_engine-eval.mjs';
import { reachesMiddlegame } from '../src/data/variationMiddlegameDepth.shared.mjs';

const ROOT = new URL('..', import.meta.url).pathname + '/';
const db = JSON.parse(readFileSync(ROOT + 'public/data/openings-masters-db.json', 'utf8')).positions;
const key = (fen) => fen.split(' ').slice(0, 4).join(' ');
const MINGAMES = Number(process.env.MINGAMES || 30);
const BLUNDER = Number(process.env.BLUNDER || 1.0);
const MIDPLY = Number(process.env.MIDPLY || 22);
const HARDPLY = Number(process.env.HARDPLY || 30);
const seed = (process.argv[2] || '').trim().split(/\s+/).filter(Boolean);
const studentWhite = (process.argv[3] || 'white') === 'white';
const E = makeEval(Number(process.env.MS || 900));

const whitePov = (e, whiteToMove) => {
  let w; if (e.mate != null) w = e.mate > 0 ? 100 : -100; else if (e.cp != null) w = e.cp / 100; else return null;
  return whiteToMove ? w : -w;
};
async function evalWhite(fen) { const c = new Chess(fen); return whitePov(await E.eval(fen), c.turn() === 'w'); }

const c = new Chess();
for (const m of seed) c.move(m); // seed is fixed (the named line's identity)
const spine = seed.slice();
const gems = [];

while (spine.length < HARDPLY) {
  if (spine.length >= MIDPLY && reachesMiddlegame(spine.join(' '))) break;
  const fen = c.fen();
  const mover = c.turn();
  const whiteBefore = await evalWhite(fen);
  const dbMoves = (db[key(fen)] || []).slice().sort((a, b) => b.games - a.games);
  const top = dbMoves[0];

  // engine best (for fallback + gem refutation)
  const { best } = await E.eval(fen);
  if (!best) break;
  const bestSan = (() => { const t = new Chess(fen); const mv = t.move({ from: best.slice(0, 2), to: best.slice(2, 4), promotion: best.slice(4) || undefined }); return mv && mv.san; })();

  let chosen = null;
  if (top && top.games >= MINGAMES) {
    // does the DB most-played move blunder?
    const t = new Chess(fen); t.move(top.san);
    const whiteAfter = whitePov(await E.eval(t.fen()), t.turn() === 'w');
    const swing = mover === 'w' ? (whiteBefore - whiteAfter) : (whiteAfter - whiteBefore); // + = mover worsened own side
    if (swing < BLUNDER) chosen = top.san;
    else {
      // DB most-played is a BLUNDER → it's a gem candidate; play engine best instead
      gems.push({ ply: spine.length + 1, fen, slip: top.san, slipGames: top.games, refutation: bestSan, swing: +swing.toFixed(2), mover });
    }
  }
  if (!chosen) chosen = bestSan; // thin DB or DB-blunder → Stockfish advances
  if (!chosen) break;
  c.move(chosen);
  spine.push(chosen);
}

const termWhite = await evalWhite(c.fen());
const studentCp = termWhite == null ? null : (studentWhite ? termWhite : -termWhite);
E.quit();

console.log(JSON.stringify({
  seed: seed.join(' '), spine, plies: spine.length,
  reachedMiddlegame: reachesMiddlegame(spine.join(' ')),
  terminusStudentCp: studentCp == null ? null : +studentCp.toFixed(2),
  gemCandidates: gems,
}, null, 2));
