// SOLVE ONE PAWN STRUCTURE EXACTLY — a "slice" (Campaign lane KP, Level 21).
//
// A slice is one fixed set of pawns with the two kings anywhere and either
// side to move. Inside it only the kings move; every pawn move and every
// capture LEAVES it (an "exit"), and an exit's result comes from an exact
// source: the K+P vs K / blocked-pair tables (`kp-tablebase.mjs`) when the
// board lands in one, else Syzygy (the Lichess tablebase, exact to 7 pieces).
// With every exit's result fixed, the slice itself is solved by retrograde
// analysis — so the whole structure is exact, not just the boards a search
// happened to visit.
//
// Moves come from chess.js (the ground truth the app plays on). Results are
// White's point of view: 1 White wins, 0 draw, -1 Black wins. `dist` = plies
// until the winner's first winning exit (the capture or pawn move that cashes
// the win) — the winner takes the fastest, the loser the slowest.
import { Chess } from 'chess.js';
import * as T from './kp-tablebase.mjs';

const N = 64;
const sqName = (s) => T.SQUARE_NAMES[s];

function fenOf(white, black, wk, bk, stm) {
  const pieces = new Map();
  for (const s of white) pieces.set(s, 'P');
  for (const s of black) pieces.set(s, 'p');
  pieces.set(wk, 'K'); pieces.set(bk, 'k');
  const rows = [];
  for (let r = 7; r >= 0; r--) {
    let row = ''; let e = 0;
    for (let f = 0; f < 8; f++) { const ch = pieces.get(r * 8 + f); if (ch) { if (e) { row += e; e = 0; } row += ch; } else e++; }
    if (e) row += e;
    rows.push(row);
  }
  return `${rows.join('/')} ${stm === 0 ? 'w' : 'b'} - - 0 1`;
}

/** Is this placement legal with `stm` to move (chess.js agrees, the side not
 *  to move is not in check)? */
function legal(white, black, wk, bk, stm) {
  const occupied = new Set([...white, ...black]);
  if (wk === bk || occupied.has(wk) || occupied.has(bk) || T.adjacent(wk, bk)) return false;
  // The side not to move may not stand in check from a pawn.
  if (stm === 0 && white.some((p) => T.whitePawnAttacks(p).includes(bk))) return false;
  if (stm === 1 && black.some((p) => T.blackPawnAttacks(p).includes(wk))) return false;
  return true;
}

export const sliceIndex = (wk, bk, stm) => (wk * N + bk) * 2 + stm;

/**
 * Solve the slice of pawns `white` / `black` (square indices).
 * `exitValue(fenAfter)` must return { val, dist } for a position the exit
 * reached (White's view, dist = plies from that position to the winner's
 * first winning exit, 0 when the exit itself cashes it — the solver adds the
 * exit move). Returns { val, dist, legalAt, exits } where exits lists every
 * exit move: { from: sliceIndex, uci, fen }.
 */
