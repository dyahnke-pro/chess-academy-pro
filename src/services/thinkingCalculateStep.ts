// thinkingCalculateStep — step 9, "Calculate to the end".
//
// Calculation is seeing a line through WITHOUT moving the pieces. The coach
// speaks a real forcing line from a puzzle (the CC0 solution, never invented —
// G3), the board stays still, and the student taps the square where the line
// ends. Getting there means carrying the position in their head move by move.
//
// Used only for lines of 3 to 5 moves (long enough to calculate, short enough
// to hold) whose last move captures — "where does the material change hands?"
// has one clear answer.
import { Chess, type PieceSymbol, type Square } from 'chess.js';
import { PIECE_NAMES } from '../types/tacticTypes';
import type { FairKey, LessonPositionCandidate } from './thinkingPositions';
import type { StepKit } from './thinkingLessonSession';
import { sayLine } from './spokenMove';
import { andList } from '../utils/andList';
import { rotateStem } from '../utils/rotateStem';

const MIN_PLIES = 3;
const MAX_PLIES = 5;

const name = (t: PieceSymbol): string => PIECE_NAMES[t] ?? 'piece';

/** The last move of a line, played out (null when the line does not apply). */
function endOf(fen: string, line: readonly string[]): { to: Square; captured?: PieceSymbol; piece: PieceSymbol; mate: boolean } | null {
  try {
    const c = new Chess(fen);
    let last = null;
    for (const san of line) last = c.move(san);
    if (!last) return null;
    return { to: last.to, captured: last.captured, piece: last.piece, mate: c.isCheckmate() };
  } catch {
    return null;
  }
}

/** Keep puzzle lines of the right length that end in a capture; the spoken
 *  line rides as the lead. */
export function withCalculableLine(c: LessonPositionCandidate): LessonPositionCandidate | null {
  const line = c.line;
  if (!line || line.length < MIN_PLIES || line.length > MAX_PLIES) return null;
  const end = endOf(c.fen, line);
  if (!end || !end.captured) return null;
  const said = sayLine(c.fen, line, 'clause');
  return {
    ...c,
    lead: `Picture this line without moving anything: ${andList(said)}.`,
  };
}

/** The key: the square the line's last capture lands on. Read from the
 *  candidate's own line (the board alone does not say which line). */
export function calculateKey(fen: string, c?: LessonPositionCandidate): FairKey | null {
  if (!c?.line) return null;
  const end = endOf(fen, c.line);
  return end && end.captured ? { key: [end.to], nearMiss: [] } : null;
}

export function calculatePrompt(rot: number): string {
  return rotateStem([
    'Where does the line end? Tap the square where the last capture lands.',
    'Hold it in your head to the end — tap the square of the final capture.',
  ], rot);
}

export function calculateShowLine(fen: string, key: readonly Square[], rot: number): string {
  const open = rotateStem([
    'Calculating means playing the moves in your head and keeping the picture straight to the end — where does it stop, and who is ahead then?',
    'A line is only worth something if you can see where it stops. Follow every move in your head, then look at the last position.',
  ], rot);
  return [open, key[0] ? `This one ends with a capture on ${key[0]}.` : ''].filter(Boolean).join(' ');
}

export function calculateWrongTapLine(): string {
  return 'Go through it again, one move at a time — after each move, picture where every piece now stands.';
}

/** After the question: what the line wins at its end. */
export function calculateReason(fen: string, sq: Square): string | null {
  try {
    const c = new Chess(fen);
    const p = c.get(sq);
    return p ? `At the end the ${name(p.type)} that stood on ${sq} is taken.` : `The line finishes with a capture on ${sq}.`;
  } catch {
    return null;
  }
}

export function calculateKit(): StepKit {
  return {
    step: 'calculate',
    keyFor: calculateKey,
    showLine: calculateShowLine,
    prompt: calculatePrompt,
    wrongTapLine: () => calculateWrongTapLine(),
    reasonFor: calculateReason,
    intro: 'Today: calculating to the end. I will say a line out loud; you keep the pieces still and follow it in your head.',
    adapt: withCalculableLine,
  };
}
