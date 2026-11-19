// kingBox — THE BOX: how many squares the lone king has left (Danya have-check, 2026-11-19).
//
// Danya, "The Art of Time Management": the side-check method of mating with a
// rook works but is slow; "a faster box method is safer with seconds left" —
// the rook draws a box around the king along its file and rank, and every good
// move makes the box smaller. `conceptEngine` names the basic mate and its
// cut-off method in words; nothing COUNTED the box, so the coach could not say
// whether a rook move shrank it.
//
// The read, chess.js only: a bare king against a king and a rook or queen. The
// king's BOX is the rectangle the heavy piece's file and rank shut it into —
// the files on the king's side of the piece's file and the ranks on its side of
// the piece's rank (a king standing on that file or rank is not boxed that
// way). `kingBoxMove` compares the box before and after a move and speaks when
// the move shrinks it and leaves the piece safe (not hanging to the king).
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';

export interface KingBox { files: number; ranks: number; area: number; piece: Square; pieceType: PieceSymbol }
export interface KingBoxMove { before: KingBox; after: KingBox; text: string; squares: Square[] }

const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

function lone(c: Chess): { attacker: Color; king: Square; heavy: { square: Square; type: PieceSymbol }[] } | null {
  const pieces = c.board().flat().filter((p): p is NonNullable<typeof p> => !!p);
  for (const side of ['w', 'b'] as Color[]) {
    const def = pieces.filter((p) => p.color === side);
    if (def.length !== 1) continue;
    const att = pieces.filter((p) => p.color !== side && p.type !== 'k');
    if (!att.length || att.some((p) => p.type !== 'r' && p.type !== 'q')) return null;
    return { attacker: side === 'w' ? 'b' : 'w', king: def[0].square, heavy: att.map((p) => ({ square: p.square, type: p.type })) };
  }
  return null;
}

/** The smallest box any of the attacker's rooks or queens draws around the lone king; null when it is not that ending. */
export function kingBox(fen: string): KingBox | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const l = lone(c);
  if (!l) return null;
  const kf = l.king.charCodeAt(0) - 97;
  const kr = Number(l.king[1]);
  let best: KingBox | null = null;
  for (const h of l.heavy) {
    const pf = h.square.charCodeAt(0) - 97;
    const pr = Number(h.square[1]);
    const files = pf === kf ? 8 : kf < pf ? pf : 7 - pf;
    const ranks = pr === kr ? 8 : kr < pr ? pr - 1 : 8 - pr;
    const box: KingBox = { files, ranks, area: files * ranks, piece: h.square, pieceType: h.type };
    if (!best || box.area < best.area) best = box;
  }
  return best;
}

/** A move that makes the lone king's box smaller with the boxing piece safe, or null. */
export function kingBoxMove(fen: string, san: string,
  /** REQUIRED: the student's seat — the boxing side is "you" or "they". */
  student: Color): KingBoxMove | null {
  const before = kingBox(fen);
  if (!before) return null;
  const c = new Chess(fen);
  let m;
  try { m = c.move(san); } catch { return null; }
  const after = kingBox(c.fen());
  if (!after || after.area >= before.area) return null;
  // The boxing piece must not hang to the lone king.
  const them: Color = m.color === 'w' ? 'b' : 'w';
  const hits = c.attackers(after.piece, them).length > 0;
  if (hits && c.attackers(after.piece, m.color).length === 0) return null;
  const text = m.color === student
    ? `${san} shrinks their king's box from ${before.area} squares to ${after.area} — your ${NAME[after.pieceType]} on ${after.piece} shuts it into ${after.files} files and ${after.ranks} ranks. Make the box smaller every move, and bring your king up when the ${NAME[after.pieceType]} needs a guard.`
    : `Their ${san} shrinks your king's box from ${before.area} squares to ${after.area} — their ${NAME[after.pieceType]} on ${after.piece} shuts it into ${after.files} files and ${after.ranks} ranks. Keep your king in the middle of the box, as far from the edge as it can get.`;
  return { before, after, text, squares: [after.piece] };
}
