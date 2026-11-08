// SLIP READS (WO-DEPTH-01): the engine's whole read at the moments David's
// games turned — every mistake or blunder (one a seat a game, the first from
// move 7) — and at a MATCHED ordinary move (same game, same seat, the nearest
// unflagged move from move 7), so every measure is compared against the same
// player in the same game, never against a population.
//
// Each position is read by native Stockfish at MultiPV 10, depth 12, from the
// side to move's view; a slip also gets the read AFTER it (the refutation's
// line). One shard per process, written position by position and resumable.
//
//   node scripts/depth/slip-reads.mjs <data-drop.json> <outDir> <i/n> [depth=12]
//
// Writes <outDir>/slips-<i>.jsonl ({ game, ply, seat, kind, san, fen, lines,
// after? }) and a line per 20 positions to <outDir>/progress.log.
import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const [DROP, OUT, SHARD = '0/1', DEPTH = '12'] = process.argv.slice(2);
const [I, N] = SHARD.split('/').map(Number);
const ENGINE = existsSync('/usr/games/stockfish') ? '/usr/games/stockfish' : 'stockfish';
const MULTIPV = 10;
const FROM_PLY = 12;
mkdirSync(OUT, { recursive: true });
const outFile = `${OUT}/slips-${I}.jsonl`;
const done = existsSync(outFile) ? readFileSync(outFile, 'utf8').split('\n').filter(Boolean).length : 0;

// THE JOBS — deterministic, the same on every run.
const drop = JSON.parse(readFileSync(DROP, 'utf8'));
const jobs = [];
for (const g of drop.stores.games) {
  const anns = g.annotations ?? [];
  if (!anns.length) continue;
  let sans;
  try { const c = new Chess(); c.loadPgn(g.pgn); sans = c.history(); } catch { continue; }
  const plyOf = (a) => (a.moveNumber - 1) * 2 + (a.color === 'black' ? 1 : 0);
  const flagged = new Set(anns.filter((a) => ['inaccuracy', 'mistake', 'blunder'].includes(a.classification)).map(plyOf));
  for (const seat of ['white', 'black']) {
    const slip = anns.find((a) => a.color === seat && (a.classification === 'mistake' || a.classification === 'blunder')
      && plyOf(a) >= FROM_PLY && sans[plyOf(a)] === a.san);
    if (!slip) continue;
    const sp = plyOf(slip);
    let ctl = -1;
    for (let d = 2; d < sans.length; d += 2) {
      for (const p of [sp - d, sp + d]) {
        if (p >= FROM_PLY && p < sans.length && !flagged.has(p)) { ctl = p; break; }
      }
      if (ctl >= 0) break;
    }
    if (ctl < 0) continue;
    jobs.push({ game: g.id, ply: sp, seat, kind: slip.classification, sans });
    jobs.push({ game: g.id, ply: ctl, seat, kind: 'ordinary', sans });
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

/** Every line at the deepest depth reached, from the side to move's view. */
async function read(fen, multipv) {
  send(`setoption name MultiPV value ${multipv}`);
  send(`position fen ${fen}`);
  send(`go depth ${DEPTH}`);
  const lines = await until((l) => l.startsWith('bestmove'));
  const byPv = new Map();
  for (const l of lines) {
    if (!l.startsWith('info ') || /\b(lowerbound|upperbound)\b/.test(l)) continue;
    const d = /\bdepth (\d+)/.exec(l); const m = /\bmultipv (\d+)/.exec(l);
    const s = /score (cp|mate) (-?\d+)/.exec(l); const p = / pv (.+)$/.exec(l);
    if (!d || !s || !p) continue;
    const k = m ? Number(m[1]) : 1;
    const prev = byPv.get(k);
    if (prev && prev.depth > Number(d[1])) continue;
    byPv.set(k, { depth: Number(d[1]), cp: s[1] === 'cp' ? Number(s[2]) : null, mate: s[1] === 'mate' ? Number(s[2]) : null, pv: p[1].trim().split(/\s+/).slice(0, 12) });
  }
  return [...byPv.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => ({ cp: v.cp, mate: v.mate, pv: v.pv }));
}

const started = Date.now();
for (let j = done; j < mine.length; j += 1) {
  const job = mine[j];
  const c = new Chess();
  for (let k = 0; k < job.ply; k += 1) c.move(job.sans[k]);
  const fen = c.fen();
  send('ucinewgame');
  const lines = await read(fen, MULTIPV);
  const row = { game: job.game, ply: job.ply, seat: job.seat, kind: job.kind, san: job.sans[job.ply], fen, lines };
  if (job.kind !== 'ordinary') {
    c.move(job.sans[job.ply]);
    row.after = (await read(c.fen(), 1))[0] ?? null;
  }
  appendFileSync(outFile, `${JSON.stringify(row)}\n`);
  if ((j + 1) % 20 === 0 || j === mine.length - 1) {
    appendFileSync(`${OUT}/progress.log`, `shard ${I}/${N}: ${j + 1}/${mine.length} positions, ${Math.round((Date.now() - started) / 1000)}s\n`);
  }
}
send('quit');
