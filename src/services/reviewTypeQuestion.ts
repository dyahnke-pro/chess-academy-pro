// reviewTypeQuestion — §4 diagnostic question family: TYPE-NOT-MOVE.
// (docs/plans/2026-07-19-review-should-vs-is.md — the question family; David's
//  gap-list B3.)
//
// Danya's calculation-training device: before you hunt the exact square, ask
// what KIND of move the position wants — "is it a check, a capture, or a quiet
// move?" It trains move-selection instincts (forcing moves first) without
// handing over the answer. 100% G0-grounded: the type is a DETERMINISTIC
// function of the engine's best move (chess.js tells us check/capture), never
// an LLM guess.
//
// Honesty contract: the choices are ALWAYS the same three types in the same
// order, so which options appear never leaks the answer; the type + reveal are
// shown only after the student commits (the card enforces the flow).

import { Chess } from 'chess.js';
import { describeMoveGeometry } from './groundedAnswer';

export type MoveTypeId = 'check' | 'capture' | 'quiet';

export interface MoveTypeChoice {
  id: MoveTypeId;
  label: string;
}

export interface MoveTypeQuestion {
  /** The position the student is judging (the mover is to move). */
  fen: string;
  /** Answer-neutral probe — names no square, no quality. */
  prompt: string;
  /** ALWAYS these three, same order — the option set never leaks the answer. */
  choices: MoveTypeChoice[];
  answerId: MoveTypeId;
  /** The engine's best move (SAN) — revealed only after the student commits. */
  answerSan: string;
  /** Grounded reveal: names the type + the move + (when computable) its WHY.
   *  No invented reason — chess.js geometry only. */
  reveal: string;
}

/** The fixed three-type ladder. Order is stable so an option's presence never
 *  hints at the answer. Precedence check > capture > quiet resolves a move that
 *  is more than one (a capture-with-check buckets as a check — the forcing
 *  feature that matters most for calculation). */
const CHOICES: MoveTypeChoice[] = [
  { id: 'check', label: 'A check' },
  { id: 'capture', label: 'A capture' },
  { id: 'quiet', label: 'A quiet, improving move' },
];

interface Probed {
  san: string;
  type: MoveTypeId;
  isCheck: boolean;
  isCapture: boolean;
  mover: 'white' | 'black';
}

function probe(fen: string, bestUci: string): Probed | null {
  if (!bestUci || bestUci.length < 4) return null;
  try {
    const c = new Chess(fen);
    const mover: 'white' | 'black' = fen.split(' ')[1] === 'b' ? 'black' : 'white';
    const mv = c.move({
      from: bestUci.slice(0, 2),
      to: bestUci.slice(2, 4),
      promotion: bestUci.length > 4 ? bestUci[4] : undefined,
    });
    if (!mv) return null;
    const isCheck = c.isCheck();
    const isCapture = !!mv.captured;
    // Precedence: a check is the most forcing feature, then a capture, then quiet.
    const type: MoveTypeId = isCheck ? 'check' : isCapture ? 'capture' : 'quiet';
    return { san: mv.san, type, isCheck, isCapture, mover };
  } catch {
    return null;
  }
}

/**
 * Build a type-not-move question for a position + the engine's best move, or
 * null when the move can't be probed (empty > generic > invented).
 */
export function buildMoveTypeQuestion(args: { fen: string; bestUci: string }): MoveTypeQuestion | null {
  const p = probe(args.fen, args.bestUci);
  if (!p) return null;

  let why: string | null = null;
  try {
    why = describeMoveGeometry(args.fen, p.san, p.mover);
  } catch { /* geometry is a bonus */ }
  const whyClause = why ? ` — it ${why}` : '';

  let reveal: string;
  switch (p.type) {
    case 'check':
      reveal = p.isCapture
        ? `It's a check — ${p.san} — and a capture at that${whyClause}. Forcing moves first: a check leaves your opponent one reply, so it's always the first thing to calculate.`
        : `It's a check — ${p.san}${whyClause}. Forcing moves first: a check leaves your opponent one legal reply, so it's always the first thing to calculate.`;
      break;
    case 'capture':
      reveal = `It's a capture — ${p.san}${whyClause}. When there's material to be won, count the trade to the end before you commit.`;
      break;
    case 'quiet':
      reveal = `It's a quiet move — ${p.san}${whyClause}. No check, no capture — just an improvement your opponent can't answer, and the hardest kind to find.`;
      break;
  }

  return {
    fen: args.fen,
    prompt: "Before you find the exact move — what KIND of move does this position call for?",
    choices: CHOICES,
    answerId: p.type,
    answerSan: p.san,
    reveal,
  };
}

/** Did the student pick the right type? Exact-type match. */
export function judgeMoveTypeAnswer(q: MoveTypeQuestion, pickedId: MoveTypeId): boolean {
  return pickedId === q.answerId;
}
