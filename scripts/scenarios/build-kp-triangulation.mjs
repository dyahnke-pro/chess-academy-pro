#!/usr/bin/env node
// BUILD THE TRIANGULATION SCENARIO LIBRARY (Campaign lane KP, Level 21) —
// offline, deterministic, three instruments.
//
// The structures: White pawns b5 + c4 against a Black pawn on b6 — the pawn
// skeleton of the app's own triangulation lesson (`src/data/pawn-endings.json`)
// — and the same skeleton one file over (c5 + d4 against c6), each with its
// mirror on the other wing. Each structure is SOLVED EXACTLY (`kp-slice.mjs`):
// every placement of the two kings, both sides to move, by retrograde
// analysis, with every pawn move and capture out of the structure read from an
// exact source — the K+P tables where the board lands in one, else Syzygy.
// The boards are those `kp-tri-rule.mjs` picks: the student to move and
// winning, the defender in zugzwang if it were their move, no pawn move or
// capture wins, the direct approach draws, and the triangle is on the board.
// Then every board is checked twice more, independently:
//   - Stockfish (one process, bounded reads): the start is a win for the
//     student (+3.00 or a mate) and the natural wrong move — the king's
//     direct approach to their pawn — reads +0.60 or less. A board Stockfish
//     cannot confirm inside its budget is left out, with all its variants;
//   - Syzygy: the start is a win and every child has exactly the result the
//     solved structure gives it. Any disagreement aborts the build.
// Both colours, both wings.
//
//   KP_SYZYGY_CACHE=write.json[,read.json…] node scripts/scenarios/build-kp-triangulation.mjs
//
// Writes src/missions/scenarios/kpTriangulation.json and adds the
// structures' slices (and the slices their exits land in) to
// src/missions/checks/kpTables.json.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { Chess } from 'chess.js';
import * as T from './kp-tablebase.mjs';
import { packSlice, sliceKey } from './kp-encode.mjs';
import { localExitValue, sliceIndex, solveSlice } from './kp-slice.mjs';
import { triangleBoards } from './kp-tri-rule.mjs';
import { cpOf, startEngine, syzygy } from './kp-verify-lib.mjs';

const OUT = resolve('src/missions/scenarios/kpTriangulation.json');
const TABLES = resolve('src/missions/checks/kpTables.json');
const CACHE = process.env.KP_SYZYGY_CACHE ?? `${tmpdir()}/kp-syzygy-cache.json`;
const SF_CACHE = resolve(process.env.KP_SF_CACHE ?? `${tmpdir()}/kp-stockfish-cache.json`);
const WIN_CP = 300;
const DRAW_CP = 60;
const STRUCTURES = (process.env.KP_TRI_STRUCTURES ?? 'b5,c4/b6;c5,d4/c6').split(';').map((s) => {
  const [white, black] = s.split('/');
  return { white: white.split(','), black: black.split(',') };
});
/** The app's own lesson board (src/data/pawn-endings.json) — the demo. */
const LESSON = '8/2k5/1p6/1P6/2P1K3/8/8/8 w - - 0 1';

const sq = (s) => T.SQUARE_NAMES[s];
const mirrorFile = (s) => s ^ 7;
const mirrorUciFile = (u) => u.replace(/[a-h]/g, (f) => 'abcdefgh'[7 - 'abcdefgh'.indexOf(f)]);
const flipUci = (u) => u.replace(/[1-8]/g, (r) => String(9 - Number(r)));
const placement = (fen) => fen.split(' ')[0];
function flipBoard(fen) {
  const [p, turn] = fen.split(' ');
  const rows = p.split('/').reverse().map((row) => row.replace(/[a-zA-Z]/g, (ch) => (ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase())));
  return `${rows.join('/')} ${turn === 'w' ? 'b' : 'w'} - - 0 1`;
}
function mirrorBoardFile(fen) {
  const [p, turn] = fen.split(' ');
  const rows = p.split('/').map((row) => {
    const cells = [];
    for (const ch of row) { if (/\d/.test(ch)) for (let k = 0; k < Number(ch); k++) cells.push(''); else cells.push(ch); }
    cells.reverse();
    let out = ''; let e = 0;
    for (const c of cells) { if (!c) e++; else { if (e) { out += e; e = 0; } out += c; } }
    if (e) out += e;
    return out;
  });
  return `${rows.join('/')} ${turn} - - 0 1`;
}

