#!/usr/bin/env node
// BUILD THE K+Q vs K SCENARIO LIBRARY (WO-CAMPAIGN-MASTER Lane A) — offline,
// deterministic, two instruments.
//
// Level 1's endgame mission (checkmate with king and queen) starts from a
// curated board, because a live game rarely reaches a bare K+Q vs K. Each
// library board is:
//   - K+Q against a lone king, the student's colour, the student to move;
//   - legal (chess.js loads it; the lone king is not in check; kings apart);
//   - not over, and not mate in one (chess.js: no move mates);
//   - the lone king in the centre — files c–f, ranks 3–6, two squares from
//     every edge — so the box has to be built;
//   - the queen not hanging (the lone king does not stand next to an
//     unguarded queen), so move one is never "save the queen" — already
//     implied by "not in check" (a queen beside a king gives check), kept as
//     a stated guard;
//   - mate distance 8–14 moves: chosen by the EXACT table
//     (`kqk-tablebase.mjs`, retrograde, no engine) and CONFIRMED by Stockfish
//     (`node_modules/stockfish/bin/stockfish.js`, one thread, depth 72 within
//     20M nodes, then depth 99 within 60M, hash cleared per board): its mate
//     score must equal the exact distance (a shorter one aborts the build —
//     the table would be wrong). The longest K+Q vs K mate is 10, so 8–14
//     means 8–10 in practice.
//
// EVERY SEARCH IS BOUNDED. A depth alone is not a bound: on
// 8/8/2K5/8/8/8/8/1q3k2 b the search exploded past depth 21 (mate 15, then a
// centipawn score, then nothing for 25 minutes) and wedged the build. Boards
// that converge use 5–6.5M nodes at depth 72, so a node budget (deterministic
// in one thread) stops the outlier, which is then rejected as unconfirmed; a
// wall-clock watchdog behind it sends `stop` and, if the engine still does not
// answer, replaces it.
//
// Candidates are drawn in a seeded shuffle (mulberry32, one seed per colour),
// so the same command writes the same file. Progress goes to stdout one line
// per accepted board; a partial library is checkpointed every 5 boards, and
// `--resume` takes the checkpoint's boards back WITHOUT re-reading the engine
// (each was verified by this script, and the draw order is the same), so a
// killed run loses minutes, not the run.
//
//   node scripts/scenarios/build-kq-vs-k.mjs [--per-colour 200] [--depth 72] [--resume]
//   node scripts/scenarios/build-kq-vs-k.mjs --finalize   # write the library from the checkpoint, no engine
//   node scripts/scenarios/build-kq-vs-k.mjs --demo       # print the briefing's demo line
//
// Writes src/missions/scenarios/kqVsK.json. The table's move generation is
// checked against chess.js by `kqk-selfcheck.mjs`.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Chess } from 'chess.js';
import {
  KING_STEPS, SQUARE_NAMES, adjacent, fenOf, idx, legalStm, solveKqk, strongMoves, weakMoves,
} from './kqk-tablebase.mjs';

const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? Number(process.argv[i + 1]) : dflt;
};
const PER_COLOUR = arg('--per-colour', 200);
const DEPTH = arg('--depth', 72);
const RETRY_DEPTH = 99;
/** Node budgets: converged boards use 5–6.5M at depth 72. */
const NODES = 20_000_000;
const RETRY_NODES = 60_000_000;
/** Wall-clock backstop for a budget, at a pessimistic 250k nodes/s under load. */
const watchdogMs = (nodes) => Math.ceil(nodes / 250_000) * 1000 + 30_000;
const MIN_DTM = 8;
const MAX_DTM = 14;
const OUT = resolve('src/missions/scenarios/kqVsK.json');
const SEEDS = { w: 0x5eed_0001, b: 0x5eed_0002 };

