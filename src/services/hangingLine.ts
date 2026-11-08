// hangingLine — A PIECE NOTHING GUARDS, said one way on every surface
// (WO-DEPTH-01, David 2026-11-08: one wording per idea).
//
// Learn said "Careful — your knight on c3 is attacked and nothing's defending
// it"; Review, on the same kind of board, said "Your knight on c3 is now
// hanging" or "has lost its last defender" — two coaches for one fact. This is
// the one producer. It keeps Review's distinction (a guard just LOST is a
// different lesson from a piece newly HIT) and Learn's reason (nothing guards
// it, so taking it costs nothing), and ends on what it means for whoever is to
// move: the owner can still save it, the other side takes it for nothing.
//
// PURE: chess.js.
import { Chess, type Color, type Square } from 'chess.js';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { andList } from '../utils/andList';
import { openSentence } from '../utils/openSentence';

/** Did the piece on `square` stand there guarded before the move that left it
 *  hanging? A guard LOST is "lost its last guard"; a piece that never had one
 *  and is newly hit is "hanging" (review walk 2026-10-04, G3 37…Kc7). */
export function lostLastGuard(fenBefore: string, square: string): boolean {
  try {
    const b = new Chess(fenBefore);
    const at = b.get(square as Square);
    return !!at && b.attackers(square as Square, at.color).length > 0;
  } catch { return false; }
}

export interface HangingLineInput {
  /** The board the pieces hang on (the line is said there). */
  fen: string;
  /** The hanging pieces' squares — one side's pieces. */
  squares: readonly string[];
  /** The student's colour, or null when no seat is known. */
  viewer: Color | null;
  /** The pieces had a guard before the move and lost it (`lostLastGuard`). */
  lostGuard: boolean;
  /** Said again after the student moved and left it (Learn's `looseClaim`). */
  still: boolean;
}

/**
 * The sentence, or null when the board holds no such piece. Three phrasings,
 * rotated on the board (never rolled); the "still" line stays word-for-word —
 * it is the same moment said again.
 */
export function hangingLine(i: HangingLineInput): string | null {
  let board: Chess;
  try { board = new Chess(i.fen); } catch { return null; }
  const first = board.get(i.squares[0] as Square);
  if (!first) return null;
  const owner: 'your' | 'their' | null = i.viewer ? (first.color === i.viewer ? 'your' : 'their') : null;
  const COLOUR = first.color === 'w' ? 'White\'s' : 'Black\'s';
  const NOUN: Record<string, string> = { n: 'knight', b: 'bishop', r: 'rook', q: 'queen', p: 'pawn', k: 'king' };
  // The piece AND its square, every time (a warning is specific): "your bishop
  // on f4", "their rook on d1". Several are one side's: "your knight on c3 and
  // bishop on d3".
  const whose = owner ?? COLOUR;
  const names = i.squares.map((sq, k) => `${k === 0 ? `${whose} ` : ''}${NOUN[board.get(sq as Square)?.type ?? ''] ?? 'piece'} on ${sq}`);
  const many = names.length > 1;
  const lead = openSentence(andList(names));
  const it = many ? 'them' : 'it';
  const is = many ? 'are' : 'is';
  const has = many ? 'have' : 'has';
  const its = many ? 'their' : 'its';
  if (i.still) return `${lead} ${is} still hanging — nothing guards ${it} yet.`;
  const ownerToMove = board.turn() === first.color;
  // What it means for whoever is to move.
  const taker = owner === 'your' ? 'them' : owner === 'their' ? 'you' : null;
  const free = taker ? `Taking ${it} costs ${taker} nothing` : `${openSentence(it)} can be taken for nothing`;
  const save = owner === 'their'
    ? `They have to move ${it} or guard ${it}.`
    : `${many ? 'They are' : 'It is'} lost unless ${it} ${many ? 'move or get' : 'moves or gets'} a guard.`;
  const after = ownerToMove ? save : `${free}.`;
  const key = stemKeyOf(`${i.fen.split(' ')[0]}|${i.squares.join(',')}`);
  const stems = i.lostGuard
    ? [
      `${lead} ${has} lost ${its} last guard. ${after}`,
      `${lead} just lost ${its} last defender, and nothing guards ${it} now. ${after}`,
      `Nothing guards ${andList(names)} any more. ${after}`,
    ]
    : [
      `${owner === 'your' ? 'Careful — ' : ''}${owner === 'your' ? andList(names) : lead} ${is} hanging. Nothing guards ${it}, so ${free.charAt(0).toLowerCase()}${free.slice(1)}.`,
      `${lead} ${is} hanging: nothing guards ${it}. ${after}`,
      `${lead} ${is} hit, and nothing guards ${it}. ${after}`,
    ];
  return rotateStem(stems, key);
}
