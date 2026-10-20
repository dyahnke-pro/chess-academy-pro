// pawnKickNext — the pins against a side, and the pawn step that prepares a
// kick (David 2026-10-20, his Learn game: 13.Bc3 heard nothing, and the move it
// should have been, a4, was "it would grab space on the queenside". a4's job
// was a5 next, kicking the queen on b6 that pinned his d4 pawn to his king).
//
// ONE copy of each, read from both seats: Learn's own-move point ("prepares
// a5, which would kick their queen off b6 — the queen pinning your pawn on
// d4") and the better move's reason after a slip ("it would prepare a5 to kick
// their queen off b6 and free your pawn on d4 from the pin"). Both used to be
// private to `reviewMoveTeaching`, so the better-move reason never saw them.
//
// A LEAF: chess.js only.
import { Chess, type Move } from 'chess.js';

type Sq = Parameters<Chess['get']>[0];

const PIECE_VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

const RAYS: Record<string, number[][]> = {
  r: [[1, 0], [-1, 0], [0, 1], [0, -1]],
  b: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
  q: [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]],
};

/** A pin against `color`: the enemy slider on `pinner`, `color`'s piece on
 *  `pinned`, and the costlier piece (or king) on `behind`. */
export interface PinAgainst { pinner: string; pinned: string; behind: string }

/** Every pin against `color` — absolute (to the king) OR relative (to a MORE
 *  valuable friendly piece behind). Board-true: walking out from each enemy
 *  rook/bishop/queen, the first piece is a friendly A and the next a friendly
 *  of greater value (or the king) with nothing between → A is pinned. The pin
 *  must COST something: the rear piece is the king, worth more than the pinner,
 *  or undefended ("Nf6 unpins your pawn on f7" was a pawn in front of a
 *  defended knight on g8, walk 2026-09-27). */
export function pinsAgainst(fen: string, color: 'w' | 'b'): PinAgainst[] {
  const out: PinAgainst[] = [];
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return out; }
  const enemy: 'w' | 'b' = color === 'w' ? 'b' : 'w';
  const val = (t: string): number => (t === 'k' ? 100 : (PIECE_VAL[t] ?? 0));
  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== enemy || !RAYS[cell.type]) continue;
      const f0 = cell.square.charCodeAt(0) - 97;
      const r0 = Number(cell.square[1]) - 1;
      for (const [df, dr] of RAYS[cell.type]) {
        let f = f0 + df;
        let r = r0 + dr;
        let a: { sq: string; val: number } | null = null;
        while (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
          const s = `${String.fromCharCode(97 + f)}${r + 1}`;
          const pc = chess.get(s as Sq);
          if (pc) {
            if (!a) {
              if (pc.color === color && pc.type !== 'k') a = { sq: s, val: val(pc.type) };
              else break; // enemy piece, or our king as the first piece → no pin starts here
            } else {
              const rearCosts = pc.type === 'k' || val(pc.type) > val(cell.type) || chess.attackers(s as Sq, color).length === 0;
              if (pc.color === color && val(pc.type) > a.val && rearCosts) out.push({ pinner: cell.square, pinned: a.sq, behind: s });
              break; // the second piece resolves the line
            }
          }
          f += df;
          r += dr;
        }
      }
    }
  }
  return out;
}

/** A pawn step whose NEXT step would attack an enemy piece (review walk
 *  2026-10-01: 9.h4, heading for h5 against the knight on g6). Only when that
 *  next square is safe for the pawn: no enemy pawn covers it and it is
 *  defended at least as often as it is attacked. `after` is the board after
 *  `mv`. The richest target wins. */
export function pawnKickNext(after: Chess, mv: Move): { next: string; target: { sq: string; type: string } } | null {
  if (mv.piece !== 'p' || mv.captured || mv.promotion) return null;
  const dir = mv.color === 'w' ? 1 : -1;
  const next = `${mv.to[0]}${Number(mv.to[1]) + dir}`;
  if (Number(next[1]) < 2 || Number(next[1]) > 7 || after.get(next as Sq)) return null;
  const them = mv.color === 'w' ? 'b' : 'w';
  // Counted with the pawn already on the next square — the file behind it
  // opens (h4-h5 lets the h1 rook defend h5).
  const pushed = new Chess(after.fen());
  pushed.remove(mv.to);
  pushed.put({ type: 'p', color: mv.color }, next as Sq);
  const attackers = pushed.attackers(next as Sq, them);
  if (attackers.some((s) => pushed.get(s)?.type === 'p')) return null;
  if (pushed.attackers(next as Sq, mv.color).length < attackers.length) return null;
  const VALUE: Record<string, number> = { n: 3, b: 3, r: 5, q: 9 };
  const r = Number(next[1]) + dir;
  let hit: { sq: string; type: string } | null = null;
  for (const df of [-1, 1]) {
    const file = String.fromCharCode(next.charCodeAt(0) + df);
    if (file < 'a' || file > 'h') continue;
    const sq = `${file}${r}`;
    const c = after.get(sq as Sq);
    if (!c || c.color === mv.color || !(c.type in VALUE)) continue;
    if (!hit || VALUE[c.type] > VALUE[hit.type]) hit = { sq, type: c.type };
  }
  return hit ? { next, target: hit } : null;
}

/** The prepared kick lands on a PINNER: the pin it would break, read on the
 *  board after the move (the pin still stands there — the kick is next). */
export function kickBreaksPin(after: Chess, kick: { target: { sq: string } }, mover: 'w' | 'b'): PinAgainst | null {
  return pinsAgainst(after.fen(), mover).find((p) => p.pinner === kick.target.sq) ?? null;
}
