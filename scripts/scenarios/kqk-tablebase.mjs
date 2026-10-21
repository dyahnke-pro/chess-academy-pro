// THE EXACT K+Q vs K TABLE — distance to mate for every legal position, by
// retrograde analysis (WO-CAMPAIGN-MASTER Lane A). No engine, no guess: the
// whole ending is 64³ placements × 2 sides to move, small enough to solve
// outright, so the scenario library is chosen by the TRUE mate distance and
// Stockfish is the independent second check (it reports an upper bound that
// shrinks with depth — mate 9 at depth 20, mate 7 at depth 27 on one board —
// so it cannot be the only instrument).
//
// Colour-free: the strong side (king + queen) and the weak side (lone king).
// Squares 0..63, file = s & 7, rank = s >> 3 (0 = rank 1).
//
// `solveKqk()` → { stm, wtm } Int8Arrays indexed `sk * 4096 + q * 64 + dk`:
//   stm[i] — strong to move: plies to mate (odd), -1 = illegal / not a win;
//   wtm[i] — weak to move: plies until mated (even, 0 = mated now),
//            -2 = a draw (stalemate, or the queen can be taken), -1 = illegal.
// Mate distance in MOVES for a strong-to-move position = (plies + 1) / 2.
// The known maximum for this ending is 10 moves; `solveKqk` asserts it.

const N = 64;
const fileOf = (s) => s & 7;
const rankOf = (s) => s >> 3;

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

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

/** Does a queen on `q` attack `target`, with only `block` in the way? */
export function queenAttacks(q, target, block) {
  if (q === target) return false;
  const df = Math.sign(fileOf(target) - fileOf(q));
  const dr = Math.sign(rankOf(target) - rankOf(q));
  const fd = Math.abs(fileOf(target) - fileOf(q));
  const rd = Math.abs(rankOf(target) - rankOf(q));
  if (!(fd === 0 || rd === 0 || fd === rd)) return false;
  let f = fileOf(q) + df; let r = rankOf(q) + dr;
  while (true) {
    const t = r * 8 + f;
    if (t === target) return true;
    if (t === block) return false;
    f += df; r += dr;
  }
}

export const idx = (sk, q, dk) => sk * 4096 + q * 64 + dk;

/** Legal with the strong side to move: distinct squares, kings apart, the
 *  weak king not in check. */
export function legalStm(sk, q, dk) {
  return sk !== q && sk !== dk && q !== dk && !adjacent(sk, dk) && !queenAttacks(q, dk, sk);
}
/** Legal with the weak side to move (it may be in check). */
export function legalWtm(sk, q, dk) {
  return sk !== q && sk !== dk && q !== dk && !adjacent(sk, dk);
}

/** The weak king's moves: { to, takesQueen } — never next to the strong king,
 *  never onto a square the queen sees (the king itself no longer blocks). */
export function weakMoves(sk, q, dk) {
  const out = [];
  for (const n of KING_STEPS[dk]) {
    if (n === sk || adjacent(n, sk)) continue;
    if (n === q) { out.push({ to: n, takesQueen: true }); continue; } // q not guarded: n is not next to sk
    if (queenAttacks(q, n, sk)) continue;
    out.push({ to: n, takesQueen: false });
  }
  return out;
}

/** The strong side's moves as [sk', q'] pairs. */
export function strongMoves(sk, q, dk) {
  const out = [];
  for (const n of KING_STEPS[sk]) {
    if (n === q || n === dk || adjacent(n, dk)) continue;
    out.push([n, q]);
  }
  // The queen slides until the board edge or either king.
  for (const [df, dr] of DIRS) {
    let f = fileOf(q) + df; let r = rankOf(q) + dr;
    while (f >= 0 && f < 8 && r >= 0 && r < 8) {
      const t = r * 8 + f;
      if (t === sk || t === dk) break;
      out.push([sk, t]);
      f += df; r += dr;
    }
  }
  return out;
}

