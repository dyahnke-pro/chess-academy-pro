// ALL-MOVES READS — what every legal move was worth, at positions real players
// faced, with the move they actually chose (David 2026-10-22: "make more
// human"). The human move picker (`humanMove.ts`) is fitted on these: which
// move a player of a given rating picks among all of them, given what each one
// costs and what kind of move it is.
//
// Native Stockfish, MultiPV = every legal move, fixed depth. Three positions a
// game from the population sample (`sample-lichess.mjs`), chosen by a hash of
// the game id so a rerun picks the same ones. One shard per process, written
// position by position and resumable.
//
//   node scripts/meter/all-moves-reads.mjs <games.jsonl> <outDir> <i/n> [depth=10] [perGame=3]
//
// Writes <outDir>/moves-<i>.jsonl:
//   { id, r, ply, fen, played, cands: [[uci, cp]] }   cp = mover's view, mate folded to ±(2000+)
// and a line per 25 positions to <outDir>/progress.log.
import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const [GAMES, OUT, SHARD = '0/1', DEPTH = '10', PER_GAME = '3'] = process.argv.slice(2);
const [I, N] = SHARD.split('/').map(Number);
const ENGINE = existsSync('/usr/games/stockfish') ? '/usr/games/stockfish' : 'stockfish';
const FIRST_PLY = 10;
mkdirSync(OUT, { recursive: true });
const outFile = `${OUT}/moves-${I}.jsonl`;
const doneKeys = new Set(existsSync(outFile)
  ? readFileSync(outFile, 'utf8').split('\n').filter(Boolean).map((l) => { const o = JSON.parse(l); return `${o.id}:${o.ply}`; })
  : []);
const games = readFileSync(GAMES, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((_, k) => k % N === I);

function hash(s) {
  let h = 2166136261;
  for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

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

async function readAll(fen, legal) {
  send(`setoption name MultiPV value ${legal}`);
  send(`position fen ${fen}`);
  send(`go depth ${DEPTH}`);
  const lines = await until((l) => l.startsWith('bestmove'));
  const byIndex = new Map();
  for (const l of lines) {
    if (!l.startsWith('info ') || /\b(lowerbound|upperbound)\b/.test(l)) continue;
    const mpv = /\bmultipv (\d+)/.exec(l);
    const s = /score (cp|mate) (-?\d+)/.exec(l);
    const p = / pv (\S+)/.exec(l);
    if (!mpv || !s || !p) continue;
    const v = Number(s[2]);
    const cp = s[1] === 'cp' ? v : Math.sign(v || 1) * (2000 + (100 - Math.min(99, Math.abs(v))));
    byIndex.set(Number(mpv[1]), [p[1], cp]);
  }
  return [...byIndex.values()];
}

const started = Date.now();
let wrote = 0;
for (const g of games) {
  const c = new Chess();
  const fens = [c.fen()];
  const ucis = [];
  for (const san of g.sans) {
    const m = c.move(san);
    ucis.push(`${m.from}${m.to}${m.promotion ?? ''}`);
    fens.push(c.fen());
  }
  const last = g.sans.length - 1;
  if (last < FIRST_PLY) continue;
  const picks = new Set();
  for (let k = 0; picks.size < Number(PER_GAME) && k < 20; k++) {
    picks.add(FIRST_PLY + (hash(`${g.id}:${k}`) % (last - FIRST_PLY + 1)));
  }
  for (const ply of [...picks].sort((a, b) => a - b)) {
    if (doneKeys.has(`${g.id}:${ply}`)) continue;
    const fen = fens[ply];
    const legal = new Chess(fen).moves().length;
    if (legal < 2) continue;
    send('ucinewgame');
    const cands = await readAll(fen, legal);
    const r = ply % 2 === 0 ? g.w : g.b;
    appendFileSync(outFile, `${JSON.stringify({ id: g.id, r, ply, fen, played: ucis[ply], cands })}\n`);
    wrote += 1;
    if (wrote % 25 === 0) {
      appendFileSync(`${OUT}/progress.log`, `shard ${I}/${N}: ${wrote} positions, ${Math.round((Date.now() - started) / 1000)}s\n`);
    }
  }
}
appendFileSync(`${OUT}/progress.log`, `shard ${I}/${N}: DONE ${wrote} positions, ${Math.round((Date.now() - started) / 1000)}s\n`);
send('quit');
