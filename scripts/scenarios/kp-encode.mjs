// PACK THE EXACT KING-AND-PAWN TABLES for the app (Campaign lane KP). The
// runtime decoder is `src/missions/checks/kpEndings.ts`; its test rebuilds the
// tables with `kp-tablebase.mjs` and checks the shipped bits against them.
//
// K+P vs K: one bit per position — does White (the pawn's side) win? The pawn
// is folded onto files a–d (a board with the pawn on e–h is read mirrored),
// ranks 2–7: index ((pawn * 64 + wk) * 64 + bk) * 2 + stm, pawn = (rank − 1)
// * 4 + file, stm 0 = White to move. Illegal slots read 0.
// A SLICE: one fixed set of pawns, the kings anywhere, one side to move — two
// bits per (wk, bk): 0 draw, 1 White wins, 2 Black wins, 3 not known (an
// illegal placement, or one the build did not solve) — index wk * 64 + bk.
// Keyed by the pawns, `sliceKey`: White's squares, '/', Black's, each sorted
// ("e5/e6" is the blocked pair on the e-file).
import { kpkIndex } from './kp-tablebase.mjs';

export const KPK_BITS = 24 * 64 * 64 * 2;

export function packKpk(kpk) {
  const bytes = new Uint8Array(KPK_BITS / 8);
  for (let r = 1; r <= 6; r++) for (let f = 0; f < 4; f++) {
    const p = r * 8 + f;
    const pIdx = (r - 1) * 4 + f;
    for (let wk = 0; wk < 64; wk++) for (let bk = 0; bk < 64; bk++) for (let stm = 0; stm < 2; stm++) {
      if (kpk.val[kpkIndex(p, wk, bk, stm)] !== 1) continue;
      const i = ((pIdx * 64 + wk) * 64 + bk) * 2 + stm;
      bytes[i >> 3] |= 1 << (i & 7);
    }
  }
  return Buffer.from(bytes).toString('base64');
}

export const sliceKey = (white, black) => `${[...white].sort().join(',')}/${[...black].sort().join(',')}`;

/** Pack one slice: `code(wk, bk)` gives 0 | 1 | 2 | 3 for every placement. */
export function packSlice(code) {
  const bytes = new Uint8Array((64 * 64 * 2) / 8);
  for (let wk = 0; wk < 64; wk++) for (let bk = 0; bk < 64; bk++) {
    const bit = (wk * 64 + bk) * 2;
    bytes[bit >> 3] |= code(wk, bk) << (bit & 7);
  }
  return Buffer.from(bytes).toString('base64');
}

/** A solved blocked pair as its two slices (White to move, Black to move). */
export function packPairSlices(pair, wp, legal) {
  const one = (stm) => packSlice((wk, bk) => {
    if (!legal(wp, wk, bk, stm)) return 3;
    const v = pair.val[(wk * 64 + bk) * 2 + stm];
    return v === 1 ? 1 : v === -1 ? 2 : 0;
  });
  return { w: one(0), b: one(1) };
}
