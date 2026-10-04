// TRIGGER → SCAN (WO-TEACH-GAPS P3 method beat, beyond the forcing scan). A
// tactic starts from a TRIGGER on the board — here, a loose piece: one of
// theirs with no defender. The habit is to spot the trigger first, then scan
// for a move that hits it. Earned only when the engine's best move is QUIET
// (the forcing scan already covers checks and captures) and it lands a new
// attack on that loose piece — so the trigger is proven to matter. Names the
// trigger, never the move. A LEAF: chess.js only.
import { Chess, type Color } from 'chess.js';
import { findLoosePieces } from './loosePieces';

const NAME: Record<string, string> = { n: 'knight', b: 'bishop', r: 'rook', q: 'queen', p: 'pawn' };

/** "their bishop on b5", or null. `bestSan` = the engine's move for the side to move. */
export function looseTrigger(fen: string, bestSan: string | null): string | null {
  if (!bestSan || /[x+#]/.test(bestSan) || bestSan.startsWith('O')) return null;
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const me: Color = c.turn();
  const foe: Color = me === 'w' ? 'b' : 'w';
  const loose = findLoosePieces(c, foe).filter((p) => p.value >= 3);
  if (loose.length === 0) return null;
  let mv;
  try { mv = c.move(bestSan); } catch { return null; }
  for (const p of loose) {
    const now = c.attackers(p.square, me);
    if (now.includes(mv.to)) return `their ${NAME[p.type] ?? 'piece'} on ${p.square}`;
  }
  return null;
}
