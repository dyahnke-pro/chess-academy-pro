// THE EXACT KING-AND-PAWN TABLES — every position solved by retrograde analysis
// (Campaign intermediate track, lane KP: Level 19 "Outflanking", Level 21
// "Triangulation"). No engine, no guess: the endings the two cards start from
// are small enough to solve outright, so a scenario is chosen by the TRUE
// result and Stockfish is the independent second check.
//
// Two families, both colour-normalised to WHITE owning the pawn that runs up
// the board (a Black student's board is the mirror: ranks flipped, colours
// swapped):
//
//   KPK          — white king + pawn against a lone black king. Every pawn
//                  square a2..h7, both kings, both sides to move.
//   blocked pair — white king + pawn on (file, rank) against black king + pawn
//                  directly in front of it (file, rank + 1). Neither pawn can
//                  move or capture until a king takes the other's pawn — then
//                  the board is a KPK ending, read from the KPK table (the
//                  side that took owns the pawn). So the family is the two
//                  kings and the side to move, one slice per pawn pair.
//
// A promotion is judged EXACTLY: a queen by the K+Q vs K table
// (`kqk-tablebase.mjs`), a rook by the K+R vs K table solved here the same
// way (`solveKrk`). Both reduce to one rule the app can apply with chess.js
// alone — the new piece wins unless the lone king can take it or is
// stalemated — and `kp-selfcheck.mjs` proves that rule against both tables.
// Bishop and knight promotions never win against a lone king.
//
// Values, white's point of view: 1 white wins, 0 draw, -1 black wins.
// DTC = plies to conversion for the winner (the promoting move, or mate):
// the winner takes the fastest, the loser the slowest. Squares 0..63,
// file = s & 7, rank = s >> 3 (0 = rank 1).
import { solveKqk, idx as kqkIdx } from './kqk-tablebase.mjs';

const N = 64;
export const fileOf = (s) => s & 7;
export const rankOf = (s) => s >> 3;

export const KING_STEPS = Array.from({ length: N }, (_, s) => {
  const out = [];
  for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) {
    if (!df && !dr) continue;
    const f = fileOf(s) + df; const r = rankOf(s) + dr;
    if (f >= 0 && f < 8 && r >= 0 && r < 8) out.push(r * 8 + f);
  }
  return out;
});
const ADJ = new Uint8Array(N * N);
for (let a = 0; a < N; a++) for (const b of KING_STEPS[a]) ADJ[a * N + b] = 1;
export const adjacent = (a, b) => ADJ[a * N + b] === 1;

/** Squares a white pawn on `p` attacks. */
export function whitePawnAttacks(p) {
  const out = [];
  if (rankOf(p) >= 7) return out;
  if (fileOf(p) > 0) out.push(p + 7);
  if (fileOf(p) < 7) out.push(p + 9);
  return out;
}
/** Squares a black pawn on `p` attacks. */
export function blackPawnAttacks(p) {
  const out = [];
  if (rankOf(p) <= 0) return out;
  if (fileOf(p) > 0) out.push(p - 9);
  if (fileOf(p) < 7) out.push(p - 7);
  return out;
}

export const SQUARE_NAMES = Array.from({ length: N }, (_, s) => 'abcdefgh'[fileOf(s)] + (rankOf(s) + 1));
export const squareIndex = (name) => (Number(name[1]) - 1) * 8 + 'abcdefgh'.indexOf(name[0]);

// ── K+P vs K ──────────────────────────────────────────────────────────────
// Index: ((p * 64 + wk) * 64 + bk) * 2 + stm, stm 0 = white to move.
export const kpkIndex = (p, wk, bk, stm) => ((p * 64 + wk) * 64 + bk) * 2 + stm;

/** Legal placement with `stm` to move: distinct squares, kings apart, the
 *  pawn on ranks 2–7, the side NOT to move not in check. */
export function kpkLegal(p, wk, bk, stm) {
  if (rankOf(p) < 1 || rankOf(p) > 6) return false;
  if (p === wk || p === bk || wk === bk || adjacent(wk, bk)) return false;
  // White to move: black's king may not stand in check (only the pawn can give it).
  if (stm === 0 && whitePawnAttacks(p).includes(bk)) return false;
  return true;
}

/** White's moves in K+P vs K: { kind: 'king', wk } | { kind: 'push', p } |
 *  { kind: 'promote', q } (to a queen or a rook, both judged). */
