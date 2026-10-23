// thinkingTargetsStep — step 5 of "Learn how to think": THEIR TARGETS.
//
// The habit taught: before choosing a move, find the enemy pieces that are
// targets — a piece nobody guards (loose), or one you can win right now. The
// board computer that grades the taps is the one that shows the answer and the
// one the live coach uses (dual-use): the loose-piece computer is passed in,
// never re-derived here (one copy, the unification rule).
//
// THREE QUESTIONS, ONE PER BOARD (`targetsForm`, 2026-10-23). The question used
// to be "tap every piece of theirs you could win" while its key held every
// loose piece — and 74% of key squares (measured on 400 puzzles, 800–1600) were
// loose pieces NOTHING attacked, which cannot be won now. A student who read
// the prompt literally was graded wrong. So each board asks the question its
// key answers:
//   pin   — their pinned piece can be won by piling on: where can you hit it again?
//   loose — some piece of theirs is loose and unattacked: "which pieces does
//           nobody guard?" (a fact of geometry: the key is every loose piece);
//   win   — no unattacked loose piece: "which pieces can you win right now?"
//           (the key is what wins by the exchange count, ENGINE-CHECKED before
//           it is asked — `thinkingKeyCheck.capturesCheck`).
// A loose or winnable PAWN is a near miss (pawn targets are a later lesson).
// PURE: chess.js only (the engine is injected into `check`).
import { openSentence } from '../utils/openSentence';
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
import { capturesCheck, landingCheck } from './thinkingKeyCheck';

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

/** Which question this board asks (see the header). Null: no piece of the side
 *  to move to win anything with, or the board does not parse. PURE. */
export type TargetsForm = 'pin' | 'loose' | 'win';

export function targetsForm(fen: string, loose: LooseSquares): TargetsForm | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  if (pinFormFor(fen)) return 'pin';
  const them = other(chess.turn());
  const unattackedLoose = loose(fen, them).some((sq) => {
    const p = chess.get(sq);
    return !!p && p.type !== 'k' && p.type !== 'p' && chess.attackers(sq, chess.turn()).length === 0;
  });
  return unattackedLoose ? 'loose' : 'win';
}

/**
 * The fair key for step 5 from the side to move's point of view: the student
 * is the side to move, the targets are the OPPONENT's pieces. The key answers
 * the board's own question (`targetsForm`).
 */