const fileOf = (s) => s & 7;
const rankOf = (s) => s >> 3;
const central = (s) => fileOf(s) >= 2 && fileOf(s) <= 5 && rankOf(s) >= 2 && rankOf(s) <= 5;
/** The lone king stands next to the queen and the strong king does not guard it. */
const queenHangs = (sk, q, dk) => adjacent(q, dk) && !adjacent(q, sk);

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffled(items, seed) {
  const a = [...items];
  const rand = mulberry32(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** The chess.js half of the rule — the same checks the runtime test repeats. */
function chessJsAccepts(fen, colour) {
  let c;
  try { c = new Chess(fen); } catch { return 'chess.js rejects the FEN'; }
  if (c.turn() !== colour) return 'not the student to move';
  if (c.isGameOver()) return 'over';
  const them = colour === 'w' ? 'b' : 'w';
  const theirKing = c.board().flat().find((p) => p && p.type === 'k' && p.color === them);
  if (!theirKing || c.isAttacked(theirKing.square, colour)) return 'their king in check';
  for (const m of c.moves()) {
    const d = new Chess(fen); d.move(m);
    if (d.isCheckmate()) return 'mate in one';
  }
  return null;
}

// ── Stockfish ────────────────────────────────────────────────────────────
function startEngine() {
  let proc = null;
  let buf = '';
  let waiter = null;
  let lastMate = null;
  const onData = (d) => {
    buf += d.toString();
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      const m = line.match(/^info .*\bscore (mate|cp) (-?\d+)/);
      if (m) lastMate = m[1] === 'mate' ? Number(m[2]) : null;
      if (waiter && waiter.re.test(line)) { const w = waiter; waiter = null; w.resolve(line); }
    }
  };
  /** Write, then wait for a line matching `re` — or null after `ms`. */
  const until = (re, write, ms) => new Promise((res) => {
    const w = { re, resolve: (line) => { clearTimeout(timer); res(line); } };
    const timer = setTimeout(() => { if (waiter === w) waiter = null; res(null); }, ms);
    waiter = w;
    proc.stdin.write(write);
  });
  const kill = () => { try { proc.stdin.write('quit\n'); proc.kill('SIGKILL'); } catch { /* gone */ } };
  const boot = async () => {
    if (proc) kill();
    proc = spawn(process.execPath, ['node_modules/stockfish/bin/stockfish.js'], { stdio: ['pipe', 'pipe', 'ignore'] });
    buf = ''; waiter = null;
    proc.stdout.on('data', onData);
    const ok = await until(/^readyok/, 'uci\nsetoption name Threads value 1\nsetoption name Hash value 64\nisready\n', 60_000);
    if (ok === null) throw new Error('Stockfish did not start');
  };
  return {
    ready: boot,
    /** Stockfish's mate score (moves, side to move) within `depth` and
     *  `nodes`, or null; `timedOut` when the watchdog had to step in. */
    async mateAt(fen, depth, nodes) {
      if ((await until(/^readyok/, 'ucinewgame\nisready\n', 30_000)) === null) await boot();
      lastMate = null;
      const done = await until(/^bestmove /, `position fen ${fen}\ngo depth ${depth} nodes ${nodes}\n`, watchdogMs(nodes));
      if (done !== null) return { mate: lastMate, timedOut: false };
      // The budget did not stop it: ask it to stop, else replace the engine.
      if ((await until(/^bestmove /, 'stop\n', 10_000)) === null) await boot();
      return { mate: null, timedOut: true };
    },
    quit: kill,
  };
}

function histogram(rows) {
  const h = {};
  for (const r of rows) h[r.dtm] = (h[r.dtm] ?? 0) + 1;
  return h;
}

async function buildColour(colour, candidates, table, sink, resumed) {
  const engine = startEngine();
  await engine.ready();
  const accepted = [];
  const rejected = { chessjs: 0, engine: 0 };
  let tried = 0;
  for (const [sk, q, dk] of shuffled(candidates, SEEDS[colour])) {
    if (accepted.length >= PER_COLOUR) break;
    tried++;
    const fen = fenOf(sk, q, dk, colour, true);
    const why = chessJsAccepts(fen, colour);
    if (why) { rejected.chessjs++; console.log(`[${colour}] reject ${fen} — ${why}`); continue; }
    const dtm = (table.stm[idx(sk, q, dk)] + 1) / 2;
    const prior = resumed[accepted.length];
    if (prior) {
      // The checkpoint must be this run's own prefix, in this run's order.
      if (prior.fen !== fen || prior.dtm !== dtm) throw new Error(`[${colour}] --resume: checkpoint board ${accepted.length + 1} is ${prior.fen}, this run draws ${fen} — delete the .partial`);
      accepted.push({ fen, dtm });
      continue;
    }
    // Stockfish's mate score is an upper bound that falls with depth (one
    // board read mate 13 at depth 30 and the true 7 only from depth 55): a
    // longer mate is "not converged" — retry deeper, then reject; a SHORTER
    // mate than the exact table would prove the table wrong, and stops the build.
    let read = await engine.mateAt(fen, DEPTH, NODES);
    if (read.mate !== dtm) read = await engine.mateAt(fen, RETRY_DEPTH, RETRY_NODES);
    const sf = read.mate;
    if (sf !== null && sf > 0 && sf < dtm) throw new Error(`Stockfish mates ${fen} in ${sf}, the exact table says ${dtm} — the table is wrong`);
    if (sf !== dtm) {
      rejected.engine++;
      console.log(`[${colour}] reject ${fen} — exact mate ${dtm}, Stockfish ${read.timedOut ? 'timed out' : sf === null ? 'no mate inside the budget' : `mate ${sf}`}`);
      continue;
    }
    accepted.push({ fen, dtm });
    sink(colour, accepted);
    console.log(`[${colour}] ${accepted.length}/${PER_COLOUR} ${fen} mate ${dtm} (tried ${tried})`);
  }
  engine.quit();
  return { accepted, rejected, tried };
}

/** The briefing demo: a DTM-optimal mate from the home squares where, among the optimal moves, the
 *  student's side prefers the queen a knight's move from the lone king, then
 *  the king walking closer — the box technique, played perfectly. */
function demoLine(table) {
  const knightAway = (a, b) => {
    const fd = Math.abs(fileOf(a) - fileOf(b)); const rd = Math.abs(rankOf(a) - rankOf(b));
    return (fd === 1 && rd === 2) || (fd === 2 && rd === 1);
  };
  const dist = (a, b) => Math.max(Math.abs(fileOf(a) - fileOf(b)), Math.abs(rankOf(a) - rankOf(b)));
  const centreDist = (s) => Math.max(Math.abs(fileOf(s) * 2 - 7), Math.abs(rankOf(s) * 2 - 7));
  const out = [];
  // Start from the home squares — king e1, queen d1 — against a centre king,
  // mate in 6–8: the board a beginner recognises.
  const sk = SQUARE_NAMES.indexOf('e1');
  const q = SQUARE_NAMES.indexOf('d1');
  for (let startDk = 0; startDk < 64; startDk++) {
    if (!central(startDk) || !legalStm(sk, q, startDk) || queenHangs(sk, q, startDk)) continue;
    const dtm = (table.stm[idx(sk, q, startDk)] + 1) / 2;
    if (dtm < 6 || dtm > 8) continue;
    let [k, qq, d] = [sk, q, startDk];
    const line = [];
    let ok = true;
    for (let guard = 0; guard < 40; guard++) {
      const here = table.stm[idx(k, qq, d)];
      const best = strongMoves(k, qq, d)
        .filter(([nk, nq]) => table.wtm[idx(nk, nq, d)] === here - 1)
        .sort((a, b) => (knightAway(b[1], d) - knightAway(a[1], d)) || (dist(a[0], d) - dist(b[0], d)) || (a[0] - b[0]) || (a[1] - b[1]));
      if (best.length === 0) { ok = false; break; }
      const [nk, nq] = best[0];
      line.push({ from: nk !== k ? k : qq, to: nk !== k ? nk : nq });
      [k, qq] = [nk, nq];
      if (table.wtm[idx(k, qq, d)] === 0) break;
      // The lone king: the longest defence, then toward the centre, then square order.
      const replies = weakMoves(k, qq, d).filter((m) => !m.takesQueen);
      const longest = Math.max(...replies.map((m) => table.stm[idx(k, qq, m.to)]));
      const pick = replies.filter((m) => table.stm[idx(k, qq, m.to)] === longest)
        .sort((a, b) => (centreDist(a.to) - centreDist(b.to)) || (a.to - b.to))[0];
      line.push({ from: d, to: pick.to });
      d = pick.to;
    }
    if (ok) out.push({ fen: fenOf(sk, q, startDk, 'w', true), line });
  }
  return out;
}

async function main() {
  const t0 = Date.now();
  const table = solveKqk();
  console.log(`exact table solved in ${Date.now() - t0} ms`);

  if (process.argv.includes('--demo')) {
    const demos = demoLine(table);
    console.log(`${demos.length} demo starts (Ke1 Qd1, centre king, mate in 6–8)`);
    const engine = startEngine();
    await engine.ready();
    for (const { fen, line } of demos) {
      const c = new Chess(fen);
      const sans = line.map((m) => c.move({ from: SQUARE_NAMES[m.from], to: SQUARE_NAMES[m.to] }).san);
      const sf = (await engine.mateAt(fen, DEPTH, NODES)).mate;
      console.log(`${fen}  [Stockfish mate ${sf}]  ${sans.join(' ')}  ${c.isCheckmate() ? '#' : 'NOT MATE'}`);
    }
    engine.quit();
    return;
  }

  if (process.argv.includes('--finalize')) {
    // The checkpoint's boards were each verified by this script; write them as
    // the library without reading the engine again.
    const prev = JSON.parse(readFileSync(`${OUT}.partial`, 'utf8'));
    const doc = {
      ...prev,
      stats: {
        w: { histogram: histogram(prev.w), finalizedFromCheckpoint: true },
        b: { histogram: histogram(prev.b), finalizedFromCheckpoint: true },
      },
    };
    writeFileSync(OUT, `${JSON.stringify(doc, null, 1)}\n`);
    console.log(`finalized ${prev.w.length} white / ${prev.b.length} black → ${OUT}`);
    console.log(JSON.stringify(doc.stats));
    return;
  }

  const candidates = [];
  for (let sk = 0; sk < 64; sk++) for (let q = 0; q < 64; q++) for (let dk = 0; dk < 64; dk++) {
    if (!central(dk) || !legalStm(sk, q, dk) || queenHangs(sk, q, dk)) continue;
    const dtm = (table.stm[idx(sk, q, dk)] + 1) / 2;
    if (dtm >= MIN_DTM && dtm <= MAX_DTM) candidates.push([sk, q, dk]);
  }
  console.log(`${candidates.length} candidate placements (centre king, queen safe, exact mate ${MIN_DTM}–${MAX_DTM})`);
  // Sanity: no king step table entry left the board.
  if (KING_STEPS.some((s) => s.some((t) => t < 0 || t > 63))) throw new Error('king steps off the board');

  const partial = { w: [], b: [] };
  const resumed = { w: [], b: [] };
  if (process.argv.includes('--resume') && existsSync(`${OUT}.partial`)) {
    const prev = JSON.parse(readFileSync(`${OUT}.partial`, 'utf8'));
    resumed.w = prev.w ?? []; resumed.b = prev.b ?? [];
    console.log(`resuming: ${resumed.w.length} white and ${resumed.b.length} black boards from the checkpoint`);
  }
  const write = (final, stats) => {
    const doc = {
      id: 'kq-vs-k',
      rule: 'K+Q vs lone K; student to move; legal, not over, not mate in one; lone king on c–f / 3–6; queen not hanging; exact mate distance 8–14 (retrograde table) confirmed by Stockfish',
      engine: `Stockfish 18 (node_modules/stockfish), 1 thread, depth ${DEPTH} within ${NODES} nodes (retry depth ${RETRY_DEPTH} within ${RETRY_NODES})`,
      seeds: SEEDS,
      ...(stats ? { stats } : {}),
      w: partial.w,
      b: partial.b,
    };
    writeFileSync(final ? OUT : `${OUT}.partial`, `${JSON.stringify(doc, null, 1)}\n`);
  };
  const sink = (colour, rows) => {
    partial[colour] = rows;
    if (rows.length % 5 === 0) write(false);
  };
  const [w, b] = await Promise.all([
    buildColour('w', candidates, table, sink, resumed.w),
    buildColour('b', candidates, table, sink, resumed.b),
  ]);
  partial.w = w.accepted; partial.b = b.accepted;
  const stats = {
    w: { histogram: histogram(w.accepted), tried: w.tried, rejected: w.rejected },
    b: { histogram: histogram(b.accepted), tried: b.tried, rejected: b.rejected },
  };
  write(true, stats);
  console.log(`DONE in ${((Date.now() - t0) / 1000).toFixed(0)} s → ${OUT}`);
  console.log(JSON.stringify(stats));
  if (w.accepted.length < PER_COLOUR || b.accepted.length < PER_COLOUR) {
    console.log('FAILED: a colour fell short of the target');
    process.exitCode = 1;
  }
}

main().catch((e) => { console.error('FAILED', e); process.exitCode = 1; });
