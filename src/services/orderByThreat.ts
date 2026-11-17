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
import { legalSeeGainFor } from './positionReadingService';
import { PIECE_NAMES } from '../types/tacticTypes';

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
/** The most the side `me` can win by one capture on the board `c` (me to
 *  move), counted to the end of its trades, in pawns. */
function wonAfter(c: Chess, me: Color): number {
  let best = 0;
  for (const row of c.board()) for (const cell of row) {
    if (!cell || cell.color === me || cell.type === 'k') continue;
    best = Math.max(best, legalSeeGainFor(c.fen(), cell.square, me));
  }
  return best;
}

/** `yPv`: the engine's line after the follow-up played first (UCI, its
 *  reply first) — from the fan read before the move; null where the surface
 *  has none. It is how a CHECK the order prevents is found: a check is no
 *  board "want" (it wins nothing on its own), so only the engine can say it
 *  is the answer (Najdorf …a6: "…e5 at once allows Bb5+", David 2026-11-17:
 *  "Why cut that corner? Model Bb5+"). */
export function orderByThreat(fenBefore: string, san: string, line: readonly string[], mine: boolean, yPv: readonly string[] | null): OrderPoint | null {
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
      // …AND THE REPLY DOES NOT JUST LOSE MATERIAL: a reply that leaves the
      // mover a winning capture is no reason to fear the order (Danya 4T9
      // 9…Nxd4: "Why not …e5 first? It would allow Bg5" — …exd4 wins a knight).
      if (wonAfter(c, me) >= 1) continue;
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
  return checkOrder(fenBefore, san, me, x, y, mine, yPv);
}

const WORTH: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** THE CHECK THE ORDER PREVENTS. The engine's answer to the follow-up played
 *  first is a check; after the move played, that check is illegal or drops
 *  the checking piece. Said with what the check sets up when the engine's
 *  line shows it: their next piece move after the check is answered, and the
 *  most valuable piece of the mover's it hits. */
function checkOrder(
  fenBefore: string, san: string, me: Color,
  x: { from: string; to: string; fen: string },
  y: { from: string; to: string; fen: string; san: string },
  mine: boolean, yPv: readonly string[] | null,
): OrderPoint | null {
  if (!yPv || yPv.length === 0) return null;
  const uciMove = (c: Chess, u: string) => { try { return c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { return null; } };
  const c = new Chess(y.fen);
  const r = uciMove(c, yPv[0]);
  if (!r || !c.inCheck()) return null;
  // The check must not simply lose for them after the follow-up.
  if (wonAfter(c, me) >= 1) return null;
  // After the move played, the check is gone: illegal, or the checker drops.
  const cx = new Chess(x.fen);
  const rx = uciMove(cx, yPv[0]);
  if (rx && legalSeeGainFor(cx.fen(), rx.to, me) < Math.min(1, WORTH[rx.piece])) return null;
  // X must still be playable after Y and the check is answered (a real swap).
  const own = mine ? 'your' : 'their';
  const theirs = mine ? 'their' : 'your';
  let rest = '';
  const squares = [y.to, r.to];
  const block = yPv[1] ? uciMove(c, yPv[1]) : null;
  const next = block && yPv[2] ? uciMove(c, yPv[2]) : null;
  if (block && next && next.piece !== 'p' && !next.captured) {
    // The target it hits: fewest guards first, then the most valuable, then
    // the most central file (the Najdorf's d6, not the g7 the bishop holds as well).
    let hit: { square: string; piece: string; key: number } | null = null;
    for (const row of c.board()) for (const cell of row) {
      if (!cell || cell.color !== me || cell.type === 'k') continue;
      if (!c.attackers(cell.square, next.color).includes(next.to)) continue;
      const file = cell.square.charCodeAt(0) - 97;
      const key = -c.attackers(cell.square, me).length * 100 + WORTH[cell.type] * 10 - Math.abs(file - 3.5);
      if (!hit || key > hit.key) hit = { square: cell.square, piece: cell.type, key };
    }
    const answered = block.piece === 'k' ? `${own} king steps aside` : `${mine ? 'you block' : 'they block'} it`;
    const mover = `${theirs} ${PIECE_NAMES[next.piece]}`;
    rest = `, and once ${answered}, ${mover} comes to ${next.to}${hit ? `, hitting ${seatPieceWords(c.fen(), hit.square, own, `${own} piece on ${hit.square}`)}` : ''}`;
    squares.push(next.to, ...(hit ? [hit.square] : []));
  }
  const them: Color = me === 'w' ? 'b' : 'w';
  const dot = (side: Color, s: string): string => (side === 'b' ? `…${s}` : s);
  void fenBefore; void san;
  return { follow: dot(me, y.san), answer: dot(them, r.san), would: `would give check from ${r.to}${rest}`, squares };
}
