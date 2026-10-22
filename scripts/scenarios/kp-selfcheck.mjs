#!/usr/bin/env node
// SELF-CHECK FOR THE EXACT KING-AND-PAWN TABLES (Campaign lane KP).
//
// The tables' move generation is hand-rolled for speed, so it is checked
// against chess.js, the ground truth the app plays on: on a sweep of legal
// placements, both sides to move, the move COUNT, checkmate and stalemate must
// agree exactly; and the table's verdict must be CONSISTENT with its own
// children read through chess.js (a win for the mover has a winning child; a
// position lost for the mover has only losing children). It also measures
// whether rook promotions would ever change a K+P vs K verdict (they are not
// counted as wins). Exits 1 on any disagreement.
//
//   node scripts/scenarios/kp-selfcheck.mjs
import { Chess } from 'chess.js';
import * as T from './kp-tablebase.mjs';

const t0 = Date.now();
const kpk = T.solveKpk();
console.log(`KPK solved in ${Date.now() - t0} ms, deepest conversion ${kpk.deepest} plies`);

let bad = 0;
const fail = (msg) => { bad++; if (bad <= 15) console.log(msg); };

/** chess.js verdict-consistency: the table's value of a position from the
 *  table's values of its chess.js children. */
function kpkValueOfFen(fen) {
  const c = new Chess(fen);
  const pieces = c.board().flat().filter(Boolean);
  const pawn = pieces.find((p) => p.type === 'p');
  const wk = pieces.find((p) => p.type === 'k' && p.color === 'w');
  const bk = pieces.find((p) => p.type === 'k' && p.color === 'b');
  if (!pawn || pawn.color !== 'w') return null;
  const i = T.kpkIndex(T.squareIndex(pawn.square), T.squareIndex(wk.square), T.squareIndex(bk.square), c.turn() === 'w' ? 0 : 1);
  return kpk.val[i];
}

let checked = 0;
let ruleWins = 0;
for (let p = 8; p < 56; p++) for (let wk = 0; wk < 64; wk += 3) for (let bk = 0; bk < 64; bk += 2) for (let stm = 0; stm < 2; stm++) {
  if (!T.kpkLegal(p, wk, bk, stm)) continue;
  const fen = T.fenFor({ wk, bk, wp: p }, stm, 'w');
  let c;
  try { c = new Chess(fen); } catch { fail(`chess.js rejects ${fen}`); continue; }
  const moves = c.moves({ verbose: true });
  const mine = stm === 0 ? T.kpkWhiteMoves(p, wk, bk) : T.kpkBlackMoves(p, wk, bk);
  // chess.js lists four promotions per promoting push; the table one.
  const n = moves.filter((m) => !m.promotion || m.promotion === 'q').length;
  if (n !== mine.length) fail(`move count ${fen}: chess.js ${n}, table ${mine.length}`);
  const i = T.kpkIndex(p, wk, bk, stm);
  if (stm === 1 && c.isCheckmate() !== (mine.length === 0 && kpk.val[i] === 1)) fail(`checkmate ${fen}`);
  if (c.isStalemate() && kpk.val[i] !== 0) fail(`stalemate ${fen} scored ${kpk.val[i]}`);
  // Consistency through chess.js children.
  if (moves.length > 0 && checked % 7 === 0) {
    const childVals = moves.map((m) => {
      const d = new Chess(fen); d.move(m);
      if (m.promotion) {
        if (m.promotion !== 'q' && m.promotion !== 'r') return 0;
        return d.isStalemate() || d.moves({ verbose: true }).some((x) => x.captured === m.promotion) ? 0 : 1;
      }
      if (m.captured) return 0;
      return kpkValueOfFen(d.fen());
    }).filter((v) => v !== null);
    const v = kpk.val[i];
    if (stm === 0) {
      const best = Math.max(...childVals);
      if (best !== v) fail(`consistency ${fen}: table ${v}, best child ${best}`);
    } else {
      const worst = Math.min(...childVals);
      if (worst !== v) fail(`consistency ${fen}: table ${v}, worst child ${worst}`);
    }
  }
  // Where ONLY a rook promotion wins (the queen stalemates or hangs): counted.
  if (stm === 0 && kpk.val[i] === 1 && kpk.dtc[i] === 1) {
    const wins = (piece) => moves.some((m) => {
      if (m.promotion !== piece) return false;
      const d = new Chess(fen); d.move(m);
      return !d.isStalemate() && !d.moves({ verbose: true }).some((x) => x.captured === piece);
    });
    if (wins('r') && !wins('q')) { ruleWins++; console.log(`only a rook promotion wins: ${fen}`); }
  }
  checked++;
}
console.log(`KPK: checked ${checked} positions against chess.js; positions only a rook promotion wins (sampled): ${ruleWins}`);

