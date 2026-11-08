// THE MARKS OF A SPOKEN LINE, ANCHORED TO THE WORDS THAT NAME THEM (David
// 2026-11-08: "Make sure ALL stated squares pieces moves are covered. Key
// squares get highlights, moves get arrowed, lines get multiple arrows … and
// they ALL appear AS THEY ARE STATED!").
//
// One builder for every surface that speaks over a board. A surface hands in
// the marks its facts carry — squares to light, moves to arrow, lines to draw —
// and gets the items `markPacing.scheduleMarks` places on the voice's clock:
// a square at the first word that names it (its coordinate, or its piece by
// the one namer's words — "their queen", "your f-pawn"), a move at its squares
// or its piece, a line's moves in order, each at its own words or right after
// the move before it. What a mark IS stays the producer's (G0, the facts'
// squares and lines); this decides only WHEN it goes up.
import { Chess, type Square } from 'chess.js';
import { pieceRef } from './pieceRef';
import type { PacedMark } from './markPacing';

const NAME: Record<string, string> = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };

/** The words a piece on `square` is said by, longest first: the one namer's
 *  ("their dark-squared bishop", "your knight on c3", "your f-pawn") and its
 *  shorter forms ("their bishop", "the bishop", "the f-pawn"). Empty when the
 *  square is empty or the board does not load. */
export function pieceWords(fen: string, square: string, viewer: 'w' | 'b'): string[] {
  const ref = pieceRef(fen, square, viewer);
  if (!ref) return [];
  let piece;
  try { piece = new Chess(fen).get(square as Square); } catch { return []; }
  if (!piece) return [];
  const owner = piece.color === viewer ? 'your' : 'their';
  const name = NAME[piece.type];
  const out = new Set<string>([ref.words, ref.words.replace(/ on [a-h][1-8]$/, '')]);
  if (piece.type === 'p') {
    out.add(`${owner} ${square[0]}-pawn`);
    out.add(`the ${square[0]}-pawn`);
  }
  out.add(`${owner} ${name}`);
  out.add(`the ${name}`);
  return [...out].sort((a, b) => b.length - a.length);
}

export interface MarkMove {
  from: string;
  to: string;
  /** The board the move is played on (its piece's words); the shown board when absent. */
  fen?: string;
  /** The sentence of the fact the move belongs to (the fallback anchor). */
  said?: string;
}

/** A square to light, and the sentence of the fact it belongs to. */
export interface MarkSquare { square: string; said?: string }

/** A line to draw: its moves in order, and the sentence that says it. */
export interface MarkLine { moves: readonly MarkMove[]; said?: string }

export interface MarkSources {
  /** The board the student sees while the words are said. */
  fen: string;
  /** Whose words: "your" pieces are this side's. */
  viewer: 'w' | 'b';
  /** Squares to light, in the order the facts give them. */
  highlights: readonly (string | MarkSquare)[];
  /** Single moves to arrow. */
  arrows: readonly MarkMove[];
  /** Lines to draw, each its moves in order. */
  lines?: readonly MarkLine[];
}

/** Words that announce a move: its piece by name, and a castling move. */
function moveWords(m: MarkMove, fen: string, viewer: 'w' | 'b'): string[] {
  const board = m.fen ?? fen;
  const words = pieceWords(board, m.from, viewer);
  try {
    const p = new Chess(board).get(m.from as Square);
    if (p?.type === 'k' && Math.abs(m.from.charCodeAt(0) - m.to.charCodeAt(0)) === 2) words.unshift('castles', 'castle', 'castling');
  } catch { /* the squares still anchor it */ }
  return words;
}

/**
 * The schedule items for a surface's marks. Ids: `h<i>` for highlights[i],
 * `a<i>` for arrows[i], `l<k>.<i>` for ply i of lines[k] — the caller paints by
 * id. A highlight is announced by its square, then its piece; an arrow by its
 * destination, its origin, then its piece; a line's ply the same, in order,
 * following the ply before it when its words are not said.
 */
export function markItems(src: MarkSources): PacedMark[] {
  const out: PacedMark[] = [];
  const said = (s: string | undefined): { said?: string } => (s ? { said: s } : {});
  src.highlights.forEach((h, i) => {
    const m: MarkSquare = typeof h === 'string' ? { square: h } : h;
    out.push({ id: `h${i}`, squares: [m.square], words: pieceWords(src.fen, m.square, src.viewer), ...said(m.said) });
  });
  src.arrows.forEach((a, i) => out.push({ id: `a${i}`, squares: [a.to, a.from], words: moveWords(a, src.fen, src.viewer), ...said(a.said) }));
  (src.lines ?? []).forEach((line, k) => {
    line.moves.forEach((a, i) => out.push({ id: `l${k}.${i}`, squares: [a.to, a.from], words: moveWords(a, src.fen, src.viewer), group: `l${k}`, ...said(a.said ?? line.said) }));
  });
  return out;
}

/** Is a square stated in these words — its coordinate, or its piece by name?
 *  With no viewer, its piece is looked for from either seat. */
export function squareStated(text: string, square: string, fen: string, viewer: 'w' | 'b' | null): boolean {
  if (new RegExp(`(?<![0-9])${square}(?![0-9])`).test(text)) return true;
  const lower = text.toLowerCase();
  const words = viewer ? pieceWords(fen, square, viewer) : [...pieceWords(fen, square, 'w'), ...pieceWords(fen, square, 'b')];
  return words.some((w) => lower.includes(w.toLowerCase()));
}

/** Is a line stated in these words — any of its moves said? */
function lineStated(text: string, sans: readonly string[]): boolean {
  return sans.some((san) => {
    const bare = san.replace(/^…/, '').replace(/[+#!?]+$/, '');
    return bare.length > 0 && new RegExp(`(?<![A-Za-z0-9])…?${bare.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z0-9])`).test(text);
  });
}

/**
 * THE FADE CUTS THE MARKS WITH THE WORDS (marks sweep 2026-11-08: a weighing
 * shortened to "Bxh7+? That drops the queen on g4." still lit the best line's
 * five squares and drew its arrows — marks with no words, the answer handed
 * over in Learn). A square or a line stated only in the words the fade cut
 * goes; one the kept words state stays; one no words state (a square the fact
 * describes without naming — "only four squares") stays, said with its fact.
 */
export function cutMarksWithWords<L extends { sans: readonly string[] }>(
  full: string,
  kept: string,
  marks: { squares: readonly string[]; lines?: readonly L[] },
  fen: string,
  viewer: 'w' | 'b' | null,
): { squares: string[]; lines?: L[] } {
  if (kept === full) return { squares: [...marks.squares], ...(marks.lines ? { lines: [...marks.lines] } : {}) };
  const cutText = full.startsWith(kept) ? full.slice(kept.length) : full;
  const squares = marks.squares.filter((sq) => squareStated(kept, sq, fen, viewer) || !squareStated(cutText, sq, fen, viewer));
  const lines = marks.lines?.filter((l) => lineStated(kept, l.sans) || !lineStated(cutText, l.sans));
  return { squares, ...(lines ? { lines } : {}) };
}
