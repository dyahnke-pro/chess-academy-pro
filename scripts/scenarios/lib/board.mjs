// Small board helpers shared by the Lane R scenario builders. chess.js only.
import { Chess } from 'chess.js';

export const FILES = 'abcdefgh';
export const sq = (f, r) => `${FILES[f]}${r + 1}`;
export const fileOf = (s) => s.charCodeAt(0) - 97;
export const rankOf = (s) => Number(s[1]) - 1;
export const cheb = (a, b) => Math.max(Math.abs(fileOf(a) - fileOf(b)), Math.abs(rankOf(a) - rankOf(b)));

export function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A FEN from a placement map { square: 'K' | 'r' | … } and the side to move. */
export function fenFrom(placement, turn) {
  const rows = [];
  for (let r = 7; r >= 0; r--) {
    let row = ''; let empty = 0;
    for (let f = 0; f < 8; f++) {
      const p = placement[sq(f, r)];
      if (p) { if (empty) { row += empty; empty = 0; } row += p; } else empty++;
    }
    if (empty) row += empty;
    rows.push(row);
  }
  return `${rows.join('/')} ${turn} - - 0 1`;
}

/** The board seen from the other side: ranks flipped, colours swapped. Every
 *  chess fact maps over exactly (a White win becomes a Black win). */
export function mirrorFen(fen) {
  const [board, turn, , , half = '0', full = '1'] = fen.split(' ');
  const rows = board.split('/').reverse().map((row) => row.replace(/[a-zA-Z]/g, (ch) => (ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase())));
  return `${rows.join('/')} ${turn === 'w' ? 'b' : 'w'} - - ${half} ${full}`;
}
export const mirrorSquare = (s) => `${s[0]}${9 - Number(s[1])}`;
export const mirrorUci = (u) => `${mirrorSquare(u.slice(0, 2))}${mirrorSquare(u.slice(2, 4))}${u.slice(4)}`;

export const uciOf = (m) => `${m.from}${m.to}${m.promotion ?? ''}`;

export function pieces(chess) {
  return chess.board().flat().filter(Boolean);
}

/** Legal, not over, the side NOT to move not in check. */
export function sane(fen) {
  let c;
  try { c = new Chess(fen); } catch { return null; }
  if (c.isGameOver()) return null;
  const notToMove = c.turn() === 'w' ? 'b' : 'w';
  const king = pieces(c).find((p) => p.type === 'k' && p.color === notToMove);
  if (!king || c.isAttacked(king.square, c.turn())) return null;
  return c;
}

export function after(fen, uci) {
  const c = new Chess(fen);
  c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  return c;
}
