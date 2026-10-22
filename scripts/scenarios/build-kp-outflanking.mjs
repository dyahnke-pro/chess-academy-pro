#!/usr/bin/env node
// BUILD THE OUTFLANKING SCENARIO LIBRARY (Campaign lane KP, Level 19) —
// offline, deterministic, three instruments.
//
// Every board is chosen by the EXACT king-and-pawn tables
// (`kp-tablebase.mjs`, retrograde, no engine) under the rule in
// `kp-outflank-rule.mjs`: the kings face each other, the student to move,
// the student wins, and ONLY a king sidestep keeps the win — the head-on
// tries, the retreats and the pawn run all let the defender draw.
// Then each board is checked twice more, independently:
//   - Stockfish (one process, bounded reads): the board is a win for the
//     student (+3.00 or a mate), and every move the tables call a draw reads
//     +0.60 or less for the student (the White boards; for each Black mirror
//     the start and the natural wrong move);
//   - Syzygy (the Lichess tablebase, exact): the board is a win, and every
//     child has exactly the result the tables give it, both colours.
// Any disagreement aborts the build — the tables would be wrong.
//
// The natural wrong move (`trap`) is the pawn run where the pawn can move,
// else the drawing king move closest to the defender's pawn (blocked pairs)
// or to the student's own pawn.
//
//   node scripts/scenarios/build-kp-outflanking.mjs
//
// Writes src/missions/scenarios/kpOutflanking.json and the exact verdicts
// the app reads, src/missions/checks/kpTables.json.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { Chess } from 'chess.js';
import * as T from './kp-tablebase.mjs';
import { outflankBoards } from './kp-outflank-rule.mjs';
import { packKpk, packPairSlices, sliceKey } from './kp-encode.mjs';
import { cpOf, startEngine, syzygy } from './kp-verify-lib.mjs';

const OUT = resolve('src/missions/scenarios/kpOutflanking.json');
const TABLES = resolve('src/missions/checks/kpTables.json');
const CACHE = resolve(process.env.KP_SYZYGY_CACHE ?? `${tmpdir()}/kp-syzygy-cache.json`);
const WIN_CP = 300;
const DRAW_CP = 60;

const t0 = Date.now();
const kpk = T.solveKpk();
const pairs = new Map();
for (let wp = 8; wp < 48; wp++) pairs.set(wp, T.solvePair(kpk, wp));
const lookup = T.makeLookup(kpk, pairs);
console.log(`tables solved in ${Date.now() - t0} ms`);

const sq = (s) => T.SQUARE_NAMES[s];
const flipUci = (u) => u.replace(/[1-8]/g, (r) => String(9 - Number(r)));
const piecesOf = (c) => c.board().flat().filter(Boolean).map((p) => ({ type: p.type, color: p.color, sq: T.squareIndex(p.square) }));
/** Exact result of a chess.js board, White's view, with the promotion rule. */
function exact(c, lastMove) {
  if (lastMove?.promotion) {
    if (lastMove.promotion !== 'q' && lastMove.promotion !== 'r') return 0;
    const lost = c.isStalemate() || c.moves({ verbose: true }).some((m) => m.captured === lastMove.promotion);
    return lost ? 0 : (lastMove.color === 'w' ? 1 : -1);
  }
  const v = lookup(piecesOf(c), c.turn());
  if (!v) throw new Error(`outside the tables: ${c.fen()}`);
  return v.val;
}
function dtcOf(c) { return lookup(piecesOf(c), c.turn()).dtc; }

/** The exact principal line: the winner fastest, the loser slowest. */
function principal(fen, maxPlies = 60) {
  const c = new Chess(fen); const sans = [];
  for (let k = 0; k < maxPlies && !c.isGameOver(); k++) {
    const kids = c.moves({ verbose: true }).filter((m) => !m.promotion || m.promotion === 'q').map((m) => {
      const d = new Chess(c.fen()); const mv = d.move(m);
      const v = exact(d, mv);
      return { m, v, dtc: mv.promotion ? 0 : dtcOf(d) };
    });
    const pick = c.turn() === 'w'
      ? kids.filter((x) => x.v === 1).sort((a, b) => a.dtc - b.dtc)[0]
      : kids.filter((x) => x.v === 1).sort((a, b) => b.dtc - a.dtc)[0];
    if (!pick) break;
    sans.push(pick.m.san); c.move(pick.m);
    if (pick.m.promotion) break;
  }
  return sans;
}

