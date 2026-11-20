// queenlessMate — THE QUEENS ARE OFF, AND THERE IS STILL A MATE (Danya have-check, 2026-11-19).
//
// Danya (how-to-avoid-blunders-part-1#4, 1…Nxf4#): "…Nxf4 was missed by a
// strong grandmaster at the top of her game! Once again, a feeling of immunity
// (my king cannot be in danger since the queens are off!) leads to
// carelessness". The mate reads say a mate is there; the habit — run the
// checkmate check even with the queens gone — had no trigger.
//
// The trigger, chess.js only (G0): no queen on the board, and a move that
// mates at once — the side to move's (its own mate in one), or the other
// side's, handed the move (the null move: the mate they threaten). The habit
// is said with the mate it would have caught. Both seats.
import { unmarked } from '../utils/sanMark';
import { Chess, type Color, type Square } from 'chess.js';
import { mateThreatsAgainst } from './threatOut';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

export interface QueenlessMate { side: Color; mate: string; text: string; squares: Square[] }

export function queenlessMate(fen: string, student: Color): QueenlessMate | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  if (c.findPiece({ type: 'q', color: 'w' }).length || c.findPiece({ type: 'q', color: 'b' }).length) return null;
  const toMove = c.turn();
  const key = stemKeyOf(`${fen}|queenless-mate`);
  const own = c.moves({ verbose: true }).find((m) => m.san.endsWith('#'));
  if (own) {
    const san = unmarked(own.san);
    const you = toMove === student;
    const text = you
      ? rotateStem([
        `The queens are off, but that is no reason to stop looking for mate: ${san} is checkmate.`,
        `No queens on the board, and still a mate in one: ${san}. Run the checkmate check every move, queens or not.`,
      ], key)
      : rotateStem([
        `The queens are off, but your king is not safe: ${san} would be checkmate for them.`,
        `With the queens gone it's easy to relax, and that is when mates get missed: they have ${san}, checkmate.`,
      ], key);
    return { side: toMove, mate: own.san, text, squares: [own.from, own.to] };
  }
  const threat = mateThreatsAgainst(fen, toMove).moves[0];
  if (!threat) return null;
  const san = unmarked(threat.san);
  const you = toMove === student;
  const text = you
    ? rotateStem([
      `The queens are off, but your king can still be mated: they threaten ${san}, checkmate. Deal with that first.`,
      `No queens, and still a mate threat against you: ${san}. Run the checkmate check every move, queens or not.`,
    ], key)
    : rotateStem([
      `The queens are off, and you threaten ${san}, checkmate. Endgames have mates too.`,
      `No queens on the board, yet ${san} would be mate for you if they don't see it. Keep the checkmate check running.`,
    ], key);
  return { side: toMove === 'w' ? 'b' : 'w', mate: threat.san, text, squares: [threat.from as Square, threat.to as Square] };
}
