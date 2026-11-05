// pieceRef — A PIECE NAMED THE WAY A PERSON NAMES IT (David 2026-11-05: "Instead
// of naming a bunch of squares, can we replace them with arrows and
// highlights? It sounds too robotic." → "We still need to name squares. We
// just need to do it like a human would. If a single square is being named it
// must also be highlighted.").
//
// The coach said "Their queen on b6 pins your pawn on f2 to your king on g1":
// three squares in one breath, read off a board the student is looking at. A
// person says "Their queen pins your f-pawn to your king" and lets the board
// show which. A square is said only where the words alone cannot tell two
// pieces apart (two knights, two rooks, doubled pawns); the board lights every
// square a line is about, said or not, so the eye still lands on it.
//
// The one place a piece gets its spoken name. It always returns the piece's
// square, so the fact that says the name couples it and the board lights it.
//
// PURE: chess.js only.
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';

/** The words for one piece, and the square the board lights for it. */
export interface PieceRef {
  /** "your queen", "their f-pawn", "your dark-squared bishop", "your knight on c3". */
  words: string;
  square: Square;
  /** True when the words had to name the square to tell the piece apart. */
  saysSquare: boolean;
}

const NAME: Record<PieceSymbol, string> = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };

/** Light (true) or dark square. a1 is dark. */
function isLight(sq: Square): boolean {
  return (sq.charCodeAt(0) - 97 + Number(sq[1])) % 2 === 0;
}

/** Every square holding a piece of this type and colour. */
function squaresOf(board: Chess, type: PieceSymbol, color: Color): Square[] {
  const out: Square[] = [];
  for (const row of board.board()) for (const p of row) if (p && p.type === type && p.color === color) out.push(p.square);
  return out;
}

/**
 * The piece on `square`, named from `viewer`'s seat ("your" / "their"). Null
 * when the square is empty or the position does not load.
 */
export function pieceRef(fen: string, square: string, viewer: Color): PieceRef | null {
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  const sq = square as Square;
  const piece = board.get(sq);
  if (!piece) return null;
  const owner = piece.color === viewer ? 'your' : 'their';
  const same = squaresOf(board, piece.type, piece.color);
  const plain = (words: string): PieceRef => ({ words, square: sq, saysSquare: false });
  const withSquare = (words: string): PieceRef => ({ words: `${words} on ${sq}`, square: sq, saysSquare: true });
  if (piece.type === 'k') return plain(`${owner} king`);
  if (piece.type === 'p') {
    // A pawn is its file ("your f-pawn") unless a second pawn of the same
    // colour stands on that file.
    const file = sq[0];
    const onFile = same.filter((s) => s[0] === file);
    return onFile.length === 1 ? plain(`${owner} ${file}-pawn`) : withSquare(`${owner} ${file}-pawn`);
  }
  if (same.length === 1) return plain(`${owner} ${NAME[piece.type]}`);
  if (piece.type === 'b') {
    // Two bishops on different colours are named by their colour.
    const shade = isLight(sq);
    if (same.filter((s) => isLight(s) === shade).length === 1) {
      return plain(`${owner} ${shade ? 'light' : 'dark'}-squared bishop`);
    }
  }
  return withSquare(`${owner} ${NAME[piece.type]}`);
}
