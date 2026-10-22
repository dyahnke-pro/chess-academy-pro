// THE TRIANGULATION BOARD RULE (Campaign lane KP, Level 21) — which boards of
// a solved pawn structure (`kp-slice.mjs`) pose "hand them the move", read off
// the exact slice. With the student (normalised to White) to move:
//   1. the student WINS;
//   2. the same board with the DEFENDER to move is legal and a win too — the
//      defender is in zugzwang, so the student only has to pass the move;
//   3. every winning move is a king move inside the structure (no pawn move,
//      no capture wins) and some move does not win;
//   4. the direct approach fails: a king move that brings the student's king
//      closer to the defender's pawn lets them draw (the natural wrong move);
//   5. THE TRIANGLE IS THE ONLY WAY: EVERY winning move k0→k1 starts one —
//      a square k2 next to both k0 and k1, the defender has a reply after
//      which k1→k2 still wins, the defender can step back, and k2→k0 then
//      stands on this very board with the defender to move.
// Rules 1–3 are what the app reads live (`kpTriangulation.ts`); 4 and 5 hold
// for the curated boards. NOT required: that the triangle is the engine's
// FASTEST win — on the app's own lesson board (Ke4, b5 + c4 against Kc7, b6)
// Syzygy's quickest win is 13 plies and the same board with Black to move
// lasts 16, so the triangle is the human plan, not the shortest line.
import { sliceIndex } from './kp-slice.mjs';
import * as T from './kp-tablebase.mjs';

export function triangleBoards(slice) {
  const out = [];
  const val = (i) => slice.val[i];
  const kv = (k) => (k.kind === 'exit' ? k.val : val(k.child));
  const target = slice.black[0];
  const toTarget = (s) => Math.max(Math.abs(T.fileOf(s) - T.fileOf(target)), Math.abs(T.rankOf(s) - T.rankOf(target)));
  const sqOf = (uci) => T.squareIndex(uci.slice(2, 4));
  for (let wk = 0; wk < 64; wk++) for (let bk = 0; bk < 64; bk++) {
    const a = sliceIndex(wk, bk, 0);
    const d = sliceIndex(wk, bk, 1);
    if (!slice.legalAt[a] || val(a) !== 1 || !slice.legalAt[d] || val(d) !== 1) continue;
    const kids = slice.kids[a];
    const wins = kids.filter((k) => kv(k) === 1);
    if (wins.length === 0 || wins.length === kids.length || !wins.every((k) => k.kind === 'in')) continue;
    const approach = kids.filter((k) => k.kind === 'in' && kv(k) !== 1 && toTarget(sqOf(k.uci)) < toTarget(wk));
    if (approach.length === 0) continue;
    // The triangle from a winning first step k0 → k1: the defender steps out
    // (its most stubborn such reply first), k1 → k2 still wins, the defender
    // steps back, and k2 → k0 is this board with the defender to move.
    const triangleFrom = (first) => {
      const k1 = sqOf(first.uci);
      const replies = slice.kids[first.child].filter((r) => r.kind === 'in' && val(r.child) === 1)
        .sort((x, y) => slice.dist[y.child] - slice.dist[x.child]);
      for (const reply of replies) {
        for (const second of slice.kids[reply.child]) {
          if (second.kind !== 'in' || val(second.child) !== 1) continue;
          const k2 = sqOf(second.uci);
          if (k2 === wk || !T.adjacent(k2, wk) || !T.adjacent(k1, k2)) continue;
          const back = slice.kids[second.child].find((r) => r.kind === 'in' && sqOf(r.uci) === bk);
          if (!back) continue;
          const home = slice.kids[back.child].find((r) => r.kind === 'in' && sqOf(r.uci) === wk);
          if (home && home.child === d) return [first.uci, reply.uci, second.uci, back.uci, home.uci];
        }
      }
      return null;
    };
    // EVERY winning move is the first step of a triangle — the student wins
    // only by triangulating.
    const lines = wins.map(triangleFrom);
    if (lines.some((l) => l === null)) continue;
    const line = lines[0];
    out.push({ wk, bk, wins: wins.map((k) => k.uci), draws: kids.filter((k) => kv(k) !== 1).map((k) => k.uci), approach: approach.map((k) => k.uci), line, dist: slice.dist[a] });
  }
  return out;
}
