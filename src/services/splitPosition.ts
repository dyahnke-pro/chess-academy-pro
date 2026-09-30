// SPLIT THE POSITION (WO-TEACH-GAPS P3 method beat). When the kings have
// castled on OPPOSITE wings with queens on, the board is two separate games: a
// pawn storm on each side, and the one that arrives first usually decides it.
// The habit is to split the board and judge each half — and to value SPEED
// over a pawn. Earned only by the board: kings on opposite wings (a/b/c vs
// g/h files, each on its home rank), queens still on. Once per game.
// A LEAF: chess.js only.
import { Chess, type Color } from 'chess.js';

export interface SplitPosition { text: string; squares: string[] }

export function splitPosition(fen: string, student: Color): SplitPosition | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const cells = c.board().flat().filter((p): p is NonNullable<typeof p> => !!p);
  if (!cells.some((p) => p.type === 'q' && p.color === 'w') || !cells.some((p) => p.type === 'q' && p.color === 'b')) return null;
  const king = (col: Color): string | undefined => cells.find((p) => p.type === 'k' && p.color === col)?.square;
  const wing = (sq: string | undefined, col: Color): 'queen' | 'king' | null => {
    if (!sq || sq[1] !== (col === 'w' ? '1' : '8')) return null;
    if ('abc'.includes(sq[0])) return 'queen';
    if ('gh'.includes(sq[0])) return 'king';
    return null;
  };
  const foe: Color = student === 'w' ? 'b' : 'w';
  const mine = wing(king(student), student);
  const theirs = wing(king(foe), foe);
  if (!mine || !theirs || mine === theirs) return null;
  return {
    squares: [king(student) as string, king(foe) as string],
    text: `The kings are on opposite wings, so split the board: your pawns go after their king on the ${theirs}side, theirs come at yours on the ${mine}side. It is a race — a tempo matters more than a pawn here.`,
  };
}
