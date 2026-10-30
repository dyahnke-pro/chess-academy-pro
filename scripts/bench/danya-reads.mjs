// ENGINE READS for the Danya bench: every position of the voiced corpus that
// carries a note, read by native Stockfish the way the app's analysis keeps
// them (White's view; a mate kept as its distance). Two reads a note:
//   before — the board the noted move was played on, MultiPV 5 (the move, and
//            the moves a player would weigh beside it, each with its line);
//   after  — the board the note sits on, MultiPV 3 (the reply and its line).
// One shard per process, written note by note and resumable, so a killed run
// loses one note, never the run.
//
//   node scripts/bench/danya-reads.mjs <outDir> <i/n> [depth=14]
//
// Writes <outDir>/reads-<i>.jsonl ({ id, before: [line], after: [line] }, each
// line { uci, cp, mate, pv }) and a progress line every 25 notes to
// <outDir>/progress.log.
import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const [OUT, SHARD = '0/1', DEPTH = '14'] = process.argv.slice(2);
const [I, N] = SHARD.split('/').map(Number);
const ENGINE = existsSync('/usr/games/stockfish') ? '/usr/games/stockfish' : 'stockfish';
const root = new URL('../..', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const outFile = `${OUT}/reads-${I}.jsonl`;
const doneIds = new Set(existsSync(outFile)
  ? readFileSync(outFile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l).id)
  : []);
const notes = JSON.parse(readFileSync(`${root}public/data/voiced-teachings.json`, 'utf8')).notes
  .filter((_, k) => k % N === I);

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

async function read(fen, multiPv) {
  const blackToMove = fen.split(' ')[1] === 'b';
  send('ucinewgame');
  send(`setoption name MultiPV value ${multiPv}`);
  send('isready'); await until((l) => l === 'readyok');
  send(`position fen ${fen}`);
  send(`go depth ${DEPTH}`);
  const lines = await until((l) => l.startsWith('bestmove'));
  const byRank = new Map();
  for (const l of lines) {
    if (!l.startsWith('info ') || /\b(lowerbound|upperbound)\b/.test(l)) continue;
    const s = /score (cp|mate) (-?\d+)/.exec(l);
    const r = /multipv (\d+)/.exec(l);
    const p = / pv (.+)$/.exec(l);
    if (!s || !p) continue;
    const v = Number(s[2]) * (blackToMove ? -1 : 1);
    const pv = p[1].trim().split(/\s+/).slice(0, 12);
    byRank.set(r ? Number(r[1]) : 1, s[1] === 'cp'
      ? { uci: pv[0], cp: v, mate: null, pv }
      : { uci: pv[0], cp: null, mate: v === 0 ? (blackToMove ? 1 : -1) : v, pv });
  }
  return [...byRank.entries()].sort((a, b) => a[0] - b[0]).map(([, x]) => x);
}

const started = Date.now();
let count = 0;
for (const note of notes) {
  count++;
  if (doneIds.has(note.id)) continue;
  const sans = note.lineSan ?? [];
  if (sans.length === 0) { appendFileSync(outFile, `${JSON.stringify({ id: note.id, skip: 'no-line' })}\n`); continue; }
  const c = new Chess();
  let fenBefore = null;
  let ok = true;
  for (let k = 0; k < sans.length; k++) {
    if (k === sans.length - 1) fenBefore = c.fen();
    try { c.move(sans[k]); } catch { ok = false; break; }
  }
  if (!ok || !fenBefore) { appendFileSync(outFile, `${JSON.stringify({ id: note.id, skip: 'illegal' })}\n`); continue; }
  const fenAfter = c.fen();
  const before = await read(fenBefore, 5);
  const after = c.isGameOver() ? [] : await read(fenAfter, 3);
  appendFileSync(outFile, `${JSON.stringify({ id: note.id, before, after })}\n`);
  if (count % 25 === 0 || count === notes.length) {
    appendFileSync(`${OUT}/progress.log`, `shard ${I}/${N}: ${count}/${notes.length} notes, ${Math.round((Date.now() - started) / 1000)}s\n`);
  }
}
appendFileSync(`${OUT}/progress.log`, `shard ${I}/${N}: DONE ${notes.length} notes, ${Math.round((Date.now() - started) / 1000)}s\n`);
send('quit');