// Blocked pairs: every pawn pair, sampled placements; the verdict
// consistent with its chess.js children read through the same lookup.
const t1 = Date.now();
const pairs = new Map();
for (let wp = 8; wp < 48; wp++) pairs.set(wp, T.solvePair(kpk, wp));
console.log(`pairs solved in ${Date.now() - t1} ms`);
const lookup = T.makeLookup(kpk, pairs);
const piecesOf = (c) => c.board().flat().filter(Boolean).map((p) => ({ type: p.type, color: p.color, sq: T.squareIndex(p.square) }));
for (let wp = 8; wp < 48; wp++) {
  const pair = pairs.get(wp);
  for (let wk = 0; wk < 64; wk += 3) for (let bk = 1; bk < 64; bk += 4) for (let stm = 0; stm < 2; stm++) {
    if (!T.pairLegal(wp, wk, bk, stm)) continue;
    const fen = T.fenFor({ wk, bk, wp, bp: wp + 8 }, stm, 'w');
    let c;
    try { c = new Chess(fen); } catch { fail(`chess.js rejects ${fen}`); continue; }
    const mine = stm === 0 ? T.pairWhiteMoves(wp, wk, bk) : T.pairBlackMoves(wp, wk, bk);
    if (c.moves().length !== mine.length) fail(`pair move count ${fen}: chess.js ${c.moves().length}, table ${mine.length}`);
    const i = T.pairIndex(wk, bk, stm);
    if (c.isStalemate() && pair.val[i] !== 0) fail(`pair stalemate ${fen}`);
    const ms = c.moves({ verbose: true });
    if (ms.length > 0) {
      const vals = ms.map((m) => { const d = new Chess(fen); d.move(m); return lookup(piecesOf(d), d.turn()).val; });
      const want = stm === 0 ? Math.max(...vals) : Math.min(...vals);
      if (want !== pair.val[i]) fail(`pair consistency ${fen}: table ${pair.val[i]}, children ${want}`);
    } else if (c.isCheckmate() !== (pair.val[i] === (stm === 0 ? -1 : 1))) fail(`pair mate ${fen}`);
    checked++;
  }
}
console.log(`pairs solved + checked in ${Date.now() - t1} ms`);

