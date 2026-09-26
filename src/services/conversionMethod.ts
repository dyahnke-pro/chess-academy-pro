// conversionMethod — HOW TO WIN A WON GAME, one step at a time (WO-LAYERS-01
// step 5).
//
// The app DIAGNOSES a botched conversion (`botched-conversion`,
// `conversionDetector`) and, when a game is decided, said only "This is
// technique now — convert it cleanly, no heroics." That names the task and
// teaches nothing. Naroditsky, to an 800 with an extra piece, gives the METHOD
// as a sequence and says which step the board is on:
//   1. finish development and castle — "they're up a piece and forget the
//      fundamentals";
//   2. trade pieces, not pawns — "trade as many pieces as possible without
//      spoiling anything";
//   3. make a passed pawn — "use the extra material to make a new queen";
//   4. escort it home — king and rook behind it, one safe square at a time;
//   5. cut off the lone king — "occupy a file the king can't cross", then mate.
//
// This returns the ONE step the board is on, board-true (chess.js +
// `describeStructure`), or null when the mover is not clearly ahead. No
// engine; the eval gate belongs to the caller that already holds one.
import { Chess } from 'chess.js';
import { describeStructure } from './boardStructure';
import { findHangingBySee } from './positionReadingService';

export type ConversionStep = 'finish-development' | 'trade-pieces' | 'make-passer' | 'escort-passer' | 'cut-off-king';

export interface ConversionRead {
  step: ConversionStep;
  /** Material edge, in pawns, from the student's side. */
  edge: number;
  /** The student's passed pawn the step is about, when it has one. */
  passer: string | null;
  text: string;
}

/** Ahead by at least a minor piece's worth — below that it is an edge, not a
 *  won game, and the method would be the wrong advice. */
export const CONVERSION_EDGE = 3;


function undevelopedMinors(c: Chess, side: 'w' | 'b'): number {
  const home = side === 'w' ? ['b1', 'g1', 'c1', 'f1'] : ['b8', 'g8', 'c8', 'f8'];
  return home.filter((sq) => {
    const p = c.get(sq as 'a1');
    return !!p && p.color === side && (p.type === 'n' || p.type === 'b');
  }).length;
}

export function readConversion(fen: string, student: 'w' | 'b'): ConversionRead | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const s = describeStructure(fen);
  if (!s) return null;
  const raw = student === 'w' ? s.material.balance : -s.material.balance;
  // SETTLED, not counted mid-exchange (re-walk 1380, 13.Rxd8 Qe7: "You're a
  // rook up" with the rook on d8 about to be taken back). Take off the most
  // the opponent wins by capturing a student piece now — the undercount is
  // deliberate: a smaller edge costs a sentence, a bigger one is a false claim.
  const owed = Math.max(0, ...findHangingBySee(fen).filter((h) => h.color === student).map((h) => h.gain));
  const edge = raw - owed;
  if (edge < CONVERSION_EDGE) return null;
  const them: 'w' | 'b' = student === 'w' ? 'b' : 'w';
  const pieces = (side: 'w' | 'b'): number => {
    let n = 0;
    for (const row of c.board()) for (const x of row) if (x && x.color === side && x.type !== 'k' && x.type !== 'p') n += 1;
    return n;
  };
  const theirPieces = pieces(them);
  const theirPawns = (() => { let n = 0; for (const row of c.board()) for (const x of row) if (x && x.color === them && x.type === 'p') n += 1; return n; })();
  const passer = s.pawns.passedPawns[student][0] ?? null;
  const castled = s.kings.kingWing[student] !== 'center';

  let step: ConversionStep;
  let text: string;
  if (undevelopedMinors(c, student) >= 2 || (!castled && theirPieces >= 3)) {
    step = 'finish-development';
    text = `You're ${edgeWords(edge)} up — before any plan, finish developing and get your king safe. Up material, the only way to lose is to get careless.`;
  } else if (theirPieces === 0 && theirPawns === 0) {
    step = 'cut-off-king';
    const heavy = (['q', 'r'] as const).find((t) => c.board().some((row) => row.some((x) => x && x.color === student && x.type === t)));
    text = heavy
      ? `Their king is alone — cut it off: put your ${heavy === 'q' ? 'queen' : 'rook'} on a file or rank it can't cross, then drive it to the edge and mate.`
      : `Their king is alone — drive it to the edge with your king and pieces together, then mate.`;
  } else if (theirPieces >= 2) {
    step = 'trade-pieces';
    text = `You're ${edgeWords(edge)} up — trade pieces, not pawns. Every piece that comes off makes your extra material count for more.`;
  } else if (!passer) {
    step = 'make-passer';
    text = `You're ${edgeWords(edge)} up with few pieces left — now make a passed pawn. The extra material wins by making a new queen, not by hunting the king.`;
  } else {
    step = 'escort-passer';
    text = `Your passed pawn on ${passer} is the win — push it, with your king and pieces escorting it one safe square at a time.`;
  }
  return { step, edge, passer, text };
}

function edgeWords(edge: number): string {
  if (edge >= 9) return 'a queen';
  if (edge >= 5) return 'a rook';
  return 'a piece'; // readConversion never calls below CONVERSION_EDGE
}

