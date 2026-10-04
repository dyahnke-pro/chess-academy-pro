// thinkingTargetsStep — step 5 of "Learn how to think": THEIR TARGETS.
//
// The habit taught: before choosing a move, find every enemy piece that can be
// WON — a piece nobody guards (loose), or one attacked more times than it is
// guarded. The board computer that grades the taps is the one that shows the
// answer and the one the live coach uses (dual-use): the loose-piece computer
// is passed in, never re-derived here (one copy, the unification rule).
//
// First pass (P1): a position is used only when the answer is crisp —
//   key       = their loose pieces + every piece that loses the exchange
//               (`findHangingBySee`, legal and pin-aware), never the king;
//   near miss = a loose or losing PAWN (pawn targets are a later lesson), which
//               would make a tap arguable.
// PURE: chess.js only.
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { PIECE_NAMES } from '../types/tacticTypes';
import type { FairKey } from './thinkingPositions';
import { rotateStem } from '../utils/rotateStem';
import { findHangingBySee } from './positionReadingService';

/** The one loose-piece computer, injected: squares of `color`'s undefended
 *  pieces (attacked or not). */
export type LooseSquares = (fen: string, color: Color) => Square[];

const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');

interface Count { attackers: number; defenders: number }

function countAt(chess: Chess, sq: Square, owner: Color): Count {
  return {
    attackers: chess.attackers(sq, other(owner)).length,
    defenders: chess.attackers(sq, owner).filter((s) => s !== sq).length,
  };
}

/**
 * The fair key for step 5 from the side to move's point of view: the student
 * is the side to move, the targets are the OPPONENT's pieces.
 */
export function targetsKey(fen: string, loose: LooseSquares): FairKey | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const me = chess.turn();
  const them = other(me);
  const key = new Set<Square>();
  const nearMiss = new Set<Square>();

  for (const sq of loose(fen, them)) {
    const p = chess.get(sq);
    if (!p || p.type === 'k') continue;
    if (p.type === 'p') nearMiss.add(sq);
    else key.add(sq);
  }

  // What can be WON outright (SEE, legal and pin-aware): a guarded piece that
  // loses the exchange is a target too.
  for (const h of findHangingBySee(fen)) {
    if (h.color !== them || h.piece === 'k') continue;
    if (h.piece === 'p') { if (!key.has(h.square)) nearMiss.add(h.square); }
    else { key.add(h.square); nearMiss.delete(h.square); }
  }
  return { key: [...key], nearMiss: [...nearMiss] };
}

const name = (t: PieceSymbol): string => PIECE_NAMES[t] ?? 'piece';

/** One computed sentence per key square: what makes it a target. */
export function targetReason(fen: string, sq: Square): string | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const p = chess.get(sq);
  if (!p) return null;
  const { attackers, defenders } = countAt(chess, sq, p.color);
  if (defenders === 0) {
    return attackers > 0
      ? `The ${name(p.type)} on ${sq} has no defender, and it is already attacked.`
      : `The ${name(p.type)} on ${sq} has no defender — it's loose.`;
  }
  const cheapest = chess.attackers(sq, other(p.color))
    .map((s) => chess.get(s)?.type)
    .filter((t): t is PieceSymbol => !!t)
    .sort((a, b) => VALUE[a] - VALUE[b])[0];
  if (cheapest && VALUE[cheapest] < VALUE[p.type]) {
    return `The ${name(p.type)} on ${sq} is guarded, but your ${name(cheapest)} attacks it — a cheaper piece wins it even with the guard.`;
  }
  return `The ${name(p.type)} on ${sq} is attacked ${attackers} time${attackers === 1 ? '' : 's'} and guarded only ${defenders === 1 ? 'once' : `${defenders} times`}.`;
}

const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

/** The worked example (Show): the method, then every target with its reason. */
export function targetsShowLine(fen: string, key: readonly Square[], rot: number): string {
  const open = rotateStem([
    'Here is how to find their targets: go through their pieces one by one and count who guards each.',
    'Finding targets is counting: for each of their pieces, how many attack it and how many guard it?',
  ], rot);
  const reasons = key.map((sq) => targetReason(fen, sq)).filter((r): r is string => !!r);
  return [open, ...reasons].join(' ');
}

/** The Guide / Solo question. Never says how many. */
export function targetsPrompt(rot: number): string {
  return rotateStem([
    'Tap every piece of theirs you could win.',
    'Find their targets — tap each one.',
    'Which of their pieces are targets? Tap them.',
  ], rot);
}

/**
 * The METHOD line for a wrong tap — what rules that square out, never the
 * answer (plan: "a wrong tap names the method step that rules it out").
 */
export function targetsWrongTapLine(fen: string, sq: Square): string {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return 'Count the guards on each of their pieces.'; }
  const me = chess.turn();
  const p = chess.get(sq);
  if (!p) return 'Tap the piece itself, not an empty square.';
  if (p.color === me) return 'That one is yours — the question is about their pieces.';
  if (p.type === 'k') return 'The king can never be taken — look at the pieces around it.';
  const { attackers, defenders } = countAt(chess, sq, p.color);
  if (defenders > 0 && attackers <= defenders) {
    return `Count the guards: that ${name(p.type)} has ${defenders} defender${defenders === 1 ? '' : 's'}${attackers > 0 ? ` and only ${attackers} attacker${attackers === 1 ? '' : 's'}` : ''}.`;
  }
  return `Look again at that ${name(p.type)} — who guards it?`;
}