// THE PROMOTION RULE the app applies with chess.js alone: after a promotion
// to a queen or a rook against a lone king, the new piece wins unless the
// lone king can take it or is stalemated. Proved against both exact tables:
// the rule over EVERY legal placement with the lone king to move, chess.js
// agreeing with the rule on a fifth of them.
{
  const { solveKqk, idx } = await import('./kqk-tablebase.mjs');
  const tables = { q: solveKqk().wtm, r: T.solveKrk().wtm };
  let n = 0; let viaChess = 0;
  for (const piece of ['q', 'r']) for (let i = 0; i < 262144; i++) {
    const sk = i >> 12; const x = (i >> 6) & 63; const dk = i & 63;
    if (tables[piece][i] === -1) continue; // illegal with the lone king to move
    const pieces = new Map([[sk, 'K'], [x, piece.toUpperCase()], [dk, 'k']]);
    const rows = [];
    for (let r = 7; r >= 0; r--) { let row = ''; let e = 0; for (let f = 0; f < 8; f++) { const ch = pieces.get(r * 8 + f); if (ch) { if (e) { row += e; e = 0; } row += ch; } else e++; } if (e) row += e; rows.push(row); }
    const fen = `${rows.join('/')} b - - 0 1`;
    // The rule, read off the board by the table's own geometry.
    const canTake = T.adjacent(dk, x) && !T.adjacent(sk, x);
    const attacked = (s) => s === sk || T.adjacent(s, sk) || (piece === 'r' ? T.rookAttacks(x, s, sk) : queenSees(x, s, sk));
    const escapes = T.KING_STEPS[dk].filter((s) => s === x ? canTake : !attacked(s));
    const inCheck = piece === 'r' ? T.rookAttacks(x, dk, sk) : queenSees(x, dk, sk);
    const rule = !canTake && !(escapes.length === 0 && !inCheck);
    if (rule !== (tables[piece][idx(sk, x, dk)] >= 0)) fail(`promotion rule ${fen}: rule ${rule}, table ${tables[piece][i]}`);
    n++;
    if (i % 5 === 0) {
      const c = new Chess(fen);
      const byChess = !c.isStalemate() && !c.moves({ verbose: true }).some((m) => m.captured === piece);
      if (byChess !== rule) fail(`chess.js disagrees with the rule on ${fen}`);
      viaChess++;
    }
  }
  console.log(`promotion rule proved on ${n} K+Q / K+R vs K positions (${viaChess} also through chess.js)`);
}
function queenSees(q, t, block) {
  return T.rookAttacks(q, t, block) || bishopSees(q, t, block);
}
function bishopSees(b, t, block) {
  const fd = T.fileOf(t) - T.fileOf(b); const rd = T.rankOf(t) - T.rankOf(b);
  if (b === t || Math.abs(fd) !== Math.abs(rd)) return false;
  const df = Math.sign(fd); const dr = Math.sign(rd);
  let f = T.fileOf(b) + df; let r = T.rankOf(b) + dr;
  while (true) { const s = r * 8 + f; if (s === t) return true; if (s === block) return false; f += df; r += dr; }
}
// THE SLICE SOLVER (the triangulation structures are solved with it, exits
// from Syzygy) against an independent exact answer: a blocked pair solved as
// a slice — chess.js move generation, exits read from the K+P table — must
// give the pair solver's verdict on every placement, both sides to move.
{
  const { solveSlice, localExitValue, sliceIndex } = await import('./kp-slice.mjs');
  const local = localExitValue(kpk, pairs);
  for (const name of ['b5', 'e4']) {
    const wp = T.squareIndex(name);
    const slice = await solveSlice([wp], [wp + 8], async (fen) => {
      const v = local(fen);
      if (!v) throw new Error(`exit outside the local tables: ${fen}`);
      return { val: v.val, dist: 0 };
    });
    let n = 0;
    for (let wk = 0; wk < 64; wk++) for (let bk = 0; bk < 64; bk++) for (let stm = 0; stm < 2; stm++) {
      if (!slice.legalAt[sliceIndex(wk, bk, stm)]) continue;
      const want = pairs.get(wp).val[T.pairIndex(wk, bk, stm)];
      if (slice.val[sliceIndex(wk, bk, stm)] !== want) fail(`slice vs pair ${name}: ${slice.fenAt(wk, bk, stm)} slice ${slice.val[sliceIndex(wk, bk, stm)]}, pair ${want}`);
      n++;
    }
    console.log(`slice solver agrees with the pair solver on ${name}/${T.SQUARE_NAMES[wp + 8]}: ${n} placements`);
  }
}
console.log(`${bad} disagreements`);
if (bad > 0) process.exitCode = 1;
