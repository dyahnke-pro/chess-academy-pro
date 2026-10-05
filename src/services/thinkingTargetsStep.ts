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
import type { StepKit } from './thinkingLessonSession';
import { rotateStem } from '../utils/rotateStem';
import { findHangingBySee } from './positionReadingService';
import { findPinPressure, PIN_PRESSURE_PRINCIPLE, type PinPressure } from './pinPressure';
import { sayMoveClause } from './spokenMove';
import { exchangeChain } from './thinkingExchangeChain';
import { CAPTURE_VALUE } from './pieceValues';

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
    .sort((a, b) => CAPTURE_VALUE[a] - CAPTURE_VALUE[b])[0];
  if (cheapest && CAPTURE_VALUE[cheapest] < CAPTURE_VALUE[p.type]) {
    return `The ${name(p.type)} on ${sq} is guarded, but your ${name(cheapest)} attacks it — a cheaper piece wins it even with the guard.`;
  }
  return `The ${name(p.type)} on ${sq} is attacked ${attackers} time${attackers === 1 ? '' : 's'} and guarded only ${defenders === 1 ? 'once' : `${defenders} times`}.`;
}


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

// ── THE PINNED-PIECE FORM (David 2026-10-05: "PP on the PP" folds into step 5).
// A pinned piece is a target that cannot run. On a board where the student
// holds a pin and piling on WINS it (the one `pinPressure` computer), step 5
// asks the sharper question: where can you attack it again? Every other board
// keeps the ordinary targets question.

/** The pin this board's question is about, or null for an ordinary board. */
export function pinFormFor(fen: string): PinPressure | null {
  const p = findPinPressure(fen)[0];
  if (!p) return null;
  const squares = new Set(p.moves.map((m) => m.to));
  return squares.size >= 1 && squares.size <= 4 ? p : null;
}

export function pinPressureKey(fen: string): FairKey | null {
  const p = pinFormFor(fen);
  return p ? { key: [...new Set(p.moves.map((m) => m.to))], nearMiss: [] } : null;
}

function pinnedLabel(fen: string, p: PinPressure): string {
  let behind = '';
  try { const b = new Chess(fen).get(p.behind); if (b) behind = ` to the ${name(b.type)} on ${p.behind}`; } catch { /* name only the pin */ }
  return `their ${name(p.pinnedPiece)} on ${p.pinned}, pinned${behind}`;
}

export function pinPressurePrompt(rot: number, p: PinPressure): string {
  return rotateStem([
    `Their ${name(p.pinnedPiece)} on ${p.pinned} is pinned. Tap every square where you can attack it again and win it.`,
    `The ${name(p.pinnedPiece)} on ${p.pinned} cannot run. Where can you pile on? Tap each square.`,
  ], rot);
}

export function pinPressureReason(fen: string, sq: Square): string | null {
  const p = pinFormFor(fen);
  const m = p?.moves.find((x) => x.to === sq);
  if (!p || !m) return null;
  const said = sayMoveClause(m.san, fen);
  return `${said.charAt(0).toUpperCase()}${said.slice(1)} attacks the pinned ${name(p.pinnedPiece)} again${m.byPawn ? ' with a pawn' : ''} — it cannot step away.`;
}

export function pinPressureShowLine(fen: string, key: readonly Square[], rot: number): string {
  const p = pinFormFor(fen);
  if (!p) return targetsShowLine(fen, key, rot);
  const reasons = key.map((sq) => pinPressureReason(fen, sq)).filter((r): r is string => !!r);
  return [rotateStem([...PIN_PRESSURE_PRINCIPLE], rot), `Here: ${pinnedLabel(fen, p)}.`, ...reasons].join(' ');
}

export function pinPressureWrongTapLine(fen: string, sq: Square): string {
  const p = pinFormFor(fen);
  if (!p) return targetsWrongTapLine(fen, sq);
  return `Nothing of yours can go to ${sq} and attack the pinned ${name(p.pinnedPiece)} safely — look for the piece that can hit it again.`;
}

/** The step-5 kit for the lesson runner. The loose computer is injected (one
 *  copy of it in the app). */
export function targetsKit(loose: LooseSquares): StepKit {
  return {
    step: 'their-targets',
    // A board with a winning pile-on asks the pinned-piece form; any other
    // board asks the ordinary targets question.
    keyFor: (fen) => pinPressureKey(fen) ?? targetsKey(fen, loose),
    showLine: (fen, key, rot) => (pinFormFor(fen) ? pinPressureShowLine(fen, key, rot) : targetsShowLine(fen, key, rot)),
    prompt: (rot, fen) => {
      const p = fen ? pinFormFor(fen) : null;
      return p ? pinPressurePrompt(rot, p) : targetsPrompt(rot);
    },
    wrongTapLine: (fen, sq) => (pinFormFor(fen) ? pinPressureWrongTapLine(fen, sq) : targetsWrongTapLine(fen, sq)),
    reasonFor: (fen, sq) => (pinFormFor(fen) ? pinPressureReason(fen, sq) : targetReason(fen, sq)),
    // C1: a right answer is followed by the count itself — attackers,
    // defenders, who takes first. The pinned-piece form asks about squares,
    // not a piece, so it has no exchange to count.
    followUps: (fen, sq, rot) => (pinFormFor(fen) ? [] : exchangeChain(fen, sq, 'theirs', rot)),
    intro: 'Today: finding their targets. Before you choose a move, look at each of their pieces and ask who guards it. A piece nobody guards, or one that loses the exchange, is a target. Watch first.',
  };
}

