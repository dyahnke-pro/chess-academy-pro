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
import { intentWithFallback, nullMoveFen } from './movePurpose';
import { preventsNamedIdea, STOPPED_THEIR_IDEA } from './moveIntent';
import { storedMate } from './engineConstants';

interface IntentMoveInput {
  ply: number;
  san: string;
  fenAfter: string;
}

/** A stored read as an engine line. A mate rides inside the stored number
 *  (`mateEvalFor`); it is decoded back to the line's `mate`, so a pass read
 *  that is mate in one reads as a mate threat, not as a large evaluation. */
export const lineOf = (c: CachedEval | undefined): AnalysisLine[] => {
  const moves = c?.pv?.length ? c.pv : c?.bestMove ? [c.bestMove] : [];
  if (!c || !moves.length) return [];
  return [{ rank: 1, evaluation: c.evaluation, moves, mate: storedMate(c.evaluation) }];
};

export interface ReviewIntent { text: string; squares: string[] }

/** The pass positions the review's read-ahead adds for the student's moves
 *  (`startReviewReads` extras): the board before each student move with the
 *  student passing (what the move STOPS), and the board after it with the
 *  opponent passing (what the move THREATENS next). `gameFens[0]` is the start. */
export function reviewPassFens(gameFens: readonly string[], student: 'white' | 'black' | null | undefined): string[] {
  if (!student) return [];
  const wb = student === 'white' ? 'w' : 'b';
  const out: string[] = [];
  for (let i = 0; i + 1 < gameFens.length; i++) {
    if (gameFens[i].split(' ')[1] !== wb) continue;
    for (const f of [nullMoveFen(gameFens[i]), nullMoveFen(gameFens[i + 1])]) if (f) out.push(f);
  }
  return out;
}

/** Pure: the intent per student ply, from stored lines keyed by FEN index,
 *  and the stored pass reads keyed by FEN (absent → no "stops"). */
export function intentsFromReads(
  moves: readonly IntentMoveInput[],
  student: 'white' | 'black',
  reads: ReadonlyMap<number, CachedEval>,
  passReads: ReadonlyMap<string, CachedEval> = new Map(),
): Map<number, ReviewIntent> {
  const out = new Map<number, ReviewIntent>();
  const start = new Chess().fen();
  const studentWB = student === 'white' ? 'w' : 'b';
  // THEIR PREPARED MOVE (unified with Learn, 2026-10-17): what each of their
  // quiet moves prepared, so the student's next move that takes it away is
  // credited as the prevention it is — the same rule Learn speaks.
  let theirPrep: { uci: string; fen: string } | null = null;
  moves.forEach((m, i) => {
    const fenBefore = i > 0 ? moves[i - 1].fenAfter : start;
    if (fenBefore.split(' ')[1] !== studentWB) {
      theirPrep = null;
      if (/[x+#]/.test(m.san)) return;
      const b = lineOf(reads.get(i)); const a = lineOf(reads.get(i + 1));
      if (!b.length || !a.length) return;
      const pb = nullMoveFen(fenBefore);
      const theirs = intentWithFallback(fenBefore, m.san, { before: b, after: a, passBefore: pb ? lineOf(passReads.get(pb)) : [], passAfter: [] }, 'opponent', false, true);
      if (theirs?.prepares) theirPrep = { uci: theirs.prepares.uci, fen: m.fenAfter };
      return;
    }
    // A capture's point is the trade; a check's is the check.
    if (/[x+#]/.test(m.san)) return;
    const before = lineOf(reads.get(i));
    const after = lineOf(reads.get(i + 1));
    if (!before.length || !after.length) return;
    // The pass reads (`reviewPassFens`) say what the move stops and what it
    // threatens next; without them only the engine's own line speaks.
    const passOf = (fen: string): AnalysisLine[] => { const p = nullMoveFen(fen); return p ? lineOf(passReads.get(p)) : []; };
    const intent = intentWithFallback(fenBefore, m.san, { before, after, passBefore: passOf(fenBefore), passAfter: passOf(m.fenAfter) }, 'student', false, true);
    if (!intent) return;
    const stopped = !!intent.prevents && preventsNamedIdea(theirPrep, fenBefore, intent.prevents.uci);
    out.set(m.ply, { text: stopped ? `${intent.text} ${STOPPED_THEIR_IDEA}` : intent.text, squares: intent.squares });
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
  const pass = reviewPassFens(fens, student);
  const passHits = await lookupPositionEvals(pass, 1);
  const passReads = new Map<string, CachedEval>();
  passHits.forEach((v, i) => passReads.set(pass[i], v));
  return intentsFromReads(moves, student, reads, passReads);
}
