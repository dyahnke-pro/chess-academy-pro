// SLIP REPLIES (WO-DEPTH-01): the engine's answer after EVERY mistake and
// blunder in a sample of David's games, both seats — what Review holds as
// `recordReplyLine` — so the main concept (`slipDepth.mainConceptLine`) can be
// measured on whole games, not one slip a seat.
//
//   node scripts/depth/slip-replies.mjs <data-drop.json> <outDir> <i/n> [games=150] [depth=12]
//
// Writes <outDir>/replies-<i>.jsonl ({ game, ply, seat, san, fenBefore, replyUci }).
import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const [DROP, OUT, SHARD = '0/1', GAMES = '150', DEPTH = '12'] = process.argv.slice(2);
const [I, N] = SHARD.split('/').map(Number);
const ENGINE = existsSync('/usr/games/stockfish') ? '/usr/games/stockfish' : 'stockfish';
mkdirSync(OUT, { recursive: true });
const outFile = `${OUT}/replies-${I}.jsonl`;
const done = existsSync(outFile) ? readFileSync(outFile, 'utf8').split('\n').filter(Boolean).length : 0;

const drop = JSON.parse(readFileSync(DROP, 'utf8'));
const jobs = [];
for (const g of drop.stores.games.filter((x) => x.annotations?.length).slice(0, Number(GAMES))) {
  let sans;
  try { const c = new Chess(); c.loadPgn(g.pgn); sans = c.history(); } catch { continue; }
  for (const a of g.annotations) {
    if (a.classification !== 'mistake' && a.classification !== 'blunder') continue;
    const ply = (a.moveNumber - 1) * 2 + (a.color === 'black' ? 1 : 0);
    if (sans[ply] !== a.san) continue;
    jobs.push({ game: g.id, ply, seat: a.color, sans });
  }
}
const mine = jobs.filter((_, k) => k % N === I);

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
  const lines = [];
  const w = (l) => { lines.push(l); if (pred(l)) { waiters.splice(waiters.indexOf(w), 1); res(lines); } };
  waiters.push(w);
});
send('uci'); await until((l) => l === 'uciok');
send('setoption name Threads value 1');
send('setoption name Hash value 32');
send('isready'); await until((l) => l === 'readyok');

for (let j = done; j < mine.length; j += 1) {
  const job = mine[j];
  const c = new Chess();
  for (let k = 0; k < job.ply; k += 1) c.move(job.sans[k]);
  const fenBefore = c.fen();
  c.move(job.sans[job.ply]);
  send(`position fen ${c.fen()}`);
  send(`go depth ${DEPTH}`);
  const lines = await until((l) => l.startsWith('bestmove'));
  let pv = [];
  for (const l of lines) {
    if (!l.startsWith('info ') || /\b(lowerbound|upperbound)\b/.test(l)) continue;
    const p = / pv (.+)$/.exec(l);
    if (p && / multipv 1\b| score /.test(l)) pv = p[1].trim().split(/\s+/).slice(0, 12);
  }
  appendFileSync(outFile, `${JSON.stringify({ game: job.game, ply: job.ply, seat: job.seat, san: job.sans[job.ply], fenBefore, replyUci: pv })}\n`);
  if ((j + 1) % 50 === 0) appendFileSync(`${OUT}/progress.log`, `shard ${I}/${N}: ${j + 1}/${mine.length}\n`);
}
send('quit');
