// planStopped — THEY SHUT YOUR PLAN DOWN, AND HERE IS HOW (David 2026-10-07:
// "what if the opponent stops our plan twice in a row? … The prove it is the
// part that needs to be spoken. That's thinking out loud").
//
// A plan the student heard is gone after the opponent's move. The coach says
// WHY, read off their move against the plan's own squares — "They castled, so
// their king is out of the centre" — never a bare "the plan changes here".
// When no cause on the board can be named, it says nothing: a plan that
// vanished without a reason is our own read wobbling, not their defence.
//
// PURE: chess.js + the plan computer's own facts (`deriveNextPlanFacts`).
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';
import { deriveNextPlanFacts, findWorstPlacedPiece, PIECE_NOUN, type PlanFact, type PlanKind } from './nextPlans';

/** Their move, recovered from the two boards. */
function theirMove(fenBefore: string, fenAfter: string): Move | null {
  let c: Chess;
  try { c = new Chess(fenBefore); } catch { return null; }
  const want = fenAfter.split(' ').slice(0, 4).join(' ');
  for (const m of c.moves({ verbose: true })) {
    c.move(m);
    const hit = c.fen().split(' ').slice(0, 4).join(' ') === want;
    c.undo();
    if (hit) return m;
  }
  return null;
}

const noun = (t: PieceSymbol): string => PIECE_NOUN[t] ?? 'piece';

/** Does the piece now on `from` (after the move) attack `sq`? */
function covers(after: Chess, from: Square, sq: Square): boolean {
  try { return after.attackers(sq, after.get(from)?.color ?? 'w').includes(from); } catch { return false; }
}

type Proof = (plan: PlanFact, m: Move, after: Chess, student: Color) => string | null;

/** One proof per plan kind — a new kind fails to compile until it answers. */
const PROOF: Record<PlanKind, Proof> = {
  'king-attack': (plan, m) => {
    if (m.piece === 'k' && (m.san.startsWith('O-O'))) return 'They castled, so their king is out of the centre — the attack on it is off.';
    if (m.piece === 'k') return `Their king stepped to ${m.to}, out of the open centre — the attack on it is off.`;
    if (plan.file && m.piece === 'p' && m.to[0] === plan.file) return `Their pawn on ${m.to} closes the ${plan.file}-file the attack needed.`;
    return null;
  },
  passer: (plan, m, after) => {
    const p = plan.squares[0] as Square | undefined;
    if (!p) return null;
    if (m.to === p && m.captured) return `They took your passed pawn on ${p}.`;
    const step = `${p[0]}${Number(p[1]) + (after.get(p)?.color === 'w' ? 1 : -1)}` as Square;
    if (m.to === step) return `They planted their ${noun(m.piece)} on ${step}, right in front of your passed pawn — it can't run now.`;
    if (covers(after, m.to, step)) return `Their ${noun(m.piece)} on ${m.to} now covers ${step}, the square in front of your passed pawn.`;
    return null;
  },
  'weak-pawn': (plan, m) => {
    const w = plan.squares[0];
    if (!w) return null;
    if (m.from === w) return `Their pawn moved from ${w} to ${m.to}, so it is no longer the weak pawn you were besieging.`;
    if (m.piece === 'p' && Math.abs(m.to.charCodeAt(0) - w.charCodeAt(0)) === 1) return `They played ${m.san}, so the pawn on ${w} has a neighbour now — it isn't weak any more.`;
    return null;
  },
  'open-file': (plan, m) => {
    if (!plan.file || m.to[0] !== plan.file) return null;
    if (m.piece === 'r' || m.piece === 'q') return `They put their ${noun(m.piece)} on the ${plan.file}-file first — it's contested now.`;
    if (m.piece === 'p') return `Their pawn on ${m.to} closes the ${plan.file}-file.`;
    return null;
  },
  outpost: (plan, m, after) => {
    const o = plan.squares[0] as Square | undefined;
    if (!o) return null;
    if (m.to === o && m.captured) return `They took your ${noun(m.captured)} on ${o} — the outpost is gone.`;
    if (m.piece === 'p' && covers(after, m.to, o)) return `${m.san} hits ${o} with a pawn — the outpost is gone.`;
    return null;
  },
  // Your own piece's rescue and converting your extra material are not
  // something their move can take away — it changes the board, and the plan
  // computer says what the board needs now.
  'worst-piece': () => null,
  convert: () => null,
  'bishop-pair': (plan, m) => (m.captured === 'b' && plan.squares.includes(m.to)
    ? `They took your bishop on ${m.to} — the bishop pair is gone.`
    : null),
};

/**
 * The proof that their move stopped `plan`, or null. Null when the plan still
 * stands after their move (the same kind on the same anchor is still offered),
 * or when no cause on the board can be named.
 */
export function planStoppedProof(plan: PlanFact, fenBefore: string, fenAfter: string, student: Color): string | null {
  // It must still have been the plan right before their move — a plan the
  // student already carried out (the file seized, the pawn queened) or dropped
  // with their own move is not something THEY stopped.
  if (!deriveNextPlanFacts(fenBefore, student).some((p) => p.id === plan.id)) return null;
  if (deriveNextPlanFacts(fenAfter, student).some((p) => p.id === plan.id)) return null;
  const m = theirMove(fenBefore, fenAfter);
  if (!m || m.color === student) return null;
  let after: Chess;
  try { after = new Chess(fenAfter); } catch { return null; }
  return PROOF[plan.kind](plan, m, after, student);
}

const COUNT = ['', 'one', 'two', 'three', 'four', 'five'];

/**
 * What the coach says when a plan is stopped. The FIRST block says the proof
 * and that the plan is off. The SECOND in a row adds the human read and the
 * fallback — improve your worst piece and wait for a target. The third says
 * the honest verdict: the position is holding level.
 */
export function planStoppedLine(proof: string, inARow: number, fenAfter: string, student: Color): string {
  if (inARow <= 1) return `${proof} That plan is off.`;
  if (inARow === 2) {
    let worst: { sq: string; type: string } | null = null;
    try { worst = findWorstPlacedPiece(new Chess(fenAfter), student); } catch { worst = null; }
    const fallback = worst
      ? `improve your worst piece — the ${PIECE_NOUN[worst.type] ?? 'piece'} on ${worst.sq} — and wait for them to give you a mistake or a weak piece to target`
      : 'put your pieces on their best squares and wait for them to give you a mistake or a weak piece to target';
    return `${proof} That's two of your plans they've shut down in a row — good defending. When nothing direct works, ${fallback}.`;
  }
  return `${proof} That's ${COUNT[inARow] ?? 'several'} of your plans they've stopped — the position is holding level. Keep your pieces healthy and wait for their slip.`;
}
