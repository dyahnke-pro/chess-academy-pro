// THE BASELINE FOR "MORE HUMAN": what Stockfish capped to a player's rating
// (UCI_LimitStrength + UCI_Elo, floored at the engine's 1320) plays at the
// held-out positions of the all-moves reads — the same fifth of games
// (`hash(id) % 5 === 0`) the human model is measured on. The measure test
// (`humanMove.measure.test.ts`, HUMAN_ENGINE_PICKS) scores both the same way.
//
//   node scripts/meter/engine-elo-picks.mjs <movesDir> <out.jsonl> [movetimeMs=200] [i/n]
import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const [DIR, OUT, MOVETIME = '200', SHARD = '0/1'] = process.argv.slice(2);
const [I, N] = SHARD.split('/').map(Number);
const ENGINE = existsSync('/usr/games/stockfish') ? '/usr/games/stockfish' : 'stockfish';

function hash(s) {
  let h = 2166136261;
  for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const done = new Set(existsSync(OUT) ? readFileSync(OUT, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l).fen) : []);
const positions = [];
for (const f of readdirSync(DIR).filter((n) => /^moves-\d+\.jsonl$/.test(n))) {
  for (const line of readFileSync(join(DIR, f), 'utf8').split('\n')) {
    if (!line) continue;
    const o = JSON.parse(line);
    if (hash(o.id) % 5 === 0) positions.push(o);
  }
}
const mine = positions.filter((_, k) => k % N === I);

const sf = spawn(ENGINE);
let buf = '';
const waiters = [];
sf.stdout.on('data', (d) => {
  buf += d.toString();
  let k;
  while ((k = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, k).trim();
    buf = buf.slice(k + 1);
    for (const w of [...waiters]) w(line);
  }
});
const send = (c) => sf.stdin.write(`${c}\n`);
const until = (pred) => new Promise((res) => {
  const w = (l) => { if (pred(l)) { waiters.splice(waiters.indexOf(w), 1); res(l); } };
  waiters.push(w);
});

send('uci'); await until((l) => l === 'uciok');
send('setoption name Threads value 1');
send('setoption name Hash value 16');
send('setoption name UCI_LimitStrength value true');
send('isready'); await until((l) => l === 'readyok');

let wrote = 0;
const started = Date.now();
for (const o of mine) {
  if (done.has(o.fen)) continue;
  const elo = Math.max(1320, Math.min(3190, o.r));
  send(`setoption name UCI_Elo value ${elo}`);
  send('ucinewgame');
  send(`position fen ${o.fen}`);
  send(`go movetime ${MOVETIME}`);
  const bm = await until((l) => l.startsWith('bestmove'));
  const pick = bm.split(/\s+/)[1];
  appendFileSync(OUT, `${JSON.stringify({ fen: o.fen, r: o.r, elo, pick })}\n`);
  wrote += 1;
  if (wrote % 200 === 0) console.log(`engine-elo ${I}/${N}: ${wrote}/${mine.length}, ${Math.round((Date.now() - started) / 1000)}s`);
}
console.log(`engine-elo ${I}/${N}: DONE ${wrote}`);
send('quit');