export function kpkWhiteMoves(p, wk, bk) {
  const out = [];
  for (const n of KING_STEPS[wk]) {
    if (n === p || n === bk || adjacent(n, bk)) continue;
    out.push({ kind: 'king', wk: n });
  }
  const one = p + 8;
  if (one !== wk && one !== bk) {
    if (rankOf(one) === 7) out.push({ kind: 'promote', q: one });
    else {
      out.push({ kind: 'push', p: one });
      const two = p + 16;
      if (rankOf(p) === 1 && two !== wk && two !== bk) out.push({ kind: 'push', p: two });
    }
  }
  return out;
}

/** Black's moves in K+P vs K: { bk, takesPawn }. */
export function kpkBlackMoves(p, wk, bk) {
  const out = [];
  const attacked = whitePawnAttacks(p);
  for (const n of KING_STEPS[bk]) {
    if (n === wk || adjacent(n, wk) || attacked.includes(n)) continue;
    out.push({ bk: n, takesPawn: n === p });
  }
  return out;
}

let KQK = null;
/** White promotes on `q`, black to move: does the queen win? Exact (K+Q vs K). */
export function queenPromotionWins(wk, q, bk) {
  if (!KQK) KQK = solveKqk();
  return KQK.wtm[kqkIdx(wk, q, bk)] >= 0;
}
let KRK = null;
/** White promotes to a rook on `r`, black to move: does the rook win? Exact (K+R vs K). */
export function rookPromotionWins(wk, r, bk) {
  if (!KRK) KRK = solveKrk();
  return KRK.wtm[kqkIdx(wk, r, bk)] >= 0;
}

/** Does a rook on `r` attack `target`, with only `block` in the way? */
export function rookAttacks(r, target, block) {
  if (r === target) return false;
  const fd = fileOf(target) - fileOf(r); const rd = rankOf(target) - rankOf(r);
  if (fd !== 0 && rd !== 0) return false;
  const df = Math.sign(fd); const dr = Math.sign(rd);
  let f = fileOf(r) + df; let k = rankOf(r) + dr;
  while (true) {
    const t = k * 8 + f;
    if (t === target) return true;
    if (t === block) return false;
    f += df; k += dr;
  }
}

/**
 * The exact K+R vs K table, built like `solveKqk`: wtm[idx(sk, r, dk)] with
 * the lone king to move — plies until mated (even, 0 = mated now), -2 = a
 * draw (stalemate, or the rook can be taken), -1 = illegal. Asserts the known
 * longest mate, 16 moves.
 */
