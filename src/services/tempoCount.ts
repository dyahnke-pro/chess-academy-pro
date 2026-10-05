// TEMPO, COUNTED (WO-TEACH-GAPS P2 #7). "Develops with tempo" is said already
// (`moveFundamentals`). The half he says and we never did is the COUNT: "that's
// the queen's third move — meanwhile you've got three pieces out". A piece that
// keeps moving in the opening hands the other side free moves, and the board
// can count them.
//
// Their reply moved a non-pawn, non-king piece for the THIRD time or more, still
// inside the opening (≤ 24 plies), and the student has more minor pieces out
// than they do. Never on a capture (it took something). Said once per piece per game — the page's claim ledger holds it.
//
// A LEAF: chess.js over the game's own SAN history.
import { Chess, type Square } from 'chess.js';
import { homeSquaresOf } from './development';

export interface TempoCount {
  text: string;
  /** The square the piece stands on now. */
  squares: string[];
  /** Stable identity of the piece (its starting square), for say-once. */
  pieceId: string;
  moves: number;
}

/** Plies inside which the count is an opening lesson. */
export const TEMPO_OPENING_PLIES = 24;

const NAME: Record<string, string> = { n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };
const ORDINAL = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];
const WORD = ['no', 'one', 'two', 'three', 'four'];

/** `history` = every SAN of the game, ending with THEIR reply. */
export function tempoCount(history: readonly string[], student: 'w' | 'b'): TempoCount | null {
  if (history.length === 0 || history.length > TEMPO_OPENING_PLIES) return null;
  const them: 'w' | 'b' = student === 'w' ? 'b' : 'w';
  const c = new Chess();
  const idAt = new Map<string, string>();
  for (const sq of c.board().flat()) if (sq) idAt.set(sq.square, sq.square);
  const moved = new Map<string, number>();
  let last: { id: string; to: string; piece: string; color: 'w' | 'b'; captured: boolean } | null = null;
  for (const san of history) {
    let m;
    try { m = c.move(san); } catch { return null; }
    const id = idAt.get(m.from) ?? m.from;
    idAt.delete(m.from);
    idAt.set(m.to, id);
    const kside = m.isKingsideCastle();
    if (kside || m.isQueensideCastle()) {
      // Castling moves the rook too; it is development, not a wasted move.
      const rf = m.color === 'w' ? (kside ? 'h1' : 'a1') : (kside ? 'h8' : 'a8');
      const rt = m.color === 'w' ? (kside ? 'f1' : 'd1') : (kside ? 'f8' : 'd8');
      const rid = idAt.get(rf) ?? rf;
      idAt.delete(rf);
      idAt.set(rt, rid);
    }
    moved.set(id, (moved.get(id) ?? 0) + 1);
    last = { id, to: m.to, piece: m.piece, color: m.color, captured: !!m.captured };
  }
  // A capture is not a wasted move — it took something.
  if (!last || last.color !== them || !(last.piece in NAME) || last.captured) return null;
  const n = moved.get(last.id) ?? 0;
  if (n < 3) return null;
  // THE development reading's home squares (`homeSquaresOf`) — never a copy here.
  const minorsOut = (side: 'w' | 'b'): number => [...homeSquaresOf('n', side), ...homeSquaresOf('b', side)].filter((home) => {
    for (const [sq, id] of idAt) if (id === home && sq !== home) return true;
    return false;
  }).length;
  const mine = minorsOut(student);
  const theirs = minorsOut(them);
  if (mine <= theirs) return null;
  const name = NAME[last.piece];
  const text = `That's their ${name}'s ${ORDINAL[n] ?? `${n}th`} move already, and you have ${WORD[mine] ?? mine} minor pieces out to their ${WORD[theirs] ?? theirs} — every extra move with one piece is a move you get for free.`;
  return { text, squares: [last.to as Square], pieceId: last.id, moves: n };
}
