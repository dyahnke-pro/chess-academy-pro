// squareRole — WHAT A SQUARE IS FOR (David 2026-10-15: "Start replacing
// descriptions with teachings. That is how we keep narrations from running
// away"). "The knight now fights for d5" says what a piece touches; the
// teaching is why that square matters, read on the board:
//   - their pawn's next step       → "holding back their d-pawn"
//   - a hole no pawn of theirs can ever cover → "a square no pawn of theirs can ever cover"
//   - a square their piece wants   → "keeping their knight off it"
// No role → no clause: a square without a reason is scenery, and is not said.
// Leaf: chess.js only.
import type { Chess, Color, Square } from 'chess.js';

const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** `owner` is how the OTHER side's pieces are said from the speaker's seat:
 *  'their' to the student about the opponent, 'your' about the student, 'the'
 *  where the line names no seat. Required, so a caller decides its seat. */
export function squareRole(chess: Chess, sq: Square, me: Color, owner: 'their' | 'your' | 'the'): string | null {
  const them: Color = me === 'w' ? 'b' : 'w';
  const file = sq[0];
  const rank = Number(sq[1]);
  // An occupied square is a piece to attack or defend — another lesson.
  if (chess.get(sq)) return null;
  // THEIR PAWN'S NEXT STEP: a pawn of theirs one square behind (or two, from
  // its start rank with the way clear).
  const back = them === 'w' ? -1 : 1;
  const one = `${file}${rank + back}` as Square;
  const p1 = chess.get(one);
  if (p1 && p1.type === 'p' && p1.color === them) return `holding back ${owner} ${file}-pawn`;
  const two = `${file}${rank + 2 * back}` as Square;
  const p2 = chess.get(two);
  const startRank = them === 'w' ? 2 : 7;
  if (!p1 && p2 && p2.type === 'p' && p2.color === them && Number(two[1]) === startRank) return `holding back ${owner} ${file}-pawn`;
  // A HOLE: no pawn of theirs on a neighbouring file can ever reach a square that attacks it.
  let coverable = false;
  for (const df of [-1, 1]) {
    const f = String.fromCharCode(sq.charCodeAt(0) + df);
    if (f < 'a' || f > 'h') continue;
    for (let r = 1; r <= 8; r++) {
      const p = chess.get(`${f}${r}` as Square);
      // Their pawn must stand BEHIND the square (from their side) to attack it later.
      if (p && p.type === 'p' && p.color === them && (them === 'w' ? r < rank : r > rank)) coverable = true;
    }
  }
  // A hole is a square in the middle of the board: the back ranks are never
  // covered by pawns, and saying so teaches nothing.
  if (!coverable && rank >= 3 && rank <= 6) return owner === 'your' ? 'a square no pawn of yours can ever cover' : owner === 'their' ? 'a square no pawn of theirs can ever cover' : 'a square no enemy pawn can ever cover';
  // A SQUARE THEIR PIECE WANTS: one of their minor or major pieces reaches it.
  const wants = chess.attackers(sq, them).map((s) => chess.get(s)).find((p) => p && p.type !== 'p' && p.type !== 'k');
  if (wants) return `keeping ${owner} ${NAME[wants.type]} off it`;
  return null;
}
