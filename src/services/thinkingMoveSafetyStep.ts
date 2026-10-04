// thinkingMoveSafetyStep — step 10, "Is my move safe?" (the blunder check).
//
// Taught on the student's OWN mistakes: the board shows the move they actually
// played, and they tap what it left in danger. It is the "am I safe?" computer
// run on the position AFTER their move — one computer, two moments (the plan's
// step table says so: step 10 uses the step-2 computers on the board after the
// move).
import { Chess, type Square } from 'chess.js';
import type { LessonPositionCandidate } from './thinkingPositions';
import type { StepKit } from './thinkingLessonSession';
import { safetyKey, safetyReason, safetyShowLine, safetyWrongTapLine } from './thinkingSafetyStep';
import { sayMoveClause } from './spokenMove';
import { rotateStem } from '../utils/rotateStem';


/**
 * The board after the student's played move, from the side that just moved
 * (so the safety key reads THEIR pieces). The side to move is flipped back to
 * the student: the question is about their pieces, not a move to make.
 * Null when there is no played move or it does not parse.
 */
export function afterPlayedMove(c: LessonPositionCandidate): LessonPositionCandidate | null {
  if (!c.playedSan) return null;
  try {
    const chess = new Chess(c.fen);
    const mover = chess.turn();
    if (!chess.move(c.playedSan)) return null;
    const parts = chess.fen().split(' ');
    parts[1] = mover;
    parts[3] = '-';
    const fen = parts.join(' ');
    new Chess(fen); // must still be a legal board from the mover's side
    return {
      ...c,
      fen,
      lead: rotateStem([
        `In this game you played ${sayMoveClause(c.playedSan, c.fen)} here.`,
        `From your game: you chose ${sayMoveClause(c.playedSan, c.fen)}.`,
      ], c.fen.length),
    };
  } catch {
    return null;
  }
}

export function moveSafetyPrompt(rot: number): string {
  return rotateStem([
    'Before you let go of a move, check it: tap every piece of yours it left in danger.',
    'Was it safe? Tap what that move left hanging.',
  ], rot);
}

export function moveSafetyShowLine(fen: string, key: readonly Square[], rot: number): string {
  const open = rotateStem([
    'The last check before any move: after it, what can they take? Go through your pieces once more.',
    'Before you let go of the piece, look at the board after your move — every check, capture and threat they get.',
  ], rot);
  return [open, safetyShowLine(fen, key, rot).replace(/^[^.]*\.\s*/, '')].filter(Boolean).join(' ');
}

export function moveSafetyKit(): StepKit {
  return {
    step: 'is-my-move-safe',
    keyFor: safetyKey,
    showLine: moveSafetyShowLine,
    prompt: moveSafetyPrompt,
    wrongTapLine: safetyWrongTapLine,
    reasonFor: safetyReason,
    intro: 'Today: is my move safe? The last thing strong players do before every move is look at the board after it. We will do it on moves from your own games.',
    adapt: afterPlayedMove,
  };
}
