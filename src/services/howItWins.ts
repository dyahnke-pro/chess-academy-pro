import { materialBalance } from './pieceValues';

/**
 * How a clearly winning position with no forced mate wins, as the board says
 * (hard-chat audit 2026-11-08: "convert the material first and the mate will
 * come" in a pawn ending with the material level). Only an extra unit of
 * material is material to convert; a pawn ending without one wins by queening;
 * otherwise the edge is in the position, not in extra pieces.
 */
export function howItWins(fen: string | null | undefined, studentColor: 'white' | 'black'): string {
  const board = (fen ?? '').split(' ')[0] ?? '';
  if (!board) return 'convert the material first and the mate will come';
  const white = materialBalance(board);
  const edge = studentColor === 'black' ? -white : white;
  if (edge >= 1) return 'convert the material first and the mate will come';
  if (!/[nbrqNBRQ]/.test(board)) return 'the material is level, so the win comes from queening a pawn first — the mate comes after that';
  return 'the material is level, so the edge is in the position, not in extra pieces';
}
