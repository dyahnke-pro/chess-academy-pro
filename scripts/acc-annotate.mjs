#!/usr/bin/env node
/**
 * acc-annotate — the engine half of the CLAIM CHECKER's corpus (2026-09-27).
 *
 * The claim checker feeds each coach computer the same inputs the live page
 * does, and the central one (`computePositionFacts`) reads the engine's TOP
 * THREE lines, not only the best move. `build-wo4-corpus --annotate` stores one
 * PV per position, so this reads MultiPV 3 at a fixed depth for every position
 * of every game and writes it next to the games file.
 *
 * Engine: the app's own npm Stockfish 18 over UCI (`scripts/cli.js`) — the same
 * engine the app runs, several processes in parallel. Resumable: games already
 * written are skipped.
 *
 * Usage: node scripts/acc-annotate.mjs <dir-with-games.json> [--depth 14] [--jobs 4]
 * Output: <dir>/multipv-d<depth>.json  [{ id, plies: [{ fen, san, lines: [{ cp, mate, pv }] }] }]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { Chess } from 'chess.js';

const dir = process.argv[2];
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? Number(process.argv[i + 1]) : d; };
const DEPTH = arg('--depth', 14);
const JOBS = arg('--jobs', 4);
if (!dir) { console.log('usage: acc-annotate.mjs <dir> [--depth 14] [--jobs 4]'); process.exit(1); }

function engine() {
  const p = spawn('node', ['node_modules/stockfish/scripts/cli.js'], { stdio: ['pipe', 'pipe', 'ignore'] });
  let buf = ''; let tap = null;
  p.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1); tap?.(l); } });
  const send = (c) => p.stdin.write(`${c}\n`);
  const until = (pred) => new Promise((res) => { tap = (l) => { if (pred(l)) { tap = null; res(l); } }; });
  return { send, until, setTap: (f) => { tap = f; }, kill: () => p.kill() };
}

async function ready(e) {
  e.send('uci'); await e.until((l) => l.startsWith('uciok'));
  e.send('setoption name MultiPV value 3');
  e.send('isready'); await e.until((l) => l.startsWith('readyok'));
}

/** Top 3 lines, scores from WHITE's point of view. */
async function read(e, fen) {
  const lines = new Map();
  const black = fen.split(' ')[1] === 'b';
  const done = new Promise((res) => e.setTap((l) => {
    if (l.startsWith('bestmove')) { e.setTap(null); res(); return; }
    if (!l.startsWith('info') || !l.includes(` depth ${DEPTH} `) || !l.includes(' pv ')) return;
    const k = /multipv (\d+)/.exec(l); if (!k) return;
    const cp = /score cp (-?\d+)/.exec(l); const mate = /score mate (-?\d+)/.exec(l);
    const flip = black ? -1 : 1;
    lines.set(Number(k[1]), {
      cp: cp ? Number(cp[1]) * flip : null,
      mate: mate ? Number(mate[1]) * flip : null,
      pv: l.slice(l.indexOf(' pv ') + 4).trim().split(/\s+/),
    });
  }));
  e.send(`position fen ${fen}`);
  e.send(`go depth ${DEPTH}`);
  await done;
  return [...lines.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
}

const games = JSON.parse(readFileSync(`${dir}/games.json`, 'utf8'));
const outPath = `${dir}/multipv-d${DEPTH}.json`;
const out = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf8')) : [];
const have = new Set(out.map((g) => g.id));
const queue = games.filter((g) => !have.has(g.id));
console.log(`[acc] ${out.length} done, ${queue.length} to go, ${JOBS} engines at d${DEPTH}`);
const t0 = Date.now();

async function worker() {
  const e = engine(); await ready(e);
  for (;;) {
    const g = queue.shift(); if (!g) break;
    const c = new Chess(); const plies = [];
    for (const san of g.moves.split(' ')) {
      const fen = c.fen();
      plies.push({ fen, san, lines: await read(e, fen) });
      c.move(san);
    }
    plies.push({ fen: c.fen(), san: null, lines: c.isGameOver() ? [] : await read(e, c.fen()) });
    out.push({ id: g.id, us: g.us, white: g.white, black: g.black, whiteElo: g.whiteElo, blackElo: g.blackElo, plies });
    writeFileSync(outPath, JSON.stringify(out));
    console.log(`[acc] ${out.length}/${games.length} ${g.id} ${plies.length}p ${((Date.now() - t0) / 60000).toFixed(1)}m`);
  }
  e.kill();
}
await Promise.all(Array.from({ length: JOBS }, worker));
console.log(`[acc] wrote ${out.length} → ${outPath}`);
