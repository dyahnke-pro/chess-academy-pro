// What each of the student's own moves was FOR, in review — the same engine
// computer Learn speaks (`moveIntent`), read off the lines the review's
// read-ahead already stored for every position (`positionEvalCache`). No new
// engine work: a position without a stored line simply gets no intent.
//
// Why (Learn + Review audits 2026-10-15): review gave a good move a board
// description ("the bishop rakes toward d4 and f2") because nothing on the
// review path asked the engine what the move prepares.
import { Chess } from 'chess.js';
import type { AnalysisLine } from '../types';
import { lookupPositionEvals, type CachedEval } from './positionEvalCache';
import { moveIntent, type IntentOptions } from './moveIntent';

export interface IntentMoveInput {
  ply: number;
  san: string;
  fenAfter: string;
}

/** Review has one stored line per position, and no read of a pass: so the
 *  follow-up is read along the engine's own line after the move, and a stopped
 *  threat is never claimed. */
const REVIEW_INTENT: IntentOptions = { prepare: 'line', prevent: 'concrete' };

const lineOf = (c: CachedEval | undefined): AnalysisLine[] => {
  const moves = c?.pv?.length ? c.pv : c?.bestMove ? [c.bestMove] : [];
  return c && moves.length ? [{ rank: 1, evaluation: c.evaluation, moves, mate: null }] : [];
};

export interface ReviewIntent { text: string; squares: string[] }

/** Pure: the intent per student ply, from stored lines keyed by FEN index. */

export function intentsFromReads(
  moves: readonly IntentMoveInput[],
  student: 'white' | 'black',
  reads: ReadonlyMap<number, CachedEval>,
): Map<number, ReviewIntent> {
  const out = new Map<number, ReviewIntent>();
  const start = new Chess().fen();
  const studentWB = student === 'white' ? 'w' : 'b';
  moves.forEach((m, i) => {
    const fenBefore = i > 0 ? moves[i - 1].fenAfter : start;
    if (fenBefore.split(' ')[1] !== studentWB) return;
    // A capture's point is the trade; a check's is the check.
    if (/[x+#]/.test(m.san)) return;
    const before = lineOf(reads.get(i));
    const after = lineOf(reads.get(i + 1));
    if (!before.length || !after.length) return;
    const intent = moveIntent(fenBefore, m.san, { before, after, passBefore: [], passAfter: [] }, 'student', REVIEW_INTENT);
    if (intent) out.set(m.ply, { text: intent.text, squares: intent.squares });
  });
  return out;
}

/** The intents for a game, from the review read-ahead's stored lines. */
export async function moveIntentsForGame(
  moves: readonly IntentMoveInput[],
  student: 'white' | 'black' | undefined,
): Promise<Map<number, ReviewIntent>> {
  if (!student || moves.length === 0) return new Map();
  const fens = [new Chess().fen(), ...moves.map((m) => m.fenAfter)];
  const reads = await lookupPositionEvals(fens, 1);
  return intentsFromReads(moves, student, reads);
}
