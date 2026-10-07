// obligationLifted — AN OBLIGATION LIFTS (teach-brief §3, "Reading their move":
// "with their bishop back on b3, e5 no longer hangs, so d6 isn't forced:
// castle"). A piece the student had to look after is no longer under fire,
// because THEIR move took an attacker away — so the move it was costing the
// student is free again.
//
// DUAL-USE: the same answer tells the student mid-game that the duty is gone,
// and lets a review see a defending move that was spent after it had stopped
// being needed. PURE: chess.js + the must-defend computer the threat lane uses.
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { computeMustDefend } from './threatOut';

export interface ObligationLifted {
  /** The student's piece that no longer has to be guarded. */
  square: Square;
  piece: PieceSymbol;
  /** Their piece that stopped attacking it, and where it went. */
  from: Square;
  to: Square;
  theirPiece: PieceSymbol;
}

const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/**
 * `fenBefore`: the board their move was played from. `fenAfter`: the board
 * after it, the student to move. Null unless one of the student's pieces was
 * under real fire before (the opponent could have won it) and is not now,
 * still standing on its square, and the piece that moved was one of its
 * attackers and no longer attacks it.
 */
export function obligationLifted(fenBefore: string, fenAfter: string, student: Color): ObligationLifted | null {
  let before: Chess;
  let after: Chess;
  try { before = new Chess(fenBefore); after = new Chess(fenAfter); } catch { return null; }
  if (after.turn() !== student || before.turn() === student) return null;
  // Their move, recovered from the two boards: the square they left.
  let moved: { from: Square; to: Square; piece: PieceSymbol } | null = null;
  for (const m of before.moves({ verbose: true })) {
    const probe = new Chess(fenBefore);
    probe.move(m);
    if (probe.fen().split(' ').slice(0, 4).join(' ') === fenAfter.split(' ').slice(0, 4).join(' ')) {
      moved = { from: m.from, to: m.to, piece: m.piece };
      break;
    }
  }
  if (!moved) return null;
  const was = computeMustDefend(fenBefore, student).pieces;
  if (was.length === 0) return null;
  const now = new Set(computeMustDefend(fenAfter, student).pieces.map((p) => p.square));
  const them: Color = student === 'w' ? 'b' : 'w';
  for (const p of was) {
    const sq = p.square as Square;
    if (now.has(sq)) continue;
    const there = after.get(sq);
    if (!there || there.color !== student) continue;
    // Their move did it: the piece that moved attacked it and attacks it no more.
    if (!before.attackers(sq, them).includes(moved.from)) continue;
    if (after.attackers(sq, them).includes(moved.to)) continue;
    return { square: sq, piece: there.type, from: moved.from, to: moved.to, theirPiece: moved.piece };
  }
  return null;
}

/** The sentence, in the student's seat. */
export function obligationLiftedLine(o: ObligationLifted): string {
  return `Their ${NAME[o.theirPiece]} left ${o.from}, so your ${NAME[o.piece]} on ${o.square} is no longer under fire — you don't have to spend a move guarding it now.`;
}
