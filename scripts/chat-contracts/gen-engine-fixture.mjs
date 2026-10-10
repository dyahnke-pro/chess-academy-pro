#!/usr/bin/env node
// The chat-kind contracts' engine: REAL Stockfish analyses, fixed depth,
// MultiPV 3, one thread (deterministic), stored as a fixture so the contract
// tests run offline and repeat exactly.
//
//   node scripts/chat-contracts/gen-engine-fixture.mjs
//
// Reads the FENs the contract test asked for and did not find
// (`src/coach/__fixtures__/contractEngine.missing.json`, written by the test),
// analyses each, and merges them into `contractEngine.json`. Re-run the test,
// then this, until nothing is missing.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'src/coach/__fixtures__';
const OUT = path.join(DIR, 'contractEngine.json');
const MISSING = path.join(DIR, 'contractEngine.missing.json');
const DEPTH = Number(process.env.CONTRACT_DEPTH ?? 18);

const have = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const want = fs.existsSync(MISSING) ? JSON.parse(fs.readFileSync(MISSING, 'utf8')) : [];
const todo = [...new Set(want)].filter((f) => !have[f]);
if (todo.length === 0) { console.log('nothing missing'); process.exit(0); }

const sf = spawn(process.execPath, ['node_modules/stockfish/scripts/cli.js'], { stdio: ['pipe', 'pipe', 'inherit'] });
let buf = '';
const waiters = [];
sf.stdout.on('data', (d) => {
  buf += d.toString();
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
    for (const w of [...waiters]) w(line);
  }
});
const send = (s) => sf.stdin.write(`${s}\n`);
const until = (pred) => new Promise((res) => { const w = (l) => { if (pred(l)) { waiters.splice(waiters.indexOf(w), 1); res(l); } }; waiters.push(w); });

send('uci'); await until((l) => l === 'uciok');
send('setoption name Threads value 1');
send('setoption name Hash value 64');
send('setoption name MultiPV value 3');
send('isready'); await until((l) => l === 'readyok');

for (const fen of todo) {
  const lines = new Map();
  let depth = 0; let seldepth = 0;
  const onInfo = (l) => {
    const m = /^info .*\bdepth (\d+) .*\bseldepth (\d+) .*\bmultipv (\d+) .*\bscore (cp|mate) (-?\d+).* pv (.+)$/.exec(l);
    if (!m) return false;
    depth = Number(m[1]); seldepth = Number(m[2]);
    lines.set(Number(m[3]), { kind: m[4], val: Number(m[5]), moves: m[6].trim().split(/\s+/) });
    return false;
  };
  waiters.push(onInfo);
  send('ucinewgame'); send(`position fen ${fen}`); send(`go depth ${DEPTH}`);
  const best = await until((l) => l.startsWith('bestmove'));
  waiters.splice(waiters.indexOf(onInfo), 1);
  const flip = fen.split(' ')[1] === 'b' ? -1 : 1;
  const topLines = [...lines.entries()].sort((a, b) => a[0] - b[0]).map(([rank, x]) => ({
    rank,
    moves: x.moves,
    evaluation: x.kind === 'cp' ? x.val * flip : (x.val > 0 ? 100000 : -100000) * flip,
    mate: x.kind === 'mate' ? x.val * flip : null,
  }));
  const bestMove = best.split(/\s+/)[1];
  const top = topLines[0];
  have[fen] = {
    bestMove: bestMove === '(none)' ? '' : bestMove,
    evaluation: top?.evaluation ?? 0,
    isMate: top?.mate != null,
    mateIn: top?.mate ?? null,
    depth, seldepth, nodesPerSecond: 0, wdl: null,
    topLines,
  };
  console.log(`${fen} → ${bestMove} (${top?.mate != null ? `mate ${top.mate}` : top?.evaluation})`);
}
send('quit');
fs.writeFileSync(OUT, JSON.stringify(have, null, 1) + '\n');
fs.writeFileSync(MISSING, '[]\n');
console.log(`${todo.length} analysed, ${Object.keys(have).length} in the fixture`);