// ── Solve the structures ─────────────────────────────────────────────────
const kpk = T.solveKpk();
const pairs = new Map();
for (let wp = 8; wp < 48; wp++) pairs.set(wp, T.solvePair(kpk, wp));
const local = localExitValue(kpk, pairs);
const tb = syzygy(CACHE);
const resultFor = (cat, whiteToMove) => (cat === 'draw' ? 0 : (cat === 'win') === whiteToMove ? 1 : -1);
const exitValue = async (fen) => {
  const l = local(fen);
  if (l) return { val: l.val, dist: 0 };
  return { val: resultFor(await tb.category(fen), fen.split(' ')[1] === 'w'), dist: 0 };
};
const solved = [];
for (const s of STRUCTURES) {
  const slice = await solveSlice(s.white.map(T.squareIndex), s.black.map(T.squareIndex), exitValue, { log: console.log });
  tb.save();
  solved.push({ structure: s, slice });
}

const kidVal = (slice, k) => (k.kind === 'exit' ? k.val : slice.val[k.child]);
const kidDist = (slice, k) => (k.kind === 'exit' ? 0 : slice.dist[k.child]);

// ── The boards ─────────────────────────────────────────────────────────────
const rows = [];
for (const { structure, slice } of solved) {
  const found = triangleBoards(slice);
  console.log(`${found.length} triangulation boards in ${structure.white}/${structure.black}`);
  const target = slice.black[0];
  const d = (u) => { const s = T.squareIndex(u.slice(2, 4)); return Math.max(Math.abs(T.fileOf(s) - T.fileOf(target)), Math.abs(T.rankOf(s) - T.rankOf(target))); };
  for (const b of found) {
    const kids = slice.kids[sliceIndex(b.wk, b.bk, 0)];
    rows.push({
      slice, fen: slice.fenAt(b.wk, b.bk, 0), wk: b.wk, bk: b.bk,
      key: kids.filter((k) => kidVal(slice, k) === 1).sort((x, y) => kidDist(slice, x) - kidDist(slice, y)).map((k) => k.uci),
      // The natural wrong move: the king's direct approach — the drawing king
      // move that ends nearest their pawn (the rule guarantees one).
      trap: [...b.approach].sort((x, y) => d(x) - d(y))[0],
      line: b.line, dist: b.dist,
    });
  }
}
if (rows.length === 0) throw new Error('no triangulation board in any structure');
if (process.argv.includes('--count')) {
  // Look only: the boards the rule picks, nothing verified, nothing written.
  for (const r of rows) console.log(`${r.fen}  key ${r.key}  trap ${r.trap}  triangle ${r.line.join(' ')}`);
  process.exit(0);
}

/** The briefing's line from a board: the triangle (the rule's line, the board
 *  back with the defender to move), then the exact line — the student fastest
 *  to the winning break, the defender slowest — and the break itself (SAN). */
function demoLine(row) {
  const { slice } = row;
  const c = new Chess(row.fen);
  const sans = [];
  for (const u of row.line) sans.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4) }).san);
  let cur = sliceIndex(row.wk, row.bk, 1);
  if (placement(c.fen()) !== placement(row.fen) || c.turn() !== 'b') throw new Error('the triangle did not come home');
  for (let k = 0; k < 60; k++) {
    const white2move = (cur & 1) === 0;
    const pool = slice.kids[cur].filter((x) => kidVal(slice, x) === 1);
    const pick = white2move ? pool.sort((x, y) => kidDist(slice, x) - kidDist(slice, y))[0] : pool.sort((x, y) => kidDist(slice, y) - kidDist(slice, x))[0];
    if (!pick) throw new Error('demo line lost the win');
    sans.push(c.move({ from: pick.uci.slice(0, 2), to: pick.uci.slice(2, 4), promotion: pick.uci[4] }).san);
    if (pick.kind === 'exit') return sans;
    cur = pick.child;
  }
  throw new Error('demo line too long');
}

// The four variants of every board: White / Black student, this wing / the other.
const variants = [];
for (const r of rows) {
  const other = { fen: mirrorBoardFile(r.fen), key: r.key.map(mirrorUciFile), trap: mirrorUciFile(r.trap) };
  for (const base of [{ fen: r.fen, key: r.key, trap: r.trap }, other]) {
    variants.push({ colour: 'w', ...base, dist: r.dist, row: r });
    variants.push({ colour: 'b', fen: flipBoard(base.fen), key: base.key.map(flipUci), trap: flipUci(base.trap), dist: r.dist, row: r });
  }
}