export async function solveSlice(white, black, exitValue, { log = () => {} } = {}) {
  const SIZE = N * N * 2;
  const val = new Int8Array(SIZE);
  const dist = new Uint16Array(SIZE);
  const done = new Uint8Array(SIZE);
  const legalAt = new Uint8Array(SIZE);
  const kids = new Array(SIZE);
  const exits = [];
  for (let wk = 0; wk < N; wk++) for (let bk = 0; bk < N; bk++) for (let stm = 0; stm < 2; stm++) {
    if (!legal(white, black, wk, bk, stm)) continue;
    const i = sliceIndex(wk, bk, stm);
    legalAt[i] = 1;
    const fen = fenOf(white, black, wk, bk, stm);
    const c = new Chess(fen);
    const list = [];
    for (const m of c.moves({ verbose: true })) {
      if (m.promotion && m.promotion !== 'q') continue; // a queen promotion is the strongest; the exit reads it exactly
      const stays = m.piece === 'k' && !m.captured;
      if (stays) {
        const nwk = stm === 0 ? T.squareIndex(m.to) : wk;
        const nbk = stm === 1 ? T.squareIndex(m.to) : bk;
        list.push({ kind: 'in', child: sliceIndex(nwk, nbk, 1 - stm), uci: `${m.from}${m.to}` });
      } else {
        const d = new Chess(fen); d.move(m);
        const e = { kind: 'exit', from: i, uci: `${m.from}${m.to}${m.promotion ?? ''}`, fen: d.fen() };
        list.push(e);
        exits.push(e);
      }
    }
    kids[i] = list;
    if (list.length === 0) {
      done[i] = 1; dist[i] = 0;
      val[i] = c.isCheckmate() ? (stm === 0 ? -1 : 1) : 0;
    }
  }
  log(`slice ${white.map(sqName)}/${black.map(sqName)}: ${legalAt.reduce((a, b) => a + b, 0)} placements, ${exits.length} exits`);
  // Fix every exit's result first.
  let n = 0;
  for (const e of exits) {
    const r = await exitValue(e.fen);
    e.val = r.val; e.dist = r.dist;
    if (++n % 500 === 0) log(`  exits read: ${n}/${exits.length}`);
  }
  let quiet = 0;
  const deepest = exits.reduce((a, e) => Math.max(a, e.dist), 0);
  for (let L = 1; L < 2000; L++) {
    let changed = 0;
    for (let i = 0; i < SIZE; i++) {
      if (!legalAt[i] || done[i]) continue;
      const me = (i & 1) === 0 ? 1 : -1;
      let win = false; let allLose = kids[i].length > 0;
      for (const k of kids[i]) {
        let cv; let cd;
        if (k.kind === 'exit') { cv = k.val; cd = k.dist; }
        else if (done[k.child]) { cv = val[k.child]; cd = dist[k.child]; }
        else { allLose = false; continue; }
        if (cv === me && cd <= L - 1) win = true;
        if (!(cv === -me && cd <= L - 1)) allLose = false;
      }
      if (win) { done[i] = 1; val[i] = me; dist[i] = L; changed++; }
      else if (allLose) { done[i] = 1; val[i] = -me; dist[i] = L; changed++; }
    }
    if (changed > 0) quiet = 0; else quiet++;
    if (quiet >= 2 && L > deepest + 2) break;
  }
  return { white, black, val, dist, legalAt, kids, exits, fenAt: (wk, bk, stm) => fenOf(white, black, wk, bk, stm) };
}

/**
 * The exact value of a board the families of `kp-tablebase.mjs` cover —
 * K+P vs K, a blocked pair, bare kings, K+Q / K+R vs K (by the proved rule)
 * — as { val, dist } with dist in plies to the next winning conversion, or
 * null when the board is outside them. `dist` for a table position is its
 * conversion distance; a finished promotion reads 0.
 */
export function localExitValue(kpk, pairs) {
  const lookup = T.makeLookup(kpk, pairs);
  return (fen) => {
    const c = new Chess(fen);
    if (c.isCheckmate()) return { val: c.turn() === 'w' ? -1 : 1, dist: 0 };
    if (c.isStalemate() || c.isInsufficientMaterial()) return { val: 0, dist: 0 };
    const pieces = c.board().flat().filter(Boolean);
    const heavy = pieces.filter((p) => p.type === 'q' || p.type === 'r');
    if (heavy.length === 1 && pieces.length === 3) {
      const owner = heavy[0].color === 'w' ? 1 : -1;
      if (c.turn() === heavy[0].color) return { val: owner, dist: 0 };
      const taken = c.moves({ verbose: true }).some((m) => m.to === heavy[0].square);
      return { val: taken ? 0 : owner, dist: 0 };
    }
    const v = lookup(pieces.map((p) => ({ type: p.type, color: p.color, sq: T.squareIndex(p.square) })), c.turn());
    return v ? { val: v.val, dist: v.dtc } : null;
  };
}