export function targetsKey(fen: string, loose: LooseSquares): FairKey | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const me = chess.turn();
  const them = other(me);
  // A bare king wins nothing: "which of their pieces could you win?" asked of
  // a lone king is not a question (audit 2026-10-06: K+B vs K was served).
  if (!chess.board().flat().some((c) => c && c.color === me && c.type !== 'k')) return null;
  const form = targetsForm(fen, loose);
  if (form === 'pin') return pinPressureKey(fen);
  const key = new Set<Square>();
  const nearMiss = new Set<Square>();

  if (form === 'loose') {
    // Every piece nobody guards, attacked or not: the question is the guard.
    for (const sq of loose(fen, them)) {
      const p = chess.get(sq);
      if (!p || p.type === 'k') continue;
      (p.type === 'p' ? nearMiss : key).add(sq);
    }
    return { key: [...key], nearMiss: [...nearMiss] };
  }

  // What can be WON outright (SEE, legal and pin-aware): a loose piece that is
  // attacked, or a guarded piece that loses the exchange.
  for (const h of findHangingBySee(fen)) {
    if (h.color !== them || h.piece === 'k') continue;
    (h.piece === 'p' ? nearMiss : key).add(h.square);
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
      : `The ${name(p.type)} on ${sq} has no defender — it's loose, so it is the first piece a fork or a double attack goes after.`;
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
export function targetsShowLine(fen: string, key: readonly Square[], rot: number, form: TargetsForm = 'win'): string {
  const open = form === 'loose'
    ? rotateStem([
      'Here is how to find their loose pieces: go through their pieces one by one and ask who guards each. A piece nobody guards is the first thing a fork or a double attack goes after.',
      'Loose pieces drop off. For each of their pieces, ask one question: does anything guard it?',
    ], rot)
    : rotateStem([
      'Here is how to find what you can win: go through their pieces one by one and count who attacks and who guards each.',
      'Winning material is counting: for each of their pieces, how many of yours attack it and how many of theirs guard it?',
    ], rot);
  const reasons = key.map((sq) => targetReason(fen, sq)).filter((r): r is string => !!r);
  return [open, ...reasons].join(' ');
}

/** The Guide / Solo question, in the board's own form. Never says how many. */
export function targetsPrompt(rot: number, form: TargetsForm = 'win'): string {
  return form === 'loose'
    ? rotateStem([
      'Tap every piece of theirs that nobody guards.',
      'Find their loose pieces — tap each one with no defender.',
      'Which of their pieces has no guard? Tap them.',
    ], rot)
    : rotateStem([
      'Tap every piece of theirs you can win right now.',
      'Which of their pieces can you win right now? Tap them.',
      'Find what you can win this move — tap each piece.',
    ], rot);
}

/** The wrong-tap line for the loose question: the guard is the whole test. */
function looseWrongTapLine(fen: string, sq: Square): string {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return 'Ask of each of their pieces: does anything guard it?'; }
  const me = chess.turn();
  const p = chess.get(sq);
  if (!p) return 'Tap the piece itself, not an empty square.';
  if (p.color === me) return 'That one is yours — the question is about their pieces.';
  if (p.type === 'k') return 'The king can never be taken — look at the pieces around it.';
  const { defenders } = countAt(chess, sq, p.color);
  return `That ${name(p.type)} has ${defenders} defender${defenders === 1 ? '' : 's'} — the question is the pieces nobody guards.`;
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
  if (attackers === 0) return `Nothing of yours attacks that ${name(p.type)} yet.`;
  // More hits than guards, and still not won: the first capture costs more than
  // the piece is worth, because a cheaper piece of theirs takes back.
  const cheapest = (sqs: Square[]): Square | undefined =>
    [...sqs].sort((a, b) => CAPTURE_VALUE[chess.get(a)?.type ?? 'q'] - CAPTURE_VALUE[chess.get(b)?.type ?? 'q'])[0];
  const first = cheapest(chess.attackers(sq, me));
  const back = cheapest(chess.attackers(sq, p.color).filter((s) => s !== sq));
  const firstP = first ? chess.get(first) : undefined;
  const backP = back ? chess.get(back) : undefined;
  if (firstP && backP && CAPTURE_VALUE[firstP.type] > CAPTURE_VALUE[p.type]) {
    return `Your cheapest way in is the ${name(firstP.type)} on ${first}, and their ${name(backP.type)} on ${back} takes back — you give more than the ${name(p.type)} is worth.`;
  }
  return `Look again at that ${name(p.type)} — count who guards it.`;
}

// ── THE PINNED-PIECE FORM (David 2026-10-05: "PP on the PP" folds into step 5).
// A pinned piece is a target that cannot run. On a board where the student
// holds a pin and piling on WINS it (the one `pinPressure` computer), step 5
// asks the sharper question: where can you attack it again? Every other board
// keeps the ordinary targets question.

/** The pin this board's question is about, or null for an ordinary board. */
function pinFormFor(fen: string): PinPressure | null {
  const p = findPinPressure(fen)[0];
  if (!p) return null;
  const squares = new Set(p.moves.map((m) => m.to));
  return squares.size >= 1 && squares.size <= 4 ? p : null;
}

function pinPressureKey(fen: string): FairKey | null {
  const p = pinFormFor(fen);
  return p ? { key: [...new Set(p.moves.map((m) => m.to))], nearMiss: [] } : null;
}

function pinnedLabel(fen: string, p: PinPressure): string {
  let behind = '';
  try { const b = new Chess(fen).get(p.behind); if (b) behind = ` to the ${name(b.type)} on ${p.behind}`; } catch { /* name only the pin */ }
  return `their ${name(p.pinnedPiece)} on ${p.pinned}, pinned${behind}`;
}

