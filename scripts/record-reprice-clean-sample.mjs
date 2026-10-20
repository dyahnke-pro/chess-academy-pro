#!/usr/bin/env node
// L6 sizing: how often did the two-read price hide a real cost on a move the
// analysis called CLEAN (no stored best move, so the backfill cannot re-price
// it without a full search)? Samples N such student moves from David's drop,
// finds the best move with a full search, then scores best and played in ONE
// search at the same depth.
//   node scripts/record-reprice-clean-sample.mjs [N=200] [depth=16]
import { readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { Chess } from 'chess.js';

const N = Number(process.argv[2] ?? 200);
const DEPTH = Number(process.argv[3] ?? 16);
const raw = JSON.parse(readFileSync('audit-reports/.fixtures/data-drop-david.json', 'utf8'));
const t = raw.stores ?? raw.tables ?? raw;
const user = (t.profiles?.[0]?.preferences?.chessComUsername ?? '').toLowerCase();

const seatOf = (g) => {
  if (g.studentSide) return g.studentSide;
  if (user && (g.white ?? '').toLowerCase() === user) return 'white';
  if (user && (g.black ?? '').toLowerCase() === user) return 'black';
  return null;
};

// Deterministic sample: every k-th clean student move.
const pool = [];
for (const g of t.games) {
  if (!g.fullyAnalyzed || !g.annotations?.length) continue;
  const seat = seatOf(g);
  if (!seat) continue;
  const c = new Chess();
  try { c.loadPgn(g.pgn); } catch { continue; }
  const hist = c.history({ verbose: true });
  const sans = hist.map((m) => m.san);
  const fens = hist.map((m) => m.before);
  for (const a of g.annotations) {
    if (a.color !== seat || a.bestMove || typeof a.costCp === 'number') continue;
    if (!['good', 'great', 'brilliant'].includes(a.classification)) continue;
    const i = (a.moveNumber - 1) * 2 + (a.color === 'black' ? 1 : 0);
    if (!fens[i] || sans[i] !== a.san) continue;
    const twoRead = a.evaluation != null && a.preMoveEval != null ? Math.max(0, (a.preMoveEval - a.evaluation) * (seat === 'white' ? 1 : -1)) : null;
    pool.push({ game: g.id, fen: fens[i], san: a.san, cls: a.classification, twoRead });
  }
}
const step = Math.max(1, Math.floor(pool.length / N));
const sample = pool.filter((_, i) => i % step === 0).slice(0, N);
console.log(`clean student moves: ${pool.length}; sampling ${sample.length} at depth ${DEPTH}`);

function engine() {
  const p = spawn('/usr/games/stockfish');
  let buf = ''; let waiter = null;
  p.stdout.on('data', (d) => {
    buf += d.toString(); let nl;
    while ((nl = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, nl); buf = buf.slice(nl + 1); if (waiter) waiter(line); }
  });
  p.stdin.write('uci\nsetoption name Threads value 1\nsetoption name Hash value 64\n');
  const go = (fen, args, multipv) => new Promise((resolve) => {
    const last = new Map();
    waiter = (line) => {
      const m = new RegExp(`\\bdepth ${DEPTH} .*\\bmultipv (\\d+) .*\\bscore (cp|mate) (-?\\d+).*\\bpv (\\S+)`).exec(line);
      if (m) last.set(m[4], m[2] === 'cp' ? Number(m[3]) : (Number(m[3]) > 0 ? 100000 : -100000));
      if (line.startsWith('bestmove')) { waiter = null; resolve({ last, best: line.split(' ')[1] }); }
    };
    p.stdin.write(`setoption name MultiPV value ${multipv}\nucinewgame\nposition fen ${fen}\ngo depth ${DEPTH}${args}\n`);
  });
  return { go, quit: () => p.stdin.write('quit\n') };
}

const WORKERS = 4;
const results = [];
let next = 0;
await Promise.all(Array.from({ length: WORKERS }, async () => {
  const e = engine();
  while (next < sample.length) {
    const s = sample[next++];
    const c = new Chess(s.fen); const mv = c.move(s.san);
    const played = `${mv.from}${mv.to}${mv.promotion ?? ''}`;
    const full = await e.go(s.fen, '', 1);
    const best = full.best;
    if (best === played) { results.push({ ...s, cost: 0 }); continue; }
    const one = await e.go(s.fen, ` searchmoves ${best} ${played}`, 2);
    const b = one.last.get(best); const pl = one.last.get(played);
    results.push({ ...s, best, cost: b !== undefined && pl !== undefined && Math.abs(b) < 50000 && Math.abs(pl) < 50000 ? Math.max(0, b - pl) : null });
    if (results.length % 25 === 0) console.log(`  ${results.length}/${sample.length}`);
  }
  e.quit();
}));

const priced = results.filter((r) => r.cost !== null);
const over = (x) => priced.filter((r) => r.cost >= x).length;
const summary = { pool: pool.length, sampled: results.length, priced: priced.length, cost50: over(50), cost100: over(100), cost300: over(300) };
writeFileSync('audit-reports/record-reprice/clean-sample.json', JSON.stringify({ summary, worst: [...priced].sort((a, b) => b.cost - a.cost).slice(0, 10) }, null, 2));
console.log(JSON.stringify(summary));