export function solveKqk() {
  const SIZE = N * N * N;
  const stm = new Int8Array(SIZE).fill(-1);
  const wtm = new Int8Array(SIZE).fill(-1);
  const legalS = new Uint8Array(SIZE);
  const legalW = new Uint8Array(SIZE);
  for (let sk = 0; sk < N; sk++) for (let q = 0; q < N; q++) for (let dk = 0; dk < N; dk++) {
    const i = idx(sk, q, dk);
    if (legalStm(sk, q, dk)) legalS[i] = 1;
    if (legalWtm(sk, q, dk)) legalW[i] = 1;
  }
  // Layer 0: the weak side mated; draws (stalemate, a free queen) fixed now.
  for (let i = 0; i < SIZE; i++) {
    if (!legalW[i]) continue;
    const sk = i >> 12; const q = (i >> 6) & 63; const dk = i & 63;
    const moves = weakMoves(sk, q, dk);
    if (moves.length === 0) wtm[i] = queenAttacks(q, dk, sk) ? 0 : -2;
    else if (moves.some((m) => m.takesQueen)) wtm[i] = -2;
  }
  for (let L = 1; L < 64; L++) {
    let changed = 0;
    for (let i = 0; i < SIZE; i++) {
      const sk = i >> 12; const q = (i >> 6) & 63; const dk = i & 63;
      if (L & 1) {
        if (!legalS[i] || stm[i] !== -1) continue;
        for (const [nk, nq] of strongMoves(sk, q, dk)) {
          if (wtm[idx(nk, nq, dk)] === L - 1) { stm[i] = L; changed++; break; }
        }
      } else {
        if (!legalW[i] || wtm[i] !== -1) continue;
        let all = true;
        for (const m of weakMoves(sk, q, dk)) {
          if (stm[idx(sk, q, m.to)] < 0) { all = false; break; }
        }
        if (all) { wtm[i] = L; changed++; }
      }
    }
    if (changed === 0 && !(L & 1)) break;
  }
  let maxPlies = 0;
  for (let i = 0; i < SIZE; i++) if (stm[i] > maxPlies) maxPlies = stm[i];
  if ((maxPlies + 1) / 2 !== 10) throw new Error(`KQK table: longest mate ${(maxPlies + 1) / 2}, expected 10 — the solver is wrong`);
  // Every legal strong-to-move position wins (no K+Q vs K position is drawn
  // with the queen's side to move).
  for (let i = 0; i < SIZE; i++) if (legalS[i] && stm[i] < 0) throw new Error('KQK table: an unsolved strong-to-move position');
  return { stm, wtm };
}

export const SQUARE_NAMES = Array.from({ length: N }, (_, s) => 'abcdefgh'[fileOf(s)] + (rankOf(s) + 1));
export const squareIndex = (name) => (Number(name[1]) - 1) * 8 + 'abcdefgh'.indexOf(name[0]);

/** A FEN for the placement: `strong` is 'w' or 'b', and it is to move when
 *  `strongToMove`. */
export function fenOf(sk, q, dk, strong, strongToMove) {
  const rows = [];
  for (let r = 7; r >= 0; r--) {
    let row = ''; let empty = 0;
    for (let f = 0; f < 8; f++) {
      const s = r * 8 + f;
      let ch = '';
      if (s === sk) ch = strong === 'w' ? 'K' : 'k';
      else if (s === q) ch = strong === 'w' ? 'Q' : 'q';
      else if (s === dk) ch = strong === 'w' ? 'k' : 'K';
      if (ch) { if (empty) { row += empty; empty = 0; } row += ch; } else empty++;
    }
    if (empty) row += empty;
    rows.push(row);
  }
  const weak = strong === 'w' ? 'b' : 'w';
  return `${rows.join('/')} ${strongToMove ? strong : weak} - - 0 1`;
}
