// Real Stockfish reads (MultiPV 3, depth 14) for every position of the games
// in src/test/fixtures/os11 — the engine-backed half of the names-move gate
// (learnNamesNoMoveOs11.gate.test.ts) reads them so it runs without an engine.
// Re-run when a game is added: node scripts/os11-engine-reads.mjs
import { spawn } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const DIR = 'src/test/fixtures/os11';
const DEPTH = 14;
const MULTIPV = 3;

// The npm WASM build, run by node (no native engine in every container).
const sf = spawn(process.execPath, ['node_modules/stockfish/bin/stockfish-18-single.js']);
let buf = '';
const waiters = [];
sf.stdout.on('data', (d) => {
  buf += d.toString();
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
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
send(`setoption name MultiPV value ${MULTIPV}`);
send('isready'); await until((l) => l === 'readyok');

async function read(fen) {
  send('ucinewgame');
  send(`position fen ${fen}`);
  send(`go depth ${DEPTH}`);
  const lines = await until((l) => l.startsWith('bestmove'));
  const white = fen.split(' ')[1] === 'w' ? 1 : -1;
  const pv = new Map();
  for (const l of lines) {
    const m = / depth (\d+) .*multipv (\d+) score (cp|mate) (-?\d+).* pv (.+)$/.exec(l);
    if (!m || Number(m[1]) !== DEPTH) continue;
    const v = Number(m[4]) * white;
    pv.set(Number(m[2]), { rank: Number(m[2]), evaluation: m[3] === 'cp' ? v : (v > 0 ? 100000 : -100000), mate: m[3] === 'mate' ? v : null, moves: m[5].split(' ') });
  }
  const topLines = [...pv.values()].sort((a, b) => a.rank - b.rank);
  const best = lines.at(-1).split(' ')[1];
  return { depth: DEPTH, bestMove: best, evaluation: topLines[0]?.evaluation ?? 0, isMate: topLines[0]?.mate != null, mateIn: topLines[0]?.mate ?? null, topLines };
}

/** The board with the side to move passing — the same string as
 *  `threatOut.flipSideToMove` (no pass out of check). */
function nullMove(fen) {
  const c = new Chess(fen);
  if (c.inCheck()) return null;
  const p = fen.split(' ');
  p[1] = p[1] === 'w' ? 'b' : 'w';
  p[3] = '-';
  const flipped = p.join(' ');
  try { new Chess(flipped); return flipped; } catch { return null; }
}

const out = {};
for (const f of readdirSync(DIR).filter((n) => n.endsWith('.pgn')).sort()) {
  const c = new Chess();
  c.loadPgn(readFileSync(`${DIR}/${f}`, 'utf8'));
  const sans = c.history();
  const b = new Chess();
  const fens = [b.fen()];
  for (const s of sans) { b.move(s); fens.push(b.fen()); }
  // …and each board with the side to move passing (`moveIntent.nullMoveFen`):
  // what the move threatens and what it stops are read from those.
  const passes = fens.map(nullMove).filter((f) => f !== null);
  for (const fen of [...fens, ...passes]) {
    if (out[fen] || new Chess(fen).isGameOver()) continue;
    out[fen] = await read(fen);
  }
  console.log(`${f}: ${fens.length} positions (${Object.keys(out).length} total)`);
}
writeFileSync(`${DIR}/engine-reads.json`, `${JSON.stringify(out)}\n`);
send('quit');