const boards = outflankBoards(kpk, pairs);
console.log(`${boards.length} boards meet the rule (White student)`);
const rows = [];
for (const b of boards) {
  const fen = b.fam === 'kpk' ? T.fenFor({ wk: b.wk, bk: b.bk, wp: b.pawnSq }, 0, 'w') : T.fenFor({ wk: b.wk, bk: b.bk, wp: b.pawnSq, bp: b.pawnSq + 8 }, 0, 'w');
  const c = new Chess(fen);
  const moves = c.moves({ verbose: true }).filter((m) => !m.promotion || m.promotion === 'q');
  const scored = moves.map((m) => { const d = new Chess(fen); const mv = d.move(m); return { uci: `${m.from}${m.to}${m.promotion ?? ''}`, m, v: exact(d, mv), dtc: mv.promotion ? 0 : dtcOf(d) }; });
  const key = scored.filter((x) => x.v === 1).sort((a, b2) => a.dtc - b2.dtc).map((x) => x.uci);
  const draws = scored.filter((x) => x.v !== 1);
  // The rule's own verdicts must agree with this chess.js walk.
  if (key.length !== b.wins.length || draws.length !== b.draws.length) throw new Error(`rule vs chess.js disagree on ${fen}`);
  const target = b.fam === 'pair' ? b.pawnSq + 8 : b.pawnSq;
  const dist = (s) => Math.max(Math.abs(T.fileOf(s) - T.fileOf(target)), Math.abs(T.rankOf(s) - T.rankOf(target)));
  const pawnRun = draws.find((x) => x.m.piece === 'p');
  const trap = pawnRun ?? [...draws].sort((a, b2) => dist(T.squareIndex(a.m.to)) - dist(T.squareIndex(b2.m.to)))[0];
  rows.push({ fen, family: b.fam, key, trap: trap.uci, draws: draws.map((x) => x.uci), dtc: dtcOf(c) });
}

// ── Stockfish ─────────────────────────────────────────────────────────────
const engine = startEngine({ cachePath: resolve(process.env.KP_SF_CACHE ?? `${tmpdir()}/kp-stockfish-cache.json`) });
await engine.ready();
const studentCp = async (fen, studentToMove) => {
  const s = await engine.score(fen);
  const cp = cpOf(s);
  return cp === null ? null : (studentToMove ? cp : -cp);
};
const accepted = { w: [], b: [] };
for (const r of rows) {
  const startW = await studentCp(r.fen, true);
  if (startW === null || startW < WIN_CP) throw new Error(`Stockfish does not see the win on ${r.fen} (${startW})`);
  for (const u of r.draws) {
    const d = new Chess(r.fen); d.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    const cp = await studentCp(d.fen(), false);
    if (cp === null || cp > DRAW_CP) throw new Error(`Stockfish reads ${u} on ${r.fen} as ${cp}, the tables say it draws`);
  }
  const mirror = flipBoard(r.fen);
  const startB = await studentCp(mirror, true);
  if (startB === null || startB < WIN_CP) throw new Error(`Stockfish does not see the win on ${mirror} (${startB})`);
  const trapB = flipUci(r.trap);
  const d = new Chess(mirror); d.move({ from: trapB.slice(0, 2), to: trapB.slice(2, 4), promotion: trapB[4] });
  const cpB = await studentCp(d.fen(), false);
  if (cpB === null || cpB > DRAW_CP) throw new Error(`Stockfish reads the trap ${trapB} on ${mirror} as ${cpB}`);
  accepted.w.push({ fen: r.fen, family: r.family, key: r.key, trap: r.trap, dtc: r.dtc, sf: { start: startW } });
  accepted.b.push({ fen: mirror, family: r.family, key: r.key.map(flipUci), trap: trapB, dtc: r.dtc, sf: { start: startB } });
  console.log(`[sf] ${r.fen}  start ${startW}  draws ${r.draws.length} ok  | mirror ${startB} trap ${cpB}`);
}
engine.quit();