function pinPressurePrompt(rot: number, p: PinPressure): string {
  return rotateStem([
    `Their ${name(p.pinnedPiece)} on ${p.pinned} is pinned. Tap every square where you can attack it again and win it.`,
    `The ${name(p.pinnedPiece)} on ${p.pinned} cannot run. Where can you pile on? Tap each square.`,
  ], rot);
}

function pinPressureReason(fen: string, sq: Square): string | null {
  const p = pinFormFor(fen);
  const m = p?.moves.find((x) => x.to === sq);
  if (!p || !m) return null;
  const said = sayMoveClause(m.san, fen);
  return `${openSentence(said)} attacks the pinned ${name(p.pinnedPiece)} again${m.byPawn ? ' with a pawn' : ''} — it cannot step away.`;
}

function pinPressureShowLine(fen: string, key: readonly Square[], rot: number): string {
  const p = pinFormFor(fen);
  if (!p) return targetsShowLine(fen, key, rot);
  const reasons = key.map((sq) => pinPressureReason(fen, sq)).filter((r): r is string => !!r);
  return [rotateStem([...PIN_PRESSURE_PRINCIPLE], rot), `Here: ${pinnedLabel(fen, p)}.`, ...reasons].join(' ');
}

function pinPressureWrongTapLine(fen: string, sq: Square): string {
  const p = pinFormFor(fen);
  if (!p) return targetsWrongTapLine(fen, sq);
  return `Nothing of yours can go to ${sq} and attack the pinned ${name(p.pinnedPiece)} safely — look for the piece that can hit it again.`;
}

/** The step-5 kit for the lesson runner. The loose computer is injected (one
 *  copy of it in the app). */
export function targetsKit(loose: LooseSquares): StepKit {
  return {
    step: 'their-targets',
    // Each board asks ITS question (`targetsForm`): the pinned-piece form, the
    // loose pieces, or what can be won right now.
    keyFor: (fen) => targetsKey(fen, loose),
    showLine: (fen, key, rot) => {
      const form = targetsForm(fen, loose);
      return form === 'pin' ? pinPressureShowLine(fen, key, rot) : targetsShowLine(fen, key, rot, form ?? 'win');
    },
    prompt: (rot, fen) => {
      const p = fen ? pinFormFor(fen) : null;
      if (p) return pinPressurePrompt(rot, p);
      return targetsPrompt(rot, fen ? targetsForm(fen, loose) ?? 'win' : 'win');
    },
    wrongTapLine: (fen, sq) => {
      const form = targetsForm(fen, loose);
      return form === 'pin' ? pinPressureWrongTapLine(fen, sq) : form === 'loose' ? looseWrongTapLine(fen, sq) : targetsWrongTapLine(fen, sq);
    },
    reasonFor: (fen, sq) => (pinFormFor(fen) ? pinPressureReason(fen, sq) : targetReason(fen, sq)),
    // The engine checks what the key claims can be WON (the pile-on, the
    // capture); "nobody guards it" is geometry and needs no engine.
    check: async (fen, key, scorer) => {
      const form = targetsForm(fen, loose);
      if (form === 'loose') return true;
      if (form === 'pin') {
        const p = pinFormFor(fen);
        if (!p) return false;
        const sans = new Set(p.moves.map((m) => m.san));
        return landingCheck((m) => sans.has(m.san))(fen, key, scorer);
      }
      return capturesCheck(fen, key, scorer);
    },
    // C1: a right answer is followed by the count itself — attackers,
    // defenders, who takes first. The pinned-piece form asks about squares,
    // not a piece, so it has no exchange to count.
    followUps: (fen, sq, rot) => (pinFormFor(fen) ? [] : exchangeChain(fen, sq, 'theirs', rot)),
    nothing: {
      line: () => 'Nothing of theirs can be won right now. When there is no target, the next question is how to make one.',
      wrongLine: 'Look again — go through their pieces one by one and ask who guards each.',
    },
    intro: 'Today: finding their targets. Before you choose a move, look at each of their pieces and ask who guards it. A piece nobody guards, or one you can win right now, is a target. Watch first.',
  };
}

