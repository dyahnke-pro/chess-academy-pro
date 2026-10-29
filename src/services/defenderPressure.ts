// defenderPressure — THE MOVE GOES AFTER THE GUARD (lesson voice, WO-THINK-01
// P4: the written note for the Ruy's Bb5 says "White does not attack the pawn.
// White attacks its defender — the c6-knight", where the computed line said
// "it bears down on c4").
//
// A tie the mover already holds (`tiedDefender.findTiedDefenders`: a guard
// that, lifted off the board, lets the mover win what it guards) and THIS move
// puts a piece on that guard. That is the classical pressure on the defender.
// It is said as the idea, never as a win: the tie is proven by the counts on
// the board; whether taking the guard wins the target is the line's business,
// and the Ruy proves it often is not yet (…Qd4 after Bxc6 dxc6 Nxe5).
//
// Seat words are the mover's. Pure: chess.js and the legal SEE.
import { Chess, type Move, type PieceSymbol } from 'chess.js';
import { findTiedDefenders } from './tiedDefender';
import { PIECE_NAMES } from '../types/tacticTypes';

const NAME = PIECE_NAMES as Readonly<Record<PieceSymbol, string>>;

export interface DefenderPressure {
  /** The idea's key, so a lesson says it in full once and refers back after
   *  (`phraseMemory.sayIdea`): Bb5 then Ba4 keep the same pressure. */
  key: string;
  /** For a sentence that already names the move ("You play Bb5, going after
   *  …"): the full form first, then the shorter references. */
  clauses: string[];
  /** The same idea as whole sentences with the moved piece as their subject
   *  ("The bishop goes after …"), for the board teacher Learn reads. */
  sentences: string[];
  /** The squares the idea names: the guard, what it guards, the piece of
   *  the mover's that already hits it. */
  squares: string[];
}

/** The guard this move goes after, or null. A capture is its own point (the
 *  trade is said by the capture clauses), so it never counts. */
export function defenderPressure(fenBefore: string, san: string, moverIsStudent: boolean): DefenderPressure | null {
  let board: Chess;
  let mv: Move;
  try {
    board = new Chess(fenBefore);
    mv = board.move(san);
    if (mv.captured) return null;
  } catch {
    return null;
  }
  const { to, color: mover } = mv;
  // Only a guard the moved piece now hits — the pressure is THIS move's.
  for (const tie of findTiedDefenders(board.fen(), mover)) {
    if (!board.attackers(tie.defender.square, mover).includes(to)) continue;
    const hitters = board.attackers(tie.target.square, mover).filter((s) => s !== to);
    const hitterSq = hitters[0];
    const hitterPiece = hitterSq ? board.get(hitterSq) : null;
    if (!hitterSq || !hitterPiece) continue;
    const own = moverIsStudent ? 'your' : 'their';
    const theirs = moverIsStudent ? 'their' : 'your';
    const guard = `the ${NAME[tie.defender.piece]} on ${tie.defender.square}`;
    const target = tie.target.piece === 'p' ? `${theirs} pawn on ${tie.target.square}` : `${theirs} ${NAME[tie.target.piece]} on ${tie.target.square}`;
    const hitter = `${own} ${NAME[hitterPiece.type]} on ${hitterSq}`;
    const piece = `The ${NAME[mv.piece]}`;
    return {
      key: `pressure-${tie.defender.square}-${tie.target.square}`,
      clauses: [
        `going after ${guard}, the guard of ${target}, which ${hitter} hits`,
        `still going after ${guard}, the guard of ${tie.target.square}`,
        `keeping the pressure on ${guard}`,
      ],
      sentences: [
        `${piece} goes after ${guard}, the guard of ${target}, which ${hitter} hits.`,
        `${piece} keeps going after ${guard}, the guard of ${tie.target.square}.`,
        `${piece} keeps the pressure on ${guard}.`,
      ],
      squares: [tie.defender.square, tie.target.square, hitterSq],
    };
  }
  return null;
}
