// ENGINE READS for the population sample (WO-MOTIFS-01 M7): every position of
// every sampled game read by native Stockfish at depth 12 — the best move, the
// score and its line, the way the app's analysis stores them (White's view;
// a mate kept as its distance so the calibration converts it through the
// app's own `mateEvalFor`). One shard per process, written game by game and
// resumable, so a killed run loses one game, never the run.
//
//   node scripts/meter/engine-reads.mjs <games.jsonl> <outDir> <i/n> [depth=12]
//
// Writes <outDir>/reads-<i>.jsonl ({ w, b, sans, reads: [{ best, cp, mate, pv }] })
// and appends a line per 10 games to <outDir>/progress.log.
import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const [GAMES, OUT, SHARD = '0/1', DEPTH = '12'] = process.argv.slice(2);
const [I, N] = SHARD.split('/').map(Number);
const ENGINE = existsSync('/usr/games/stockfish') ? '/usr/games/stockfish' : 'stockfish';
mkdirSync(OUT, { recursive: true });
const outFile = `${OUT}/reads-${I}.jsonl`;
const done = existsSync(outFile) ? readFileSync(outFile, 'utf8').split('\n').filter(Boolean).length : 0;
const games = readFileSync(GAMES, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((_, k) => k % N === I);

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

async function read(fen) {
  const blackToMove = fen.split(' ')[1] === 'b';
  send(`position fen ${fen}`);
  send(`go depth ${DEPTH}`);
  const lines = await until((l) => l.startsWith('bestmove'));
  let cp = null;
  let mate = null;
  let pv = [];
  for (const l of lines) {
    if (!l.startsWith('info ') || /\b(lowerbound|upperbound)\b/.test(l)) continue;
    const s = /score (cp|mate) (-?\d+)/.exec(l);
    if (!s) continue;
    const v = Number(s[2]) * (blackToMove ? -1 : 1);
    if (s[1] === 'cp') { cp = v; mate = null; } else { mate = v === 0 ? (blackToMove ? 1 : -1) : v; cp = null; }
    const p = / pv (.+)$/.exec(l);
    pv = p ? p[1].trim().split(/\s+/).slice(0, 8) : [];
  }
  const bm = /^bestmove (\S+)/.exec(lines[lines.length - 1]);
  const best = bm && bm[1] !== '(none)' ? bm[1] : null;
  return { best, cp, mate, pv };
}

const started = Date.now();
for (let g = done; g < games.length; g++) {
  const { w, b, sans } = games[g];
  const c = new Chess();
  const fens = [c.fen()];
  for (const san of sans) { c.move(san); fens.push(c.fen()); }
  send('ucinewgame');
  const reads = [];
  for (const fen of fens) reads.push(await read(fen));
  appendFileSync(outFile, `${JSON.stringify({ w, b, sans, reads })}\n`);
  if ((g + 1) % 10 === 0 || g === games.length - 1) {
    appendFileSync(`${OUT}/progress.log`, `shard ${I}/${N}: ${g + 1}/${games.length} games, ${Math.round((Date.now() - started) / 1000)}s\n`);
  }
}
send('quit');