// ── Stockfish ─────────────────────────────────────────────────────────────
const engine = startEngine({ cachePath: SF_CACHE });
await engine.ready();
const studentCp = async (fen, studentToMove) => {
  const cp = cpOf(await engine.score(fen));
  return cp === null ? null : (studentToMove ? cp : -cp);
};
const rejected = new Set();
for (const v of variants) {
  const start = await studentCp(v.fen, true);
  const d = new Chess(v.fen); d.move({ from: v.trap.slice(0, 2), to: v.trap.slice(2, 4) });
  const trap = await studentCp(d.fen(), false);
  v.sf = { start, trap };
  const ok = start !== null && start >= WIN_CP && trap !== null && trap <= DRAW_CP;
  if (!ok) rejected.add(v.row);
  console.log(`[sf] ${ok ? 'ok ' : 'OUT'} ${v.fen}  start ${start}  trap ${v.trap} ${trap}`);
}
engine.quit();
for (let i = variants.length - 1; i >= 0; i--) if (rejected.has(variants[i].row)) variants.splice(i, 1);
for (let i = rows.length - 1; i >= 0; i--) if (rejected.has(rows[i])) rows.splice(i, 1);
console.log(`[sf] ${rows.length} boards confirmed, ${rejected.size} left out`);
if (rows.length === 0) throw new Error('Stockfish confirmed no board');

// ── Syzygy: the start and every child, all four variants ─────────────────
/** White's view of a variant's child, read through its solved structure. */
function valueOfChild(v, uci) {
  let fen = v.fen; let u = uci;
  if (v.colour === 'b') { fen = flipBoard(fen); u = flipUci(u); }
  if (placement(fen) !== placement(v.row.fen)) { fen = mirrorBoardFile(fen); u = mirrorUciFile(u); }
  if (placement(fen) !== placement(v.row.fen)) throw new Error(`variant ${v.fen} does not map to ${v.row.fen}`);
  const kid = v.row.slice.kids[sliceIndex(v.row.wk, v.row.bk, 0)].find((k) => k.uci === u);
  if (!kid) throw new Error(`no child ${u} on ${fen}`);
  const val = kidVal(v.row.slice, kid);
  return v.colour === 'b' ? -val : val;
}
for (const v of variants) {
  if ((await tb.category(v.fen)) !== 'win') throw new Error(`Syzygy: ${v.fen} is not a win for the student`);
  const c = new Chess(v.fen);
  for (const m of c.moves({ verbose: true })) {
    if (m.promotion && m.promotion !== 'q') continue;
    const d = new Chess(v.fen); d.move(m);
    const mine = valueOfChild(v, `${m.from}${m.to}${m.promotion ?? ''}`);
    const theirs = d.isStalemate() ? 0 : resultFor(await tb.category(d.fen()), d.turn() === 'w');
    if (mine !== theirs) throw new Error(`Syzygy disagrees on ${v.fen} ${m.san}: structure ${mine}, Syzygy ${theirs}`);
  }
  console.log(`[syzygy] ${v.fen} and every child agree`);
}
tb.save();

