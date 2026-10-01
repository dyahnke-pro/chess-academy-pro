// Engine check of the endgame LESSON keystones too big for the tablebase (>7
// pieces): Stockfish evaluates the start and the end of the lesson's line, from
// White's side, against the claimed result. A claimed win needs >= +2.0 at both
// ends; a claimed draw within ±1.0. Companion to verify-lesson-keystones.mjs.
// Run from the repo root: node scripts/endgame-drills/verify-lesson-keystones-engine.mjs
import { Chess } from 'chess.js';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
const ev = (fen, depth = 22) => new Promise((res) => {
  const sf = spawn(process.execPath, ['node_modules/stockfish/bin/stockfish.js']);
  let cp = null;
  sf.stdout.on('data', (d) => {
    const s = d.toString();
    for (const m of s.matchAll(/score (cp|mate) (-?\d+)/g)) cp = m[1] === 'mate' ? (Number(m[2]) > 0 ? 10000 : -10000) : Number(m[2]);
    if (/bestmove/.test(s)) { sf.kill(); res(cp); }
  });
  sf.stdin.write(`uci\nposition fen ${fen}\ngo depth ${depth}\n`);
  setTimeout(() => { try { sf.kill(); } catch { /* gone */ } res(cp); }, 90000);
});
const white = (cp, fen) => (cp === null ? null : fen.split(' ')[1] === 'w' ? cp : -cp);
const ok = (claim, w) => w !== null && (claim === 'white-wins' ? w >= 200 : claim === 'black-wins' ? w <= -200 : Math.abs(w) <= 100);
for (const f of ['pawn-endings', 'rook-endings', 'drawn-patterns', 'endgame-principles']) {
  for (const p of JSON.parse(readFileSync(`src/data/${f}.json`, 'utf8'))) for (const [i, lp] of (p.positions ?? []).entries()) {
    const c = new Chess(lp.fen);
    if (c.board().flat().filter(Boolean).length <= 7) continue;
    const w0 = white(await ev(lp.fen), lp.fen);
    for (const san of lp.solution ?? []) { try { c.move(san); } catch { break; } }
    const w1 = c.isGameOver() ? null : white(await ev(c.fen()), c.fen());
    const good = ok(lp.result, w0) && (w1 === null || ok(lp.result, w1));
    console.log(`${good ? 'ok ' : 'BAD'} ${f}/${p.id}#${i} claims ${lp.result} :: start ${w0}cp, line end ${w1}cp`);
  }
}
