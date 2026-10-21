#!/usr/bin/env node
// SELF-CHECK FOR THE EXACT K+Q vs K TABLE (WO-CAMPAIGN-MASTER Lane A).
//
// The table's move generation is hand-rolled for speed, so it is checked
// against chess.js, the ground truth the app plays on: on a sweep of ~10k
// legal placements, both sides to move, the move COUNT, checkmate, stalemate
// and mate-in-one must agree exactly. `solveKqk` itself asserts the longest
// mate is the known 10 moves. Exits 1 on any disagreement.
//
//   node scripts/scenarios/kqk-selfcheck.mjs
import { Chess } from 'chess.js';
import * as T from './kqk-tablebase.mjs';

const t0 = Date.now();
const { stm, wtm } = T.solveKqk();
console.log(`solved in ${Date.now() - t0} ms`);
const hist = {};
for (let i = 0; i < stm.length; i++) if (stm[i] > 0) { const m = (stm[i] + 1) / 2; hist[m] = (hist[m] ?? 0) + 1; }
console.log('strong-to-move mate distance histogram (moves):', hist);

let checked = 0;
let bad = 0;
const fail = (msg) => { bad++; if (bad <= 10) console.log(msg); };
for (let i = 0; i < 262144; i += 37) {
  const sk = i >> 12; const q = (i >> 6) & 63; const dk = i & 63;
  for (const strongToMove of [true, false]) {
    const legal = strongToMove ? T.legalStm(sk, q, dk) : T.legalWtm(sk, q, dk);
    if (!legal) continue;
    const fen = T.fenOf(sk, q, dk, 'w', strongToMove);
    let c;
    try { c = new Chess(fen); } catch { fail(`chess.js rejects ${fen}`); continue; }
    const n = c.moves().length;
    const mine = strongToMove ? T.strongMoves(sk, q, dk).length : T.weakMoves(sk, q, dk).length;
    if (n !== mine) fail(`move count ${fen}: chess.js ${n}, table ${mine}`);
    const v = T.idx(sk, q, dk);
    if (strongToMove) {
      const m1 = c.moves().some((m) => { const d = new Chess(fen); d.move(m); return d.isCheckmate(); });
      if (m1 !== (stm[v] === 1)) fail(`mate-in-one ${fen}: chess.js ${m1}, table ${stm[v]}`);
    } else {
      if (c.isCheckmate() !== (wtm[v] === 0)) fail(`checkmate ${fen}`);
      if (c.isStalemate() && wtm[v] !== -2) fail(`stalemate ${fen}`);
    }
    checked++;
  }
}
console.log(`checked ${checked} positions against chess.js, ${bad} disagreements`);
if (bad > 0) process.exitCode = 1;
