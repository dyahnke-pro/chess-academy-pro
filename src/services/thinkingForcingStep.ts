// thinkingForcingStep — step 6, "My forcing moves" (Nunn's FORCE: checks,
// captures, threats — in that order).
//
// First question of the step: CHECKS. Tap every square a move of yours can give
// check from. Checks come first in the scan because they leave the opponent the
// fewest replies; a student who lists them all has started calculating from
// the right end. The key is chess.js's own move list — nothing judged.
//
// Fair key: 1–4 checking squares. A board where two different pieces check
// from the SAME square counts that square once (the student taps squares).
import { Chess, type PieceSymbol, type Square } from 'chess.js';
import { PIECE_NAMES } from '../types/tacticTypes';
import type { FairKey } from './thinkingPositions';
import type { StepKit } from './thinkingLessonSession';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { findHangingBySee } from './positionReadingService';

export const FORCING_STEP_TAGS: readonly MisconceptionTagId[] = ['missed-tactic'];

const name = (t: PieceSymbol): string => PIECE_NAMES[t] ?? 'piece';

/** Which forcing question a board asks: checks or winning captures. Keyed on
 *  the board (the same hash the runner rotates the prompt on), so the key, the
 *  prompt and the reasons always agree for one board, and boards alternate. */
export type ForcingQuestion = 'checks' | 'captures';
export function forcingQuestionFor(rotOrFen: number | string): ForcingQuestion {
  const k = typeof rotOrFen === 'string' ? stemKeyOf(rotOrFen) : rotOrFen;
  return Math.abs(k) % 2 === 0 ? 'checks' : 'captures';
}

/** Their pieces you can capture and come out ahead (SEE). */
export function winningCapturesKey(fen: string): FairKey | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  if (chess.inCheck()) return null;
  const them = chess.turn() === 'w' ? 'b' : 'w';
  const key = findHangingBySee(fen).filter((h) => h.color === them && h.piece !== 'k').map((h) => h.square);
  return { key, nearMiss: [] };
}

export function forcingKey(fen: string): FairKey | null {
  return forcingQuestionFor(fen) === 'checks' ? checkSquaresKey(fen) : winningCapturesKey(fen);
}

export function checkSquaresKey(fen: string): FairKey | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  if (chess.inCheck()) return null; // answering a check is a different question
  const key = new Set<Square>();
  for (const m of chess.moves({ verbose: true })) {
    if (/[+#]$/.test(m.san)) key.add(m.to);
  }
  return { key: [...key], nearMiss: [] };
}

export function checkReason(fen: string, sq: Square): string | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const checks = chess.moves({ verbose: true }).filter((m) => m.to === sq && /[+#]$/.test(m.san));
  if (checks.length === 0) return null;
  const pieces = [...new Set(checks.map((m) => name(m.piece)))];
  const mate = checks.some((m) => m.san.endsWith('#'));
  return `From ${sq}: your ${pieces.join(' or ')} gives check${mate ? ' — and it is mate' : ''}.`;
}

export function forcingShowLine(fen: string, key: readonly Square[], rot: number): string {
  if (forcingQuestionFor(fen) === 'captures') {
    const reasons = key.map((sq) => captureReason(fen, sq)).filter((r): r is string => !!r);
    return ['Next in the forcing scan: every capture — and only the ones that come out ahead. Count what you take and what you give back.', ...reasons].join(' ');
  }
  const open = rotateStem([
    'Before anything quiet, list your forcing moves — checks first, then captures, then threats. Start with every check.',
    'Strong players scan forcing moves in order: every check, every capture, every threat. Checks first.',
  ], rot);
  const reasons = key.map((sq) => checkReason(fen, sq)).filter((r): r is string => !!r);
  return [open, ...reasons].join(' ');
}

export function captureReason(fen: string, sq: Square): string | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const p = chess.get(sq);
  if (!p) return null;
  const h = findHangingBySee(fen).find((x) => x.square === sq);
  if (!h) return null;
  return `Taking the ${name(p.type)} on ${sq} comes out ahead — they cannot win back as much as you take.`;
}

export function forcingPrompt(rot: number): string {
  if (forcingQuestionFor(rot) === 'captures') {
    return rotateStem([
      'Now captures: tap every piece of theirs you can take and come out ahead.',
      'Which captures win material? Tap each piece you can take for a profit.',
    ], rot >> 1);
  }
  return rotateStem([
    'Tap every square where a move of yours gives check.',
    'Checks first: tap each square you can check from.',
  ], rot);
}

export function forcingWrongTapLine(fen: string, sq: Square): string {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return 'Look at each of your pieces: which can reach a square that hits their king?'; }
  if (forcingQuestionFor(fen) === 'captures') {
    const p = chess.get(sq);
    if (!p) return 'Tap the piece you would capture.';
    if (p.color === chess.turn()) return 'That one is yours — tap a piece of theirs.';
    if (!chess.moves({ verbose: true }).some((m) => m.to === sq && m.captured)) return 'Nothing of yours can take that piece right now.';
    return `You can take it, but count the recapture: you would give back as much as you win.`;
  }
  const reach = chess.moves({ verbose: true }).filter((m) => m.to === sq);
  if (reach.length === 0) return 'None of your pieces can move there — look at what each piece reaches.';
  return `A move to ${sq} does not hit their king — trace the lines from that square to the king.`;
}

export function forcingKit(): StepKit {
  return {
    step: 'forcing-moves',
    keyFor: forcingKey,
    showLine: forcingShowLine,
    prompt: forcingPrompt,
    wrongTapLine: forcingWrongTapLine,
    reasonFor: (fen, sq) => (forcingQuestionFor(fen) === 'captures' ? captureReason(fen, sq) : checkReason(fen, sq)),
    intro: 'Today: forcing moves. Before any quiet move, strong players list every check, every capture and every threat. We start with checks.',
  };
}
