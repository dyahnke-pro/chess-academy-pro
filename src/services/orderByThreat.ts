// MOVE ORDER, READ OFF THE BOARD (gap B1, David 2026-11-12: "move order …
// I want that done"). Theory says it constantly — "Black cannot play …e6 at
// once", "…Nf6 first, because …e5 straight away allows Qh5", "the knight goes
// first so the bishop is not pinned". The engine-backed `moveOrder` needs a
// second read (the follow-up played first); this reads the same question on
// the board alone, so it speaks on every surface the line is known:
//
//   X is the move played, Y the mover's next move in the line that follows.
//   Y played INSTEAD of X — now — lets the other side pin, fork or kick a
//   piece (`theirWantedMoves`) that X's order does not allow. Then the order
//   is the point: "X first: Y at once would allow …R, which would pin …".
//
// Guards, each a false positive it would otherwise say:
//   · Y must be legal before X (otherwise there is no order to swap);
//   · R must be wanted after Y and NOT after X (the order is what prevents it);
//   · R must not simply take the piece Y moved (that is "Y hangs", another
//     lesson), nor hit the piece X moved (X walked it away — its rescue);
//   · X must still be playable after Y and R (the two moves really swap).
//
// Pure (chess.js + the wanted-moves reader). Both seats.
import { Chess, type Color } from 'chess.js';
import { theirWantedMoves, type TheirWant } from './prophylaxis';
import { seatPieceWords } from './pieceRef';

export interface OrderPoint {
  /** The follow-up that has to wait, as said ("…e6"). */
  follow: string;
  /** Their answer it would allow ("Bb5"). */
  answer: string;
  /** "would pin your knight on c6 against your king". */
  would: string;
  squares: string[];
}

/** Is X's order the point? `mine`: the student moved (words in their seat). */
export function orderByThreat(fenBefore: string, san: string, line: readonly string[], mine: boolean): OrderPoint | null {
  const followSan = line[1];
  if (!followSan) return null;
  let me: Color;
  let x: { from: string; to: string; fen: string };
  let y: { from: string; to: string; fen: string; san: string };
  try {
    const a = new Chess(fenBefore);
    me = a.turn();
    const mx = a.move(san);
    x = { from: mx.from, to: mx.to, fen: a.fen() };
    const b = new Chess(fenBefore);
    const my = b.move(followSan.replace(/^…/, ''));
    if (!my) return null;
    y = { from: my.from, to: my.to, fen: b.fen(), san: my.san };
  } catch { return null; }
  if (x.from === y.from && x.to === y.to) return null;
  const key = (w: TheirWant): string => `${w.from}${w.to}`;
  const afterX = new Set(theirWantedMoves(x.fen, me).map(key));
  const own = mine ? 'your' : 'their';
  const piece = (h: { square: string; piece: string }): string => seatPieceWords(y.fen, h.square, own, `${own} piece on ${h.square}`);
  for (const w of theirWantedMoves(y.fen, me)) {
    if (afterX.has(key(w))) continue;
    if (w.to === y.to) continue;
    if (w.hit.some((h) => h.square === y.to || h.square === x.from)) continue;
    // The two moves really swap: X is still playable after Y and R.
    try {
      const c = new Chess(y.fen);
      c.move(w.san);
      if (!c.move(san)) continue;
    } catch { continue; }
    const [v, ...rest] = w.hit;
    const would = w.kind === 'pin' ? `would pin ${piece(v)}${rest[0] ? ` against ${piece(rest[0])}` : ''}`
      : w.kind === 'fork' ? `would fork ${[v, ...rest].map(piece).join(' and ')}`
        : `would kick ${piece(v)}`;
    const them: Color = me === 'w' ? 'b' : 'w';
    const dotMe = (s: string): string => (me === 'b' ? `…${s}` : s);
    const dotThem = (s: string): string => (them === 'b' ? `…${s}` : s);
    return { follow: dotMe(y.san), answer: dotThem(w.san), would, squares: [y.to, w.to, ...w.hit.map((h) => h.square)] };
  }
  return null;
}