// ── Syzygy ────────────────────────────────────────────────────────────────
const tb = syzygy(CACHE);
const resultFor = (cat, moverIsWhite) => (cat === 'draw' ? 0 : (cat === 'win') === moverIsWhite ? 1 : -1);
for (const colour of ['w', 'b']) {
  for (const r of accepted[colour]) {
    const c = new Chess(r.fen);
    if ((await tb.category(r.fen)) !== 'win') throw new Error(`Syzygy: ${r.fen} is not a win`);
    for (const m of c.moves({ verbose: true })) {
      if (m.promotion && m.promotion !== 'q') continue;
      const d = new Chess(r.fen); const mv = d.move(m);
      const mine = exact(d, mv);
      const theirs = d.isStalemate() ? 0 : resultFor(await tb.category(d.fen()), d.turn() === 'w');
      if (mine !== theirs) throw new Error(`Syzygy disagrees on ${r.fen} ${m.san}: tables ${mine}, Syzygy ${theirs}`);
    }
  }
  console.log(`[syzygy] ${colour}: ${accepted[colour].length} boards and every child agree`);
}
tb.save();

function flipBoard(fen) {
  const [placement, turn] = fen.split(' ');
  const rows8 = placement.split('/').reverse().map((row) => row.replace(/[a-zA-Z]/g, (ch) => (ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase())));
  return `${rows8.join('/')} ${turn === 'w' ? 'b' : 'w'} - - 0 1`;
}

// ── The briefing's demo: the exact line from a board the tables pick ──────
const demoFen = '8/4k3/2P5/4K3/8/8/8/8 w - - 0 1';
if (!accepted.w.some((r) => r.fen === demoFen)) throw new Error('the demo board is not in the library');
const demo = { fen: demoFen, sans: principal(demoFen) };

const usedPairs = new Set();
// The White boards' pairs ship; a Black board reads them through the colour mirror.
for (const colour of ['w']) for (const r of accepted[colour]) {
  if (r.family !== 'pair') continue;
  const c = new Chess(r.fen);
  const wp = c.board().flat().find((p) => p && p.type === 'p' && p.color === 'w');
  usedPairs.add(T.squareIndex(wp.square));
}
const slices = Object.fromEntries([...usedPairs].sort((a, b) => a - b).map((wp) => [sliceKey([sq(wp)], [sq(wp + 8)]), packPairSlices(pairs.get(wp), wp, T.pairLegal)]));
// Other builds (the triangulation slices) add their own slices to the same
// file: keep theirs, replace ours.
const existing = existsSync(TABLES) ? JSON.parse(readFileSync(TABLES, 'utf8')) : {};
writeFileSync(TABLES, `${JSON.stringify({
  about: 'Exact king-and-pawn verdicts (lane KP). kpk: K+P vs K, every position; slices: one pawn set each, the kings anywhere. Layout: scripts/scenarios/kp-encode.mjs. Built by scripts/scenarios/build-kp-*.mjs from kp-tablebase.mjs (+ Syzygy for slice exits); checked by src/missions/checks/kpEndings.test.ts.',
  kpk: packKpk(kpk),
  slices: { ...(existing.slices ?? {}), ...slices },
}, null, 1)}\n`);

writeFileSync(OUT, `${JSON.stringify({
  id: 'kp-outflanking',
  rule: 'K+P vs K or a blocked pawn pair; the student to move; the kings face each other (same file, the defender two ranks in front); the student wins, and only a king sidestep (same rank, one file across, no capture) keeps the win',
  verification: `exact retrograde tables (kp-tablebase.mjs); Stockfish (node_modules/stockfish, 1 thread, depth 32 within 2.5M nodes): start >= +${WIN_CP / 100} for the student, every drawing move <= +${DRAW_CP / 100} (White boards), the start and the trap (Black mirrors); Syzygy (tablebase.lichess.ovh): the start and every child, both colours`,
  demo,
  w: accepted.w,
  b: accepted.b,
}, null, 1)}\n`);
console.log(`wrote ${OUT}: ${accepted.w.length} + ${accepted.b.length} boards; ${TABLES}: kpk + ${usedPairs.size} pair slices`);
