// planChoice — HOW THE PLAN WAS FOUND, AND WHY THIS ONE (David 2026-10-15:
// "We need to be able to tell why the computer picked which plan" … "teach the
// user how to think for themselves").
//
// Two reads, both off the board, both shared by every surface through the one
// plan thread:
//
//   THE METHOD — the three questions a strong player asks before choosing a
//   plan (Naroditsky's habit): where is THEIR weakness, which of YOUR pieces is
//   worst, where is YOUR pawn break. Each answer is a board object computed by
//   the computers the plans themselves use, so the method and the plan can
//   never disagree.
//
//   WHY THIS PLAN — the plans come out of `deriveNextPlanFacts` in a fixed
//   order (king, passer, weak pawn, open file, outpost, worst piece, convert,
//   bishop pair). That order is a chess judgement, so its reason is said out
//   loud: what makes the chosen plan's target worth more than the next one's.
//
// Pure: chess.js and the structure computers. No surface imports.
import { Chess, type Color, type Square } from 'chess.js';
import type { PlanFact, PlanKind } from './nextPlans';
import { describeStructure } from './boardStructure';
import { findWorstPlacedPiece, PIECE_NOUN } from './nextPlans';
import { findPawnBreaks, findWeakSquares } from './positionReadingService';
import { enemyKingStuckInCenter } from './reviewSacrifice';
import { orList } from '../utils/andList';
import { THINK_MARK } from '../utils/thinkPause';

export interface MethodRead {
  /** Their weakness, as a phrase ("their king, still on e8", "their isolated pawn on d5"). */
  weakness: { phrase: string; square: string } | null;
  /** The student's worst-placed piece. */
  worst: { phrase: string; square: string } | null;
  /** The student's pawn breaks (squares a pawn can strike). */
  breaks: string[];
}

function flipTo(fen: string, color: Color): string | null {
  try {
    const parts = fen.split(' ');
    parts[1] = color; parts[3] = '-';
    new Chess(parts.join(' '));
    return parts.join(' ');
  } catch { return null; }
}

/** The three questions, answered on this board for the student. */
export function methodRead(fen: string, student: Color): MethodRead | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const enemy: Color = student === 'w' ? 'b' : 'w';
  const struct = describeStructure(fen);
  if (!struct) return null;
  let weakness: MethodRead['weakness'] = null;
  const queensOn = chess.board().some((r) => r.some((c) => c?.type === 'q'));
  const king = chess.board().flat().find((c) => c?.type === 'k' && c.color === enemy);
  if (king && queensOn && enemyKingStuckInCenter(fen, student)) {
    weakness = { phrase: `their king, still on ${king.square}`, square: king.square };
  } else {
    const iso = struct.pawns.isolatedPawns[enemy].find((sq) => 'cdef'.includes(sq[0])) ?? struct.pawns.isolatedPawns[enemy][0];
    if (iso) weakness = { phrase: `their isolated pawn on ${iso}`, square: iso };
    else {
      const holes = findWeakSquares(fen)[enemy === 'w' ? 'white' : 'black'];
      if (holes[0]) weakness = { phrase: `the hole on ${holes[0]} that no pawn of theirs can guard`, square: holes[0] };
    }
  }
  const w = findWorstPlacedPiece(chess, student);
  const worst = w ? { phrase: `your ${PIECE_NOUN[w.type]} on ${w.sq}`, square: w.sq } : null;
  const asMe = chess.turn() === student ? fen : flipTo(fen, student);
  const breaks = asMe ? findPawnBreaks(asMe).map((s) => String(s)) : [];
  if (!weakness && !worst && breaks.length === 0) return null;
  return { weakness, worst, breaks };
}

/** What makes each plan's target worth playing for, on its own squares. */
const WORTH: Record<PlanKind, (p: PlanFact) => string> = {
  'king-attack': (p) => `their king on ${p.squares[0]} is still in the centre, and a king you can reach is the biggest target on the board`,
  passer: (p) => `nothing of theirs can stop your pawn on ${p.squares[0]} with a pawn, so a piece of theirs must stand guard against it`,
  'weak-pawn': (p) => `no pawn of theirs can protect their pawn on ${p.squares[0]}, so every piece that guards it is a piece doing nothing else`,
  'open-file': (p) => `the ${p.file}-file has no pawns on it — a road into their camp, and the first rook there owns it`,
  outpost: (p) => `no pawn of theirs can chase your piece off ${p.squares[0]}, so it stays there for good`,
  'worst-piece': (p) => `a position is only as strong as its worst piece, and the one on ${p.squares[0]} is doing almost nothing`,
  convert: () => 'you are ahead in material, and every trade makes the extra material count for more',
  'bishop-pair': () => 'you have two bishops and they don\'t, and bishops grow stronger as the board opens',
};

/** Why the first plan was chosen over the rest, said as a reason. */
export function whyThisPlan(plans: readonly PlanFact[]): string | null {
  const top = plans[0];
  if (!top) return null;
  const next = plans.find((p) => p.kind !== top.kind);
  return next
    ? `${WORTH[top.kind](top)} — so it comes before ${next.goalIng}`
    : WORTH[top.kind](top);
}

/** The method spoken as a question and its answer: the student thinks first. */
export function methodLine(read: MethodRead): string {
  const parts: string[] = [];
  if (read.weakness) parts.push(`Their weakness: ${read.weakness.phrase}.`);
  if (read.worst) parts.push(`Your worst piece: ${read.worst.phrase}.`);
  if (read.breaks.length) parts.push(`Your pawn break: the push to ${orList(read.breaks)}.`);
  return `How do you find a plan? Ask three things — where is their weakness, which of your pieces is worst, where is your pawn break? ${THINK_MARK} ${parts.join(' ')}`;
}

/** The squares the method names, to mark on the board. */
export function methodSquares(read: MethodRead): Square[] {
  return [read.weakness?.square, read.worst?.square, ...read.breaks].filter((s): s is string => !!s && /^[a-h][1-8]$/.test(s)) as Square[];
}