// ── Runtime verdicts: each structure, and every slice its exits land in ──
const existing = existsSync(TABLES) ? JSON.parse(readFileSync(TABLES, 'utf8')) : {};
const slices = {};
const putSlice = (wPawns, bPawns, side, code) => {
  const key = sliceKey(wPawns.map(sq), bPawns.map(sq));
  slices[key] = { ...(slices[key] ?? {}), [side]: packSlice(code) };
};
const codeOf = (v) => (v === 1 ? 1 : v === -1 ? 2 : 0);
for (const { slice } of solved) {
  for (const mirror of [false, true]) {
    const m = (s) => (mirror ? mirrorFile(s) : s);
    for (const side of [0, 1]) {
      putSlice(slice.white.map(m), slice.black.map(m), side === 0 ? 'w' : 'b', (wk, bk) => {
        const i = sliceIndex(m(wk), m(bk), side);
        return slice.legalAt[i] ? codeOf(slice.val[i]) : 3;
      });
    }
    // The exits, grouped by the pawns they leave and the side then to move.
    const groups = new Map();
    for (const e of slice.exits) {
      const c = new Chess(e.fen);
      const pieces = c.board().flat().filter(Boolean);
      if (pieces.some((p) => p.type !== 'k' && p.type !== 'p')) continue; // a promotion: the app reads it by rule
      const wP = pieces.filter((p) => p.type === 'p' && p.color === 'w').map((p) => T.squareIndex(p.square));
      const bP = pieces.filter((p) => p.type === 'p' && p.color === 'b').map((p) => T.squareIndex(p.square));
      if (wP.length + bP.length <= 1) continue; // K+P vs K: the app's own table
      const wk = T.squareIndex(pieces.find((p) => p.type === 'k' && p.color === 'w').square);
      const bk = T.squareIndex(pieces.find((p) => p.type === 'k' && p.color === 'b').square);
      const id = `${sliceKey(wP.map((s) => sq(m(s))), bP.map((s) => sq(m(s))))} ${c.turn()}`;
      if (!groups.has(id)) groups.set(id, { wP: wP.map(m), bP: bP.map(m), side: c.turn(), at: new Map() });
      groups.get(id).at.set(m(wk) * 64 + m(bk), codeOf(e.val));
    }
    for (const g of groups.values()) {
      const key = sliceKey(g.wP.map(sq), g.bP.map(sq));
      if (slices[key]?.[g.side] || existing.slices?.[key]?.[g.side]) continue;
      const pair = g.wP.length === 1 && g.bP.length === 1 && g.bP[0] === g.wP[0] + 8;
      if (pair) {
        // A blocked pair: ship its whole solved table, both sides to move —
        // the game goes on inside it.
        for (const side of [0, 1]) {
          putSlice(g.wP, g.bP, side === 0 ? 'w' : 'b', (wk, bk) => (T.pairLegal(g.wP[0], wk, bk, side) ? codeOf(pairs.get(g.wP[0]).val[T.pairIndex(wk, bk, side)]) : 3));
        }
        continue;
      }
      // Any other exit: the placements the structure leads to, nothing more.
      putSlice(g.wP, g.bP, g.side, (wk, bk) => g.at.get(wk * 64 + bk) ?? 3);
    }
  }
}
writeFileSync(TABLES, `${JSON.stringify({ ...existing, slices: { ...(existing.slices ?? {}), ...slices } }, null, 1)}\n`);

// The briefing: the app's own lesson board when the rule picked it, a try on another.
const demoRow = rows.find((r) => r.fen === LESSON) ?? rows[0];
// The try: a board with ONE winning move (the triangle's first step), not the demo.
const tryRow = rows.find((r) => r !== demoRow && r.key.length === 1 && r.slice !== demoRow.slice) ?? rows.find((r) => r !== demoRow && r.key.length === 1) ?? rows.find((r) => r !== demoRow) ?? demoRow;
const demo = { fen: demoRow.fen, sans: demoLine(demoRow), tryFen: tryRow.fen };
const out = (colour) => variants.filter((v) => v.colour === colour).map((v) => ({ fen: v.fen, key: v.key, trap: v.trap, dist: v.dist, sf: v.sf }));
writeFileSync(OUT, `${JSON.stringify({
  id: 'kp-triangulation',
  rule: `pawn structures ${STRUCTURES.map((s) => `${s.white.join('+')} vs ${s.black.join('+')}`).join(' and ')} (and their mirrors on the other wing); the student to move and winning; the same board with the defender to move also wins; every winning move is a king move inside the structure; the direct approach (a king move toward their pawn) draws; every winning move starts a triangle (k0→k1, the defender out, k1→k2, the defender back, k2→k0 = this board with the defender to move, every step winning)`,
  verification: `structures solved exactly (kp-slice.mjs: retrograde, exits from the K+P tables or Syzygy); Stockfish (node_modules/stockfish, 1 thread, depth 32 within 2.5M nodes): start >= +${WIN_CP / 100}, the direct approach <= +${DRAW_CP / 100}, every variant; Syzygy (tablebase.lichess.ovh): the start and every child of every board, both colours, both wings`,
  structures: STRUCTURES,
  demo,
  w: out('w'),
  b: out('b'),
}, null, 1)}\n`);
console.log(`wrote ${OUT}: ${out('w').length} + ${out('b').length} boards; ${Object.keys(slices).length} slices into ${TABLES}`);
