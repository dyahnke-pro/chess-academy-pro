// THE OUTFLANKING BOARD RULE (Campaign lane KP, Level 19) — which king-and-
// pawn boards pose "go around their king", read off the exact tables.
//
// A board poses it when, with the student (normalised to White) to move:
//   1. it is in a solved family (K+P vs K, or a blocked pawn pair) and the
//      student WINS with best play;
//   2. the kings face each other: same file, the defender's king two ranks
//      in front of the student's (the defender holds the opposition);
//   3. every winning move is a king SIDESTEP — one file across, same rank,
//      not a capture — so the head-on tries, the retreats and the pawn
//      moves all let the win slip;
//   4. at least one move draws (true by 3 whenever a pawn or a retreat can
//      move; asserted, so a board with nothing to get wrong is not a lesson).
// The same rule is applied at runtime by `src/missions/checks/kpOutflanking.ts`
// (it judges a live game from the first board that poses it).
import * as T from './kp-tablebase.mjs';

/** Every board that poses the decision, normalised (White = the student). */
export function outflankBoards(kpk, pairs) {
  const out = [];
  const consider = (fam, pawnSq, wk, bk, kids) => {
    const wins = kids.filter((k) => k.val === 1);
    if (wins.length === 0) return;
    const sidestep = (k) => k.kind === 'king' && !k.capture && T.rankOf(k.to) === T.rankOf(wk) && Math.abs(T.fileOf(k.to) - T.fileOf(wk)) === 1;
    if (!wins.every(sidestep)) return;
    if (wins.length === kids.length) return;
    out.push({ fam, pawnSq, wk, bk, wins, draws: kids.filter((k) => k.val !== 1) });
  };
  for (let wk = 0; wk < 48; wk++) {
    const bk = wk + 16; // same file, two ranks in front
    for (let p = 8; p < 56; p++) {
      if (!T.kpkLegal(p, wk, bk, 0) || kpk.val[T.kpkIndex(p, wk, bk, 0)] !== 1) continue;
      const kids = T.kpkWhiteMoves(p, wk, bk).map((m) => {
        if (m.kind === 'king') return { kind: 'king', from: wk, to: m.wk, val: kpk.val[T.kpkIndex(p, m.wk, bk, 1)] };
        if (m.kind === 'push') return { kind: 'pawn', from: p, to: m.p, val: kpk.val[T.kpkIndex(m.p, wk, bk, 1)] };
        return { kind: 'pawn', from: p, to: m.q, val: T.queenPromotionWins(wk, m.q, bk) || T.rookPromotionWins(wk, m.q, bk) ? 1 : 0 };
      });
      consider('kpk', p, wk, bk, kids);
    }
    for (const [wp, pair] of pairs) {
      if (!T.pairLegal(wp, wk, bk, 0) || pair.val[T.pairIndex(wk, bk, 0)] !== 1) continue;
      const kids = T.pairWhiteMoves(wp, wk, bk).map((m) => ({
        kind: 'king', capture: m.takesPawn, from: wk, to: m.wk,
        val: m.takesPawn ? kpk.val[T.kpkIndex(wp, m.wk, bk, 1)] : pair.val[T.pairIndex(m.wk, bk, 1)],
      }));
      consider('pair', wp, wk, bk, kids);
    }
  }
  return out;
}
