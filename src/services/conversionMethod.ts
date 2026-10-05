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
import { Chess, type Square } from 'chess.js';
import { describeStructure } from './boardStructure';
import { findHangingBySee, captureRead } from './positionReadingService';
import { homeMinorCount } from './development';
import { MATERIAL_VALUE } from './pieceValues';
import { countKingAttack } from './kingSafety';
import { boardEdgeWords } from '../utils/countWords';

export type ConversionStep = 'finish-development' | 'attack-king' | 'trade-pieces' | 'make-passer' | 'escort-passer' | 'cut-off-king';

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
  // …BUT ONLY WHAT CANNOT BE SAVED (claim check 2026-09-27: "you're a piece
  // up" a queen up, because the rook on e4 was attacked — on the student's own
  // move, where it simply steps away). On their move the biggest hang is owed;
  // on the student's move only the SECOND biggest, since one piece can be saved.
  // A hanging piece counts as SAVED when, on the student's move, it has a move
  // that does not lose material: to a safe square, or a trade that takes back
  // at least what it gives (the 1380 rook on d8 trades itself with Rxf8+). A
  // saving move WITH CHECK buys a second save, since the opponent must answer
  // the check first (claim check: Rxe1+ then the queen steps away — "a piece
  // up" said a queen up, engine +7).
  const hangs = findHangingBySee(fen).filter((h) => h.color === student).sort((x, y) => y.gain - x.gain);
  const rescue = (sq: string): { ok: boolean; check: boolean } => {
    let ok = false; let check = false;
    for (const m of c.moves({ square: sq as Square, verbose: true })) {
      try {
        c.move(m);
        const lost = captureRead(c.fen(), m.to, c.turn());
        const net = lost === null ? -1 : (m.captured ? MATERIAL_VALUE[m.captured] ?? 0 : 0) - lost;
        const gives = c.inCheck();
        c.undo();
        if (net >= 0) { ok = true; if (gives) check = true; }
      } catch { /* illegal on this board */ }
    }
    return { ok, check };
  };
  const studentToMove = c.turn() === student;
  let lost = hangs;
  if (studentToMove && hangs.length) {
    const reads = hangs.map((h) => ({ h, ...rescue(h.square) }));
    const tempo = reads.find((r) => r.ok && r.check);
    const rest = reads.filter((r) => r !== tempo);
    const saved = new Set<typeof hangs[number]>();
    if (tempo) saved.add(tempo.h);
    if (rest[0]?.ok) saved.add(rest[0].h);
    lost = hangs.filter((h) => !saved.has(h));
  }
  const owed = Math.max(0, lost[0]?.gain ?? 0);
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
  if (homeMinorCount(c, student) >= 2 || (!castled && theirPieces >= 3)) {
    step = 'finish-development';
    text = `You're ${boardEdgeWords(c.fen(), student, edge)} up — before any plan, finish developing and get your king safe. Up material, the only way to lose is to get careless.`;
  } else if (theirPieces === 0 && theirPawns === 0) {
    step = 'cut-off-king';
    const heavy = (['q', 'r'] as const).find((t) => c.board().some((row) => row.some((x) => x && x.color === student && x.type === t)));
    text = heavy
      ? `Their king is alone — cut it off: put your ${heavy === 'q' ? 'queen' : 'rook'} on a file or rank it can't cross, then drive it to the edge and mate.`
      : `Their king is alone — drive it to the edge with your king and pieces together, then mate.`;
  } else if (kingOpen(c, student)) {
    // THE CHOICE (census #9 — "when ahead: trade, attack or convert"). Ahead AND
    // their king is short of defenders: trading would let it off the hook.
    const k = countKingAttack(c, student);
    step = 'attack-king';
    text = `You're ${boardEdgeWords(c.fen(), student, edge)} up and their king is short of defenders — ${k?.attackers.size ?? 0} of your pieces on it against ${k?.defenders.size ?? 0}. Don't cash in with trades yet: the attack is the fastest win.`;
  } else if (theirPieces >= 2) {
    step = 'trade-pieces';
    text = `You're ${boardEdgeWords(c.fen(), student, edge)} up — trade pieces, not pawns. Every piece that comes off makes your extra material count for more.`;
  } else if (!passer) {
    step = 'make-passer';
    text = `You're ${boardEdgeWords(c.fen(), student, edge)} up with few pieces left — now make a passed pawn. The extra material wins by making a new queen, not by hunting the king.`;
  } else {
    step = 'escort-passer';
    // "and pieces" only when there are pieces — a pawn ending escorts with the
    // king alone (hand walk 2026-09-27).
    const escorts = pieces(student) > 0 ? 'your king and pieces' : 'your king';
    text = `Your passed pawn on ${passer} is the win — push it, with ${escorts} escorting it one safe square at a time.`;
  }
  return { step, edge, passer, text };
}

/** Their king is the target: your queen is on, at least three of your pieces
 *  bear on it and they outnumber its defenders. */
function kingOpen(c: Chess, student: 'w' | 'b'): boolean {
  const hasQueen = c.board().some((row) => row.some((x) => x?.type === 'q' && x.color === student));
  if (!hasQueen) return false;
  const k = countKingAttack(c, student);
  return !!k && k.attackers.size >= 3 && k.attackers.size > k.defenders.size;
}


