import { Chess } from 'chess.js';

/**
 * The position with the move handed to the other side — "what if THEY play d5"
 * asked on the student's own turn (question walk 2026-09-27: the coach answered
 * as the student's d5). The question is "what if they got that move in", so the
 * honest board is this one with the turn flipped and any en-passant square
 * cleared. Null when the side to move is in check: they do not get a free move
 * then, and pretending otherwise would answer a position that cannot occur.
 */
export function tempoFen(fen: string): string | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  if (c.inCheck()) return null;
  const parts = fen.split(' ');
  parts[1] = parts[1] === 'w' ? 'b' : 'w';
  parts[3] = '-';
  const flipped = parts.join(' ');
  try { new Chess(flipped); } catch { return null; }
  return flipped;
}

/** The board on which the opponent's named move is played: the live one when
 *  it is already their turn, the tempo-flipped one when it is the student's. */
export function opponentMoveBoard(fen: string, studentColor: 'white' | 'black'): string | null {
  const turn = fen.split(' ')[1];
  const studentTurn = studentColor === 'white' ? 'w' : 'b';
  return turn === studentTurn ? tempoFen(fen) : fen;
}
