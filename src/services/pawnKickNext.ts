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
// A LEAF: chess.js and the one pin test.
import { Chess, type Move } from 'chess.js';
import { findPins } from './pinGeometry';

type Sq = Parameters<Chess['get']>[0];

/** A pin against `color`: the enemy slider on `pinner`, `color`'s piece on
 *  `pinned`, and the costlier piece (or king) on `behind`. */
export interface PinAgainst { pinner: string; pinned: string; behind: string }

/** Every pin against `color` a coach would name — read by the ONE test of a
 *  pin (`pinGeometry.findPins` → `isRealPin`): the piece behind is worth more,
 *  the piece in front can leave the line, it cannot simply take the pinner,
 *  and stepping off the line costs something (the king behind, a piece worth
 *  more than the pinner, or one nothing else guards).
 *
 *  This was a walk of its own with a weaker test, and the board teacher's
 *  unpin read it (task 172, 2026-11-11): "Bf4 unpins their pawn on a2" (a
 *  pawn on its own file in front of its rook — its pushes never leave the
 *  line), "Qd2 unpins their pawn on e4" (the same, on the e-file), "…dxc6
 *  unpins your pawn on b7" (a pawn that could take the bishop "pinning" it). */
export function pinsAgainst(fen: string, color: 'w' | 'b'): PinAgainst[] {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return []; }
  return findPins(chess)
    .filter((p) => p.beneficiary !== color)
    .map((p) => ({ pinner: p.involvedSquares[0], pinned: p.involvedSquares[1], behind: p.involvedSquares[2] }));
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
  // A PUSH THE PAWN COULD ALREADY PLAY IS NOT PREPARED (Learn replay of his
  // King's Indian, 2026-11-08: "c6 prepares c5, which would kick their
  // knight on d4" — …c5 was there from c7 in one move).
  try { if (new Chess(mv.before).moves({ square: mv.from, verbose: true }).some((m) => m.to === next)) return null; } catch { /* the board before is the move's own */ }
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
