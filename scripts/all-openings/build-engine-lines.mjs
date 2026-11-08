#!/usr/bin/env node
// build-engine-lines — STOCKFISH'S BEST MOVES PAST THE DATA FLOOR
// (WO-ALL-SECTION-DEPTH, David 2026-11-08: "Stockfish's best moves fill the
// main line past the data floor; club games give the variations").
//
// Input: the boards the All-section main lines stop THIN on, written by
//   ALL_DEPTH_TERMINI=<file> npx vitest run src/services/allSectionDepth.measure.test.ts
// For each, Stockfish's best move (one line, MultiPV 1, fixed depth) is played,
// both sides, until the board is a middlegame board — both kings settled, no
// exchange half-played, the SAME test the page's walk stops on
// (`gamesCourse.isMiddlegameBoard`) — or MAX_EXT engine plies, or TOTAL_MAX
// plies in all. Every move is legal
// (chess.js plays it before it is kept). The moves are the ENGINE's, never
// "a move players played": the page says so where they start.
//
//   node scripts/all-openings/build-engine-lines.mjs <termini.json> <out.json> [shard i/n] [depth]
//   node scripts/all-openings/build-engine-lines.mjs --merge <public/data/engine-lines> <out-0.json> <out-1.json> …
//
// Checkpoints <out.json> every few boards and resumes from it, so a kill loses
// minutes. Progress lines go to stdout. --merge writes the shipped files the
// phone reads (`src/services/engineLine.ts`): one per first hex digit of the
// board's FNV-1a hash (the master tree's own hash, pinned below), every one of
// the 16 written so a missing file is a failed read; boards with no line are
// left out.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, renameSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';

/** FNV-1a, 32 bits — `masterTree.boardHash`; the vector pins it. */
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
if (fnv1a('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -') !== '44941583') throw new Error('fnv1a drifted');

function merge(outDir, files) {
  const shards = new Map();
  for (let i = 0; i < 16; i += 1) shards.set(i.toString(16), {});
  let lines = 0; let plies = 0;
  for (const f of files) {
    for (const [key, ucis] of Object.entries(JSON.parse(readFileSync(f, 'utf8')))) {
      if (!ucis) continue;
      shards.get(fnv1a(key).slice(0, 1))[key] = ucis;
      lines += 1; plies += ucis.split(' ').length;
    }
  }
  mkdirSync(outDir, { recursive: true });
  let bytes = 0;
  for (const [name, rows] of shards) { const text = JSON.stringify(rows); bytes += text.length; writeFileSync(join(outDir, `${name}.json`), text); }
  console.log(`[engine merge] ${lines} lines, ${plies} plies, ${(bytes / 1024).toFixed(0)} KB in 16 files`);
}

/** Engine plies at most past the data floor. */
const MAX_EXT = 24;
/** The whole main line at most (move 16 — the curated courses' median is 28
 *  plies): offbeat lines often keep a king uncastled under best play, and a
 *  line that has not settled both kings by then ends there. */
const TOTAL_MAX = 32;

function isMiddlegameBoard(c) {
  if (c.fen().split(' ')[2] !== '-') return false;
  const last = c.history({ verbose: true }).at(-1);
  if (!last?.captured) return true;
  return !c.moves({ verbose: true }).some((m) => m.to === last.to && m.captured);
}

function engine() {
  const p = spawn('/usr/games/stockfish', [], { stdio: ['pipe', 'pipe', 'ignore'] });
  let buf = '';
  let waiter = null;
  p.stdout.on('data', (d) => {
    buf += d.toString();
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (waiter && waiter.test(line)) { const w = waiter; waiter = null; w.resolve(line); }
    }
  });
  const send = (s) => p.stdin.write(`${s}\n`);
  const until = (re) => new Promise((resolve) => { waiter = { test: (l) => re.test(l), resolve }; });
  return {
    async init() { send('uci'); await until(/^uciok/); send('setoption name Threads value 1'); send('setoption name Hash value 32'); send('isready'); await until(/^readyok/); },
    async newGame() { send('ucinewgame'); send('isready'); await until(/^readyok/); },
    async best(fen, depth) { send(`position fen ${fen}`); send(`go depth ${depth}`); const l = await until(/^bestmove/); return l.split(/\s+/)[1]; },
    quit() { send('quit'); },
  };
}

async function main() {
  if (process.argv[2] === '--merge') { merge(process.argv[3], process.argv.slice(4)); return; }
  const [inFile, outFile, shardArg = '0/1', depthArg = '15'] = process.argv.slice(2);
  const [si, sn] = shardArg.split('/').map(Number);
  const depth = Number(depthArg);
  const termini = JSON.parse(readFileSync(inFile, 'utf8')).filter((_, i) => i % sn === si);
  const done = existsSync(outFile) ? JSON.parse(readFileSync(outFile, 'utf8')) : {};
  const save = () => { writeFileSync(`${outFile}.tmp`, JSON.stringify(done)); renameSync(`${outFile}.tmp`, outFile); };
  const sf = engine();
  await sf.init();
  const t0 = Date.now();
  let n = 0; let plies = 0;
  for (const t of termini) {
    if (done[t.key] !== undefined) continue;
    const c = new Chess();
    for (const s of t.sans) c.move(s);
    await sf.newGame();
    const ext = [];
    while (ext.length < MAX_EXT && c.history().length < TOTAL_MAX && !c.isGameOver() && !isMiddlegameBoard(c)) {
      const uci = await sf.best(c.fen(), depth);
      if (!uci || uci === '(none)') break;
      let mv;
      try { mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); } catch { break; }
      if (!mv) break;
      ext.push(uci);
    }
    done[t.key] = ext.join(' ');
    n += 1; plies += ext.length;
    if (n % 10 === 0) {
      save();
      const s = (Date.now() - t0) / 1000;
      console.log(`[engine ${shardArg}] ${n}/${termini.length} boards, ${plies} plies, ${s.toFixed(0)}s, ${(s / n).toFixed(1)}s/board`);
    }
  }
  save();
  sf.quit();
  console.log(`[engine ${shardArg}] done ${n} boards, ${plies} plies, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

void main();
