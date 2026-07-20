// reviewTrapQuestion — §4 diagnostic question family: THE TRAP (poisoned
// capture). (docs/plans/2026-07-19-review-should-vs-is.md — gap-list B7,
// "most-popular-wrong-answer".)
//
// Danya's "is this a free pawn, or is it poisoned?" device. At a position where
// a natural, tempting capture LOSES material by force, the coach asks the
// student to commit — grab it, or leave it? — before the board shows the swap.
// It trains the single most common blunder class: the greedy capture that walks
// into a losing exchange.
//
// 100% G0-grounded: the "trap" is a static-exchange fact (`seeGain < 0` on a
// capturable enemy piece), and the reveal PLAYS OUT the real capture sequence
// (`seeSequence`) — every move chess.js-legal. Nothing is invented; the LLM is
// never asked whether a move is good.
//
// Honesty contract: the choices are ALWAYS "Take it" / "Leave it" in the same
// order, so the option set never leaks the answer; the truth is shown only after
// the student commits.

import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { seeGain, seeSequence } from './positionReadingService';

const PIECE_LABEL: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};
const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export type TrapChoiceId = 'take' | 'leave';

export interface TrapChoice {
  id: TrapChoiceId;
  label: string;
}

export interface TrapQuestion {
  /** The position the student is judging (they are to move). */
  fen: string;
  /** Answer-neutral probe — never says whether it's safe. */
  prompt: string;
  /** ALWAYS "Take it" / "Leave it", same order. */
  choices: TrapChoice[];
  /** The right call — always 'leave' (the question only fires on a poisoned
   *  capture; a genuinely-free piece isn't a trap and doesn't get asked). */
  answerId: TrapChoiceId;
  /** The tempting capture (SAN) — the move that looks free but isn't. */
  temptingSan: string;
  /** The square of the poisoned piece. */
  targetSquare: string;
  /** The real capture sequence to PLAY OUT on the board (SAN), showing the loss. */
  sequence: string[];
  /** Grounded reveal naming the net material lost. */
  reveal: string;
}

/** How much a capture must lose to count as a real trap (in pawns). A −1 swing
 *  (a clean piece-for-pawn or worse) is a genuine blunder worth asking about; a
 *  −0.x rounding artefact is not. */
const TRAP_MIN_LOSS = 1;

/**
 * Find the most tempting POISONED capture for the side to move, or null. A
 * poisoned capture = an enemy piece the student can take where the static
 * exchange loses material (seeGain < 0). Prefers the highest-value victim (the
 * most tempting "free" piece).
 */
export function buildTrapQuestion(args: { fen: string; studentColor: 'white' | 'black' }): TrapQuestion | null {
  const { fen, studentColor } = args;
  const studentWB: 'w' | 'b' = studentColor === 'white' ? 'w' : 'b';
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return null;
  }
  // Only ask on the student's own move.
  if (chess.turn() !== studentWB) return null;
  const enemy: 'w' | 'b' = studentWB === 'w' ? 'b' : 'w';

  let best: { square: Square; victimType: string; loss: number } | null = null;
  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== enemy) continue;
      const square = cell.square as Square;
      // The student must actually be able to capture here.
      if (chess.attackers(square, studentWB).length === 0) continue;
      const gain = seeGain(chess, square); // net for the capturing (student) side
      if (gain >= 0) continue; // a real free/even piece — not a trap
      const loss = -gain;
      if (loss < TRAP_MIN_LOSS) continue;
      // Tempt-factor: prefer the highest-value victim (a hanging-looking queen
      // beats a poisoned pawn). Tie-break on the biggest loss.
      const victimValue = PIECE_VALUE[cell.type] ?? 0;
      const bestValue = best ? (PIECE_VALUE[best.victimType] ?? 0) : -1;
      if (!best || victimValue > bestValue || (victimValue === bestValue && loss > best.loss)) {
        best = { square, victimType: cell.type, loss };
      }
    }
  }
  if (!best) return null;

  // Resolve the actual tempting capture SAN (student's least-valuable attacker
  // takes — the natural first grab) + the real swap sequence.
  const sequence = seeSequence(fen, best.square);
  if (sequence.length === 0) return null;
  const temptingSan = sequence[0];
  const victimLabel = PIECE_LABEL[best.victimType] ?? 'piece';
  const lossPawns = best.loss >= 5 ? 'a decisive amount of' : best.loss >= 3 ? 'a piece\'s worth of' : `about ${best.loss.toFixed(0)} ${best.loss >= 2 ? 'pawns' : 'pawn'} of`;

  return {
    fen,
    prompt: `Your opponent's ${victimLabel} on ${best.square} looks like it's just sitting there. Do you take it?`,
    choices: [
      { id: 'take', label: 'Take it' },
      { id: 'leave', label: 'Leave it — it\'s a trap' },
    ],
    answerId: 'leave',
    temptingSan,
    targetSquare: best.square,
    sequence,
    reveal: `It's poisoned. Grab it with ${temptingSan} and the swap costs you ${lossPawns} material — count the recaptures and you come out behind. Leave it and keep the tension.`,
  };
}

/** Did the student make the right call? 'leave' is always correct here. */
export function judgeTrapAnswer(q: TrapQuestion, pickedId: TrapChoiceId): boolean {
  return pickedId === q.answerId;
}