export function solveKrk() {
  const SIZE = N * N * N;
  const stm = new Int8Array(SIZE).fill(-1);
  const wtm = new Int8Array(SIZE).fill(-1);
  const legalS = (sk, r, dk) => sk !== r && sk !== dk && r !== dk && !adjacent(sk, dk) && !rookAttacks(r, dk, sk);
  const legalW = (sk, r, dk) => sk !== r && sk !== dk && r !== dk && !adjacent(sk, dk);
  const weak = (sk, r, dk) => {
    const out = [];
    for (const n of KING_STEPS[dk]) {
      if (n === sk || adjacent(n, sk)) continue;
      if (n === r) { if (!adjacent(r, sk)) out.push({ to: n, takes: true }); continue; }
      if (rookAttacks(r, n, sk)) continue;
      out.push({ to: n, takes: false });
    }
    return out;
  };
  const strong = (sk, r, dk) => {
    const out = [];
    for (const n of KING_STEPS[sk]) {
      if (n === r || n === dk || adjacent(n, dk)) continue;
      out.push([n, r]);
    }
    for (const [df, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      let f = fileOf(r) + df; let k = rankOf(r) + dr;
      while (f >= 0 && f < 8 && k >= 0 && k < 8) {
        const t = k * 8 + f;
        if (t === sk || t === dk) break;
        out.push([sk, t]);
        f += df; k += dr;
      }
    }
    return out;
  };
  for (let i = 0; i < SIZE; i++) {
    const sk = i >> 12; const r = (i >> 6) & 63; const dk = i & 63;
    if (!legalW(sk, r, dk)) continue;
    const ms = weak(sk, r, dk);
    if (ms.length === 0) wtm[i] = rookAttacks(r, dk, sk) ? 0 : -2;
    else if (ms.some((m) => m.takes)) wtm[i] = -2;
  }
  for (let L = 1; L < 80; L++) {
    let changed = 0;
    for (let i = 0; i < SIZE; i++) {
      const sk = i >> 12; const r = (i >> 6) & 63; const dk = i & 63;
      if (L & 1) {
        if (!legalS(sk, r, dk) || stm[i] !== -1) continue;
        for (const [nk, nr] of strong(sk, r, dk)) {
          if (wtm[kqkIdx(nk, nr, dk)] === L - 1) { stm[i] = L; changed++; break; }
        }
      } else {
        if (!legalW(sk, r, dk) || wtm[i] !== -1) continue;
        let all = true;
        for (const m of weak(sk, r, dk)) if (stm[kqkIdx(sk, r, m.to)] < 0) { all = false; break; }
        if (all) { wtm[i] = L; changed++; }
      }
    }
    if (changed === 0 && !(L & 1)) break;
  }
  let maxPlies = 0;
  for (let i = 0; i < SIZE; i++) if (stm[i] > maxPlies) maxPlies = stm[i];
  if ((maxPlies + 1) / 2 !== 16) throw new Error(`KRK table: longest mate ${(maxPlies + 1) / 2}, expected 16 — the solver is wrong`);
  // Every legal rook-side-to-move position wins (no K+R vs K position is
  // drawn with the rook's side to move) — the app's rule relies on it.
  for (let i = 0; i < SIZE; i++) {
    const sk = i >> 12; const r = (i >> 6) & 63; const dk = i & 63;
    if (legalS(sk, r, dk) && stm[i] < 0) throw new Error('KRK table: an unsolved rook-to-move position');
  }
  return { stm, wtm };
}

/** Plies the K+Q vs K mate then takes (black to move), for reporting. */
export function queenMatePlies(wk, q, bk) {
  if (!KQK) KQK = solveKqk();
  return KQK.wtm[kqkIdx(wk, q, bk)];
}

/**
 * Solve K+P vs K. Returns { val: Int8Array, dtc: Uint8Array } over
 * `kpkIndex`; val 1 = white wins, 0 = draw (also for illegal slots — read
 * `kpkLegal` first). dtc = plies to the promoting move (white to move counts
 * the promotion itself as 1), or to mate.
 */
export function solveKpk() {
  const SIZE = 64 * 64 * 64 * 2;
  const val = new Int8Array(SIZE);
  const dtc = new Uint8Array(SIZE);
  const done = new Uint8Array(SIZE);
  let deepest = 0;
  // Pawn squares from the 7th rank down: a slice reads only higher slices.
  for (let r = 6; r >= 1; r--) for (let f = 0; f < 8; f++) {
    const p = r * 8 + f;
    // Layer 0: mates and stalemates (black to move, no move).
    for (let wk = 0; wk < 64; wk++) for (let bk = 0; bk < 64; bk++) {
      if (!kpkLegal(p, wk, bk, 1)) continue;
      const i = kpkIndex(p, wk, bk, 1);
      if (kpkBlackMoves(p, wk, bk).length === 0) {
        done[i] = 1;
        val[i] = whitePawnAttacks(p).includes(bk) ? 1 : 0;
        dtc[i] = 0;
      }
    }
    let quiet = 0;
    for (let L = 1; L < 250; L++) {
      let changed = 0;
      for (let wk = 0; wk < 64; wk++) for (let bk = 0; bk < 64; bk++) {
        if (L & 1) {
          if (!kpkLegal(p, wk, bk, 0)) continue;
          const i = kpkIndex(p, wk, bk, 0);
          if (done[i]) continue;
          for (const m of kpkWhiteMoves(p, wk, bk)) {
            let ok = false;
            if (m.kind === 'promote') ok = L === 1 && (queenPromotionWins(wk, m.q, bk) || rookPromotionWins(wk, m.q, bk));
            else {
              const c = m.kind === 'king' ? kpkIndex(p, m.wk, bk, 1) : kpkIndex(m.p, wk, bk, 1);
              ok = done[c] === 1 && val[c] === 1 && dtc[c] <= L - 1;
            }
            if (ok) { done[i] = 1; val[i] = 1; dtc[i] = L; changed++; break; }
          }
        } else {
          if (!kpkLegal(p, wk, bk, 1)) continue;
          const i = kpkIndex(p, wk, bk, 1);
          if (done[i]) continue;
          const ms = kpkBlackMoves(p, wk, bk);
          let all = ms.length > 0;
          for (const m of ms) {
            if (m.takesPawn) { all = false; break; }
            const c = kpkIndex(p, wk, m.bk, 0);
            if (!(done[c] === 1 && val[c] === 1 && dtc[c] <= L - 1)) { all = false; break; }
          }
          if (all) { done[i] = 1; val[i] = 1; dtc[i] = L; changed++; }
        }
      }
      if (changed > 0) quiet = 0; else quiet++;
      // A child in a higher slice can decide a node as late as its own
      // distance + 1, so the layers run past the deepest one solved so far;
      // after that, two quiet layers in a row is the fixpoint.
      if (quiet >= 2 && L > deepest + 2) break;
    }
    for (let wk = 0; wk < 64; wk++) for (let bk = 0; bk < 64; bk++) for (let stm = 0; stm < 2; stm++) {
      const i = kpkIndex(p, wk, bk, stm);
      if (done[i] && dtc[i] > deepest) deepest = dtc[i];
    }
  }
  return { val, dtc, deepest };
}

// ── Blocked pair: white pawn on wp, black pawn on wp + 8 ───────────────────
// Index: (wk * 64 + bk) * 2 + stm.
export const pairIndex = (wk, bk, stm) => (wk * 64 + bk) * 2 + stm;

/** Mirror a square top to bottom (rank r ↔ 7 − r). */
export const flipRank = (s) => s ^ 56;

export function pairLegal(wp, wk, bk, stm) {
  const bp = wp + 8;
  if (wk === bk || adjacent(wk, bk)) return false;
  if (wk === wp || wk === bp || bk === wp || bk === bp) return false;
  // The side NOT to move may not stand in check.
  if (stm === 0 && whitePawnAttacks(wp).includes(bk)) return false;
  if (stm === 1 && blackPawnAttacks(bp).includes(wk)) return false;
  return true;
}

/** White's moves with the pair blocked: king steps only; { wk, takesPawn }. */
export function pairWhiteMoves(wp, wk, bk) {
  const bp = wp + 8;
  const out = [];
  const attacked = blackPawnAttacks(bp);
  for (const n of KING_STEPS[wk]) {
    if (n === wp || n === bk || adjacent(n, bk) || attacked.includes(n)) continue;
    out.push({ wk: n, takesPawn: n === bp });
  }
  return out;
}
export function pairBlackMoves(wp, wk, bk) {
  const bp = wp + 8;
  const out = [];
  const attacked = whitePawnAttacks(wp);
  for (const n of KING_STEPS[bk]) {
    if (n === bp || n === wk || adjacent(n, wk) || attacked.includes(n)) continue;
    out.push({ bk: n, takesPawn: n === wp });
  }
  return out;
}

/** The KPK child after a capture, as { val, dtc } from WHITE's point of view. */
function afterCapture(kpk, wp, who, wk, bk) {
  if (who === 'w') {
    // White took black's pawn: white K + pawn on wp vs black king, black to move.
    const i = kpkIndex(wp, wk, bk, 1);
    return { val: kpk.val[i], dtc: kpk.dtc[i] };
  }
  // Black took white's pawn: black K + pawn on wp + 8 vs white king, white to
  // move — the mirror of a white-pawn KPK position with black to move.
  const bp = wp + 8;
  const i = kpkIndex(flipRank(bp), flipRank(bk), flipRank(wk), 1);
  return { val: -kpk.val[i], dtc: kpk.dtc[i] };
}

/** Solve one blocked pair. Returns { val: Int8Array, dtc: Uint8Array } over
 *  `pairIndex`, white's point of view. */
export function solvePair(kpk, wp) {
  const SIZE = 64 * 64 * 2;
  const val = new Int8Array(SIZE);
  const dtc = new Uint8Array(SIZE);
  const done = new Uint8Array(SIZE);
  for (let wk = 0; wk < 64; wk++) for (let bk = 0; bk < 64; bk++) for (let stm = 0; stm < 2; stm++) {
    if (!pairLegal(wp, wk, bk, stm)) continue;
    const ms = stm === 0 ? pairWhiteMoves(wp, wk, bk) : pairBlackMoves(wp, wk, bk);
    // No king move and the pawn frozen: stalemate (a king in check always has
    // somewhere to go here, or it is mate — handled below with the layers).
    if (ms.length === 0) {
      const inCheck = stm === 0 ? blackPawnAttacks(wp + 8).includes(wk) : whitePawnAttacks(wp).includes(bk);
      const i = pairIndex(wk, bk, stm);
      done[i] = 1; dtc[i] = 0;
      val[i] = inCheck ? (stm === 0 ? -1 : 1) : 0;
    }
  }
  let quiet = 0;
  for (let L = 1; L < 250; L++) {
    let changed = 0;
    for (let wk = 0; wk < 64; wk++) for (let bk = 0; bk < 64; bk++) for (let stm = 0; stm < 2; stm++) {
      if (!pairLegal(wp, wk, bk, stm)) continue;
      const i = pairIndex(wk, bk, stm);
      if (done[i]) continue;
      const me = stm === 0 ? 1 : -1;
      const ms = stm === 0 ? pairWhiteMoves(wp, wk, bk) : pairBlackMoves(wp, wk, bk);
      const child = (m) => {
        if (m.takesPawn) return stm === 0 ? afterCapture(kpk, wp, 'w', m.wk, bk) : afterCapture(kpk, wp, 'b', wk, m.bk);
        const c = stm === 0 ? pairIndex(m.wk, bk, 1) : pairIndex(wk, m.bk, 0);
        return done[c] ? { val: val[c], dtc: dtc[c] } : null;
      };
      let win = false; let allLose = ms.length > 0;
      for (const m of ms) {
        const c = child(m);
        if (c && c.val === me && c.dtc <= L - 1) win = true;
        if (!(c && c.val === -me && c.dtc <= L - 1)) allLose = false;
      }
      if (win) { done[i] = 1; val[i] = me; dtc[i] = L; changed++; }
      else if (allLose) { done[i] = 1; val[i] = -me; dtc[i] = L; changed++; }
    }
    if (changed > 0) quiet = 0; else quiet++;
    if (quiet >= 2 && L > kpk.deepest + 2) break;
  }
  return { val, dtc };
}

// ── FENs ─────────────────────────────────────────────────────────────────
function placementFen(pieces) {
  const rows = [];
  for (let r = 7; r >= 0; r--) {
    let row = ''; let empty = 0;
    for (let f = 0; f < 8; f++) {
      const ch = pieces.get(r * 8 + f);
      if (ch) { if (empty) { row += empty; empty = 0; } row += ch; } else empty++;
    }
    if (empty) row += empty;
    rows.push(row);
  }
  return rows.join('/');
}

/** The FEN of a normalised position, as the STUDENT sees it: `student` 'w'
 *  keeps it, 'b' mirrors it (ranks flipped, colours swapped). `stm` 0 = the
 *  normalised white (the student) to move. */
export function fenFor({ wk, bk, wp, bp }, stm, student) {
  const pieces = new Map();
  if (student === 'w') {
    pieces.set(wk, 'K'); pieces.set(bk, 'k');
    if (wp !== undefined) pieces.set(wp, 'P');
    if (bp !== undefined) pieces.set(bp, 'p');
    return `${placementFen(pieces)} ${stm === 0 ? 'w' : 'b'} - - 0 1`;
  }
  pieces.set(flipRank(wk), 'k'); pieces.set(flipRank(bk), 'K');
  if (wp !== undefined) pieces.set(flipRank(wp), 'p');
  if (bp !== undefined) pieces.set(flipRank(bp), 'P');
  return `${placementFen(pieces)} ${stm === 0 ? 'b' : 'w'} - - 0 1`;
}

// ── Reading a FEN ────────────────────────────────────────────────────────
/**
 * A lookup over the solved families for any FEN: { val, dtc } from WHITE's
 * point of view (val 1 white wins, 0 draw, -1 black wins), or null when the
 * board is in none of them. Bare kings are a draw (dtc 0). `pairs` maps a
 * white pawn square to its solved blocked pair (missing pairs read null).
 * Needs chess.js-free input: `pieces` = [{ type, color, sq }], `stm` 'w'|'b'.
 */
export function makeLookup(kpk, pairs) {
  return (pieces, stm) => {
    const kings = pieces.filter((p) => p.type === 'k');
    const pawns = pieces.filter((p) => p.type === 'p');
    if (kings.length !== 2 || pieces.length !== 2 + pawns.length) return null;
    const wk = kings.find((p) => p.color === 'w').sq;
    const bk = kings.find((p) => p.color === 'b').sq;
    if (pawns.length === 0) return { val: 0, dtc: 0 };
    if (pawns.length === 1) {
      const pawn = pawns[0];
      if (pawn.color === 'w') {
        const i = kpkIndex(pawn.sq, wk, bk, stm === 'w' ? 0 : 1);
        return { val: kpk.val[i], dtc: kpk.dtc[i] };
      }
      const i = kpkIndex(flipRank(pawn.sq), flipRank(bk), flipRank(wk), stm === 'b' ? 0 : 1);
      return { val: -kpk.val[i], dtc: kpk.dtc[i] };
    }
    if (pawns.length === 2) {
      const w = pawns.find((p) => p.color === 'w');
      const b = pawns.find((p) => p.color === 'b');
      if (!w || !b || b.sq !== w.sq + 8) return null;
      const pair = pairs.get(w.sq);
      if (!pair) return null;
      const i = pairIndex(wk, bk, stm === 'w' ? 0 : 1);
      return { val: pair.val[i], dtc: pair.dtc[i] };
    }
    return null;
  };
}
